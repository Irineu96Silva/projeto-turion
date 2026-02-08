import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../guards/tenant-membership.guard';
import { TenantId } from '../decorators/tenant-id.decorator';
import { CurrentUser, type JwtPayload } from '../../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UpdateConfigSchema, type Stage, STAGES } from '@turion/shared';
import type { UpdateConfigDto } from '@turion/shared';
import { BadRequestException } from '@nestjs/common';

@Controller('tenants/:tenantId/config')
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig(
    @TenantId() tenantId: string,
    @Query('stage') stage: string,
  ) {
    this.validateStage(stage);
    return this.configService.getActiveConfig(tenantId, stage as Stage);
  }

  @Put()
  updateConfig(
    @TenantId() tenantId: string,
    @Query('stage') stage: string,
    @Body(new ZodValidationPipe(UpdateConfigSchema)) dto: UpdateConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.validateStage(stage);
    return this.configService.upsertConfig(
      tenantId,
      stage as Stage,
      dto.config,
      user.sub,
    );
  }

  private validateStage(stage: string): asserts stage is Stage {
    if (!STAGES.includes(stage as Stage)) {
      throw new BadRequestException(
        `Invalid stage "${stage}". Must be one of: ${STAGES.join(', ')}`,
      );
    }
  }
}
