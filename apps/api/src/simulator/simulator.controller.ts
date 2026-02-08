import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../tenants/guards/tenant-membership.guard';
import { TenantId } from '../tenants/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SimulatorRequestSchema } from '@turion/shared';
import type { SimulatorRequestDto, SimulatorResponseDto } from '@turion/shared';

@Controller('tenants/:tenantId')
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
export class SimulatorController {
  constructor(private readonly simulatorService: SimulatorService) {}

  @Post('test')
  @HttpCode(200)
  async test(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(SimulatorRequestSchema)) dto: SimulatorRequestDto,
  ): Promise<SimulatorResponseDto> {
    return this.simulatorService.runTest(tenantId, dto);
  }
}
