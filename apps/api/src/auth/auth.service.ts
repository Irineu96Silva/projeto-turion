import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  users,
  tenants,
  memberships,
  type RegisterDto,
  type LoginDto,
  type AuthTokenResponse,
  type AuthMeResponse,
} from '@turion/shared';
import { DRIZZLE } from '../database/drizzle.token';
import type * as schema from '@turion/shared';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    // Check if email already exists
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate slug from tenant name
    const slug =
      dto.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8);

    // Transaction: create user + tenant + membership
    const result = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email: dto.email, passwordHash })
        .returning({ id: users.id });

      const [tenant] = await tx
        .insert(tenants)
        .values({ name: dto.tenantName, slug })
        .returning({ id: tenants.id });

      await tx.insert(memberships).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      return { userId: user.id, email: dto.email };
    });

    return this.signToken(result.userId, result.email);
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email);
  }

  async getMe(userId: string): Promise<AuthMeResponse> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membershipRows = await this.db
      .select({
        tenantId: memberships.tenantId,
        role: memberships.role,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, userId));

    return {
      id: user.id,
      email: user.email,
      memberships: membershipRows.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        tenantSlug: m.tenantSlug,
        role: m.role,
      })),
    };
  }

  private signToken(userId: string, email: string): AuthTokenResponse {
    const payload = { sub: userId, email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
