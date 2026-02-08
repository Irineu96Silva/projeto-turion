import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../tenants/guards/tenant-membership.guard';
import { TenantId } from '../tenants/decorators/tenant-id.decorator';

@Controller('tenants/:tenantId/usage')
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getUsage(@TenantId() tenantId: string) {
    const { usage, limit, planName, allowed } = await this.usageService.checkLimit(tenantId);
    return {
      usage,
      limit,
      planName,
      remaining: Math.max(0, limit - usage),
      allowed,
    };
  }
}
