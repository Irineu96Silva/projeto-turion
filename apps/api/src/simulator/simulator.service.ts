import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  executionLogs,
  createHmacV1Signature,
  redactMessage,
  type SimulatorRequestDto,
  type SimulatorResponseDto,
  type MotorV1Request,
  type Stage,
} from '@turion/shared';
import { DRIZZLE } from '../database/drizzle.token';
import { ConfigService } from '../tenants/config/config.service';
import { SecretsService } from '../tenants/secrets/secrets.service';
import { MotorClientService, MotorCallError } from './motor-client.service';
import type * as schema from '@turion/shared';

import { UsageService } from '../usage/usage.service';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
    private readonly motorClient: MotorClientService,
    private readonly usageService: UsageService,
  ) {}

  async runTest(
    tenantId: string,
    dto: SimulatorRequestDto,
  ): Promise<SimulatorResponseDto> {
    const startTime = Date.now();
    const requestId = randomUUID();
    const stage = dto.stage as Stage;

    let fallback = false;
    let errorCode: string | undefined;
    let response: SimulatorResponseDto;

    try {
      // 1. Get active config
      const config = await this.configService.getActiveConfig(tenantId, stage);

      // 2. Get decrypted secret
      const secret = await this.secretsService.getDecryptedSecret(tenantId);

      // 3. Generate HMAC v1 signature
      const signature = createHmacV1Signature(
        tenantId,
        stage,
        requestId,
        dto.message_original,
        config.configJson,
        secret,
      );

      // 4. Build motor request
      const motorPayload: MotorV1Request = {
        tenant_id: tenantId,
        stage,
        request_id: requestId,
        message_original: dto.message_original,
        name: dto.name,
        origin: dto.origin,
        config: config.configJson,
      };

      // 5. Call Motor V1
      const motorResponse = await this.motorClient.callMotor(motorPayload, signature);

      response = {
        reply: motorResponse.reply,
        next_best_action: motorResponse.next_best_action,
        confidence: motorResponse.confidence,
      };
    } catch (err) {
      // Fallback: always return 200 with fallback response
      fallback = true;
      errorCode = err instanceof MotorCallError ? err.errorCode : 'INTERNAL';

      this.logger.warn(
        `Simulator fallback for tenant=${tenantId} stage=${stage}: ${(err as Error).message}`,
      );

      // Try to get fallback template from config
      let fallbackReply = 'Desculpe, não consegui processar sua mensagem. Tente novamente.';
      try {
        const config = await this.configService.getActiveConfigOrNull(tenantId, stage);
        if (config?.configJson?.template_fallback) {
          fallbackReply = config.configJson.template_fallback.replace(
            /\{name\}/g,
            dto.name ?? '',
          );
        }
      } catch {
        // If even config lookup fails, use default
      }

      response = {
        reply: fallbackReply,
        next_best_action: 'retry',
        confidence: 0.1,
      };
    }

    // 6. Log execution (fire-and-forget)
    const latencyMs = Date.now() - startTime;
    this.logExecution({
      tenantId,
      requestId,
      stage,
      latencyMs,
      confidence: response.confidence,
      fallback,
      errorCode,
      messageOriginal: dto.message_original,
      responseJson: response,
    }).catch((logErr) => {
      this.logger.error(`Failed to log execution: ${logErr.message}`);
    });

    // 7. Increment usage (fire-and-forget)
    if (!fallback) {
       this.usageService.incrementUsage(tenantId).catch((err) => {
         this.logger.error(`Failed to increment usage for tenant ${tenantId}: ${err.message}`);
       });
    }

    return response;
  }

  async logExecution(params: {
    tenantId: string;
    requestId: string;
    stage: string;
    latencyMs: number;
    confidence: number;
    fallback: boolean;
    errorCode?: string;
    messageOriginal: string;
    responseJson: SimulatorResponseDto;
  }): Promise<void> {
    await this.db.insert(executionLogs as any).values({
      tenantId: params.tenantId,
      requestId: params.requestId,
      stage: params.stage as Stage,
      latencyMs: params.latencyMs,
      confidence: String(params.confidence),
      fallback: params.fallback,
      errorCode: params.errorCode,
      messageRedacted: redactMessage(params.messageOriginal),
      responseJson: params.responseJson,
    });
  }
}
