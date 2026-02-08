import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from '@turion/shared';
import { IsSuperAdmin } from '../../auth/decorators/is-super-admin.decorator';

@Controller('core/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async list() {
    return this.plansService.list();
  }

  @IsSuperAdmin()
  @Post()
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @IsSuperAdmin()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }
}
