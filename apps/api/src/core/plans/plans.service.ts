import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { plans, CreatePlanDto, UpdatePlanDto } from '@turion/shared';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.token';
import * as schema from '@turion/shared';

@Injectable()
export class PlansService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async list() {
    return this.db.select().from(plans as any);
  }

  async create(dto: CreatePlanDto) {
    const [plan] = await this.db.insert(plans as any).values(dto).returning();
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const [plan] = await this.db
      .update(plans as any)
      .set(dto)
      .where(eq(plans.id as any, id))
      .returning();

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }
}
