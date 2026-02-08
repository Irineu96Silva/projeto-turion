import { Module } from '@nestjs/common';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { CoreTenantsController } from './tenants/core-tenants.controller';
import { CoreTenantsService } from './tenants/core-tenants.service';

@Module({
  controllers: [PlansController, CoreTenantsController],
  providers: [PlansService, CoreTenantsService],
})
export class CoreModule {}
