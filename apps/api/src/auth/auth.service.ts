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
      .select({ id: (users.id as any) })
      .from(users as any)
      .where(eq(users.email as any, dto.email))
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
        .insert(users as any)
        .values({ email: dto.email, passwordHash })
        .returning({ id: (users.id as any) });

      const [tenant] = await tx
        .insert(tenants as any)
        .values({ name: dto.tenantName, slug })
        .returning({ id: (tenants.id as any) });

      await tx.insert(memberships as any).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      return { userId: user.id, email: dto.email };
    });

    return this.signToken(result.userId, result.email, false);
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const [user] = await this.db
      .select({
        id: (users.id as any),
        email: (users.email as any),
        passwordHash: (users.passwordHash as any),
        isSuperAdmin: (users.isSuperAdmin as any),
      })
      .from(users as any)
      .where(eq(users.email as any, dto.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signToken(user.id, user.email, user.isSuperAdmin);
  }

  async getMe(userId: string): Promise<AuthMeResponse> {
    const [user] = await this.db
      .select({ id: (users.id as any), email: (users.email as any), isSuperAdmin: (users.isSuperAdmin as any) })
      .from(users as any)
      .where(eq(users.id as any, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membershipRows = await this.db
      .select({
        tenantId: (memberships.tenantId as any),
        role: (memberships.role as any),
        tenantName: (tenants.name as any),
        tenantSlug: (tenants.slug as any),
      })
      .from(memberships as any)
      .innerJoin(tenants as any, eq(memberships.tenantId as any, tenants.id as any))
      .where(eq(memberships.userId as any, userId));

    return {
      id: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      memberships: membershipRows.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenantName,
        tenantSlug: m.tenantSlug,
        role: m.role,
      })),
    };
  }

  private signToken(userId: string, email: string, isSuperAdmin: boolean): AuthTokenResponse {
    const payload = { sub: userId, email, isSuperAdmin };
    return { access_token: this.jwtService.sign(payload) };
  }
}
