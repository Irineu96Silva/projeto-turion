import { z } from 'zod';
import { STAGES } from '../enums/stage.enum';

export const SimulatorRequestSchema = z.object({
  stage: z.enum(STAGES),
  message_original: z.string().min(1).max(2000),
  name: z.string().optional(),
  origin: z.string().optional(),
});

export type SimulatorRequestDto = z.infer<typeof SimulatorRequestSchema>;

export const SimulatorResponseSchema = z.object({
  reply: z.string(),
  next_best_action: z.string(),
  confidence: z.number().min(0).max(1),
});

export type SimulatorResponseDto = z.infer<typeof SimulatorResponseSchema>;
