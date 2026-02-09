import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  tenants,
  memberships,
  users,
  ProvisionTenantDto,
  UpdateTenantStatusDto,
  TenantStatus,
} from '@turion/shared';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.token';
import * as schema from '@turion/shared';

@Injectable()
export class CoreTenantsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list() {
    return this.db.select().from(tenants as any);
  }

  async provision(dto: ProvisionTenantDto) {
    // Generate slug
    const slug =
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8);

    // Hash password (if creating user) - Simplified for now, assuming user might exist or we creates
    // Ideally we check if user exists.
    // For now let's assume we create user.
    // import bcrypt
    const passwordHash = await import('bcryptjs').then((m) =>
      m.hash(dto.ownerPassword, 12),
    );

    return this.db.transaction(async (tx) => {
      // 1. Create User
      // Check if user exists
      const existingUser = await tx
         .select({ id: (users.id as any) })
         .from(users as any)
         .where(eq(users.email as any, dto.ownerEmail))
         .limit(1);
      
      let userId: string;

      if (existingUser[0]) {
        userId = existingUser[0].id;
      } else {
         const [newUser] = await tx
          .insert(users as any)
          .values({
            email: dto.ownerEmail,
            passwordHash,
          })
          .returning({ id: (users.id as any) });
         userId = newUser.id;
      }

      // 2. Create Tenant
      const [tenant] = await tx
        .insert(tenants as any)
        .values({
          name: dto.name,
          slug,
          planId: dto.planId,
          status: 'active',
        })
        .returning({ id: (tenants.id as any) });

      // 3. Add Owner
      await tx.insert(memberships as any).values({
        tenantId: tenant.id,
        userId: userId,
        role: 'owner',
      });

      return tenant;
    });
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto) {
    const [tenant] = await this.db
      .update(tenants as any)
      .set({ status: dto.status })
      .where(eq(tenants.id as any, id))
      .returning({ id: (tenants.id as any), status: (tenants.status as any) });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }
}
