import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { stageConfigs, type ConfigJsonV1, type Stage } from '@turion/shared';
import { DRIZZLE } from '../../database/drizzle.token';
import { AuditService } from '../../audit/audit.service';
import type * as schema from '@turion/shared';

@Injectable()
export class ConfigService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly auditService: AuditService,
  ) {}

  async getActiveConfig(tenantId: string, stage: Stage) {
    const [config] = await this.db
      .select()
      .from(stageConfigs)
      .where(
        and(
          eq(stageConfigs.tenantId, tenantId),
          eq(stageConfigs.stage, stage),
          eq(stageConfigs.isActive, true),
        ),
      )
      .limit(1);

    if (!config) {
      throw new NotFoundException(`No active config for stage "${stage}"`);
    }

    return config;
  }

  async getActiveConfigOrNull(tenantId: string, stage: Stage) {
    const [config] = await this.db
      .select()
      .from(stageConfigs)
      .where(
        and(
          eq(stageConfigs.tenantId, tenantId),
          eq(stageConfigs.stage, stage),
          eq(stageConfigs.isActive, true),
        ),
      )
      .limit(1);

    return config ?? null;
  }

  async upsertConfig(
    tenantId: string,
    stage: Stage,
    configJson: ConfigJsonV1,
    actorUserId: string,
  ) {
    return await this.db.transaction(async (tx) => {
      // Get current active config
      const [current] = await tx
        .select()
        .from(stageConfigs)
        .where(
          and(
            eq(stageConfigs.tenantId, tenantId),
            eq(stageConfigs.stage, stage),
            eq(stageConfigs.isActive, true),
          ),
        )
        .orderBy(desc(stageConfigs.configVersion))
        .limit(1);

      const nextVersion = (current?.configVersion ?? 0) + 1;

      // Deactivate current
      if (current) {
        await tx
          .update(stageConfigs)
          .set({ isActive: false })
          .where(eq(stageConfigs.id, current.id));
      }

      // Insert new
      const [newConfig] = await tx
        .insert(stageConfigs)
        .values({
          tenantId,
          stage,
          configVersion: nextVersion,
          configJson,
          isActive: true,
        })
        .returning();

      // Audit log (inside transaction)
      await this.auditService.log({
        tenantId,
        actorUserId,
        action: 'config.update',
        entity: 'stage_configs',
        entityId: newConfig.id,
        diffJson: {
          previous: current?.configJson ?? null,
          next: configJson,
        },
      });

      return newConfig;
    });
  }
}
