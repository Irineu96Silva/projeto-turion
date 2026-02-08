import { Controller, Post, UseGuards } from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../guards/tenant-membership.guard';
import { TenantId } from '../decorators/tenant-id.decorator';
import type { RotateSecretResponse } from '@turion/shared';

@Controller('tenants/:tenantId/secrets')
@UseGuards(JwtAuthGuard, TenantMembershipGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post('rotate')
  async rotate(@TenantId() tenantId: string): Promise<RotateSecretResponse> {
    const result = await this.secretsService.rotateSecret(tenantId);
    return {
      secret: result.secret,
      message: 'Store this secret securely. It will not be shown again.',
      created_at: result.createdAt.toISOString(),
    };
  }
}
