import { z } from 'zod';
import { TENANT_STATUSES } from '../enums/tenant-status.enum';

export const CreatePlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  max_tenants: z.number().int().positive().nullable().optional(),
  max_requests_month: z.number().int().nonnegative().default(500),
  features: z.record(z.any()).nullable().optional(),
});
export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;

export const UpdatePlanSchema = CreatePlanSchema.partial();
export type UpdatePlanDto = z.infer<typeof UpdatePlanSchema>;

export const ProvisionTenantSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(6),
  planId: z.string().uuid(),
});
export type ProvisionTenantDto = z.infer<typeof ProvisionTenantSchema>;

export const UpdateTenantStatusSchema = z.object({
  status: z.enum(TENANT_STATUSES),
});
export type UpdateTenantStatusDto = z.infer<typeof UpdateTenantStatusSchema>;

export interface PlanResponse {
  id: string;
  name: string;
  slug: string;
  maxTenants: number | null;
  maxRequestsMonth: number;
  features: Record<string, any> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoreTenantResponse {
  id: string;
  name: string;
  slug: string;
  planId: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  activatedAt: Date | null;
  suspendedAt: Date | null;
  createdAt: Date;
}

export type ProvisionTenantResponse = CoreTenantResponse;
