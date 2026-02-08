import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CoreTenantsService } from './core-tenants.service';
import { ProvisionTenantDto, UpdateTenantStatusDto } from '@turion/shared';
import { IsSuperAdmin } from '../../auth/decorators/is-super-admin.decorator';

@Controller('core/tenants')
@IsSuperAdmin()
export class CoreTenantsController {
  constructor(private readonly service: CoreTenantsService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Post('provision')
  async provision(@Body() dto: ProvisionTenantDto) {
    return this.service.provision(dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }
}
