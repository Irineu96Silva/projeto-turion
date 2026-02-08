import { Module } from '@nestjs/common';
import { ConfigController } from './config/config.controller';
import { ConfigService } from './config/config.service';
import { SecretsController } from './secrets/secrets.controller';
import { SecretsService } from './secrets/secrets.service';
import { TenantMembershipGuard } from './guards/tenant-membership.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ConfigController, SecretsController],
  providers: [ConfigService, SecretsService, TenantMembershipGuard],
  exports: [ConfigService, SecretsService, TenantMembershipGuard],
})
export class TenantsModule {}
