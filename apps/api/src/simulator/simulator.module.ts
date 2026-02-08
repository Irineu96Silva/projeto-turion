import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { MotorClientService } from './motor-client.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [HttpModule, TenantsModule],
  controllers: [SimulatorController],
  providers: [SimulatorService, MotorClientService],
})
export class SimulatorModule {}
