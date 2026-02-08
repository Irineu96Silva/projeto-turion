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
    tenantId: string;
    actorUserId: string;
    action: string;
    entity: string;
    entityId?: string;
    diffJson?: unknown;
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      diffJson: params.diffJson,
    });
  }
}
