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
      .from(stageConfigs as any)
      .where(
        and(
          eq(stageConfigs.tenantId as any, tenantId),
          eq(stageConfigs.stage as any, stage),
          eq(stageConfigs.isActive as any, true),
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
      .from(stageConfigs as any)
      .where(
        and(
          eq(stageConfigs.tenantId as any, tenantId),
          eq(stageConfigs.stage as any, stage),
          eq(stageConfigs.isActive as any, true),
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
        .from(stageConfigs as any)
        .where(
          and(
            eq(stageConfigs.tenantId as any, tenantId),
            eq(stageConfigs.stage as any, stage),
            eq(stageConfigs.isActive as any, true),
          ),
        )
        .orderBy(desc(stageConfigs.configVersion as any))
        .limit(1);

      const nextVersion = (current?.configVersion ?? 0) + 1;

      // Deactivate current
      if (current) {
        await tx
          .update(stageConfigs as any)
          .set({ isActive: false })
          .where(eq(stageConfigs.id as any, current.id));
      }

      // Insert new
      const [newConfig] = (await tx
        .insert(stageConfigs as any)
        .values({
          tenantId,
          stage,
          configVersion: nextVersion,
          configJson,
          isActive: true,
        })
        .returning()) as any[];

      // Audit log (inside transaction)
      await this.auditService.log({
        tenantId,
        actorUserId,
        action: 'config.update',
        entity: 'stage_configs',
        entityId: newConfig.id,
        diff: {
          previous: current?.configJson ?? null,
          next: configJson,
        },
      });

      return newConfig;
    });
  }
}
