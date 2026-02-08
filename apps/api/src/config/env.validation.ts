import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  MASTER_KEY: z.string().length(64, 'MASTER_KEY must be 64 hex chars (32 bytes)'),
  MOTOR_URL: z.string().url(),
  MOTOR_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),
  PORT: z.coerce.number().int().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:9000'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors;
    const message = Object.entries(formatted)
      .map(([key, errors]) => `  ${key}: ${(errors ?? []).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${message}`);
  }
  return result.data;
}
