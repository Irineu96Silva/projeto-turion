import { z } from 'zod';
import { STAGES } from '../enums/stage.enum';
import { ConfigJsonV1Schema } from '../dto/config.dto';

export const MotorV1RequestSchema = z.object({
  tenant_id: z.string().uuid(),
  stage: z.enum(STAGES),
  request_id: z.string().uuid(),
  message_original: z.string(),
  name: z.string().optional(),
  origin: z.string().optional(),
  config: ConfigJsonV1Schema,
});

export type MotorV1Request = z.infer<typeof MotorV1RequestSchema>;

export const MotorV1ResponseSchema = z.object({
  reply: z.string(),
  next_best_action: z.string(),
  confidence: z.number().min(0).max(1),
});

export type MotorV1Response = z.infer<typeof MotorV1ResponseSchema>;
