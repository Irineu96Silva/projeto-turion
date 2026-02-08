import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { AuditModule } from './audit/audit.module';
import { CoreModule } from './core/core.module';
import { SimulatorModule } from './simulator/simulator.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    AuthModule,
    TenantsModule,
    AuditModule,
    CoreModule,
    SimulatorModule,
    UsageModule,
  ],
})
export class AppModule {}
