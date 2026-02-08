import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { memberships } from '@turion/shared';
import { DRIZZLE } from '../../database/drizzle.token';
import type * as schema from '@turion/shared';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.sub;
    const tenantId: string | undefined = request.params?.tenantId;

    if (!userId || !tenantId) {
      throw new ForbiddenException('Missing authentication or tenant context');
    }

    const [membership] = await this.db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('Not a member of this tenant');
    }

    // Attach membership to request for downstream use
    request.membership = membership;
    return true;
  }
}
