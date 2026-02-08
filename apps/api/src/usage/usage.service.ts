import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { tenantUsage, tenants, plans } from '@turion/shared';
import { DRIZZLE } from '../database/drizzle.token';
import type * as schema from '@turion/shared';

@Injectable()
export class UsageService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private getCurrentMonth(): string {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }

  async incrementUsage(tenantId: string): Promise<void> {
    const month = this.getCurrentMonth();

    await this.db
      .insert(tenantUsage as any)
      .values({
        tenantId,
        month,
        requestCount: 1,
      })
      .onConflictDoUpdate({
        target: [(tenantUsage.tenantId as any), (tenantUsage.month as any)],
        set: {
          requestCount: sql`${tenantUsage.requestCount} + 1`,
        },
      });
  }

  async checkLimit(tenantId: string): Promise<{
    allowed: boolean;
    usage: number;
    limit: number;
    planName: string;
  }> {
    const month = this.getCurrentMonth();

    // Fetch plan limits and current usage
    // We join tenants -> plans
    // And left join tenantUsage
    const [result] = await this.db
      .select({
        planName: (plans.name as any),
        maxRequests: (plans.maxRequestsMonth as any),
        usageCount: (tenantUsage.requestCount as any),
      })
      .from(tenants as any)
      .innerJoin(plans as any, eq(tenants.planId as any, plans.id as any))
      .leftJoin(
        tenantUsage as any,
        and(
          eq(tenantUsage.tenantId as any, tenants.id as any),
          eq(tenantUsage.month as any, month),
        ),
      )
      .where(eq(tenants.id as any, tenantId))
      .limit(1);

    if (!result) {
      // Should not happen for valid tenant
      return { allowed: false, usage: 0, limit: 0, planName: 'Unknown' };
    }

    const usage = result.usageCount ?? 0;
    const limit = result.maxRequests;
    const allowed = usage < limit;

    return { allowed, usage, limit, planName: result.planName };
  }
}
