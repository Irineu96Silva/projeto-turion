import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { auditLogs } from '@turion/shared';
import { DRIZZLE } from '../database/drizzle.token';
import type * as schema from '@turion/shared';

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async log(params: {
    tenantId?: string;
    actorUserId: string;
    action: string;
    entity: string;
    entityId?: string;
    diff?: Record<string, any>;
  }) {
    const { tenantId, actorUserId, action, entity, entityId, diff } = params;

    await this.db.insert(auditLogs as any).values({
      tenantId,
      actorUserId,
      action,
      entity,
      entityId,
      diffJson: diff,
    });
  }
}
