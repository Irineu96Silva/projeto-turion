import { z } from 'zod';

export const ConfigJsonV1Schema = z.object({
  tone: z.enum(['formal', 'casual', 'empathetic']),
  cta_style: z.enum(['soft', 'direct', 'urgent']),
  template_fallback: z.string().min(1).max(500),
  guardrails: z.object({
    on: z.boolean(),
    max_tokens: z.number().int().min(1).max(4096),
    blocked_topics: z.array(z.string()),
  }),
  questions: z.array(z.string()),
});

export type ConfigJsonV1 = z.infer<typeof ConfigJsonV1Schema>;

export const UpdateConfigSchema = z.object({
  config: ConfigJsonV1Schema,
});

export type UpdateConfigDto = z.infer<typeof UpdateConfigSchema>;

export interface StageConfigResponse {
  id: string;
  stage: string;
  configVersion: number;
  configJson: ConfigJsonV1;
  isActive: boolean;
  updatedAt: string;
}
