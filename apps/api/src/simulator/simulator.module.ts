import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { MotorClientService } from './motor-client.service';
import { TenantsModule } from '../tenants/tenants.module';

import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [HttpModule, TenantsModule, UsageModule],
  controllers: [SimulatorController],
  providers: [SimulatorService, MotorClientService],
})
export class SimulatorModule {}
