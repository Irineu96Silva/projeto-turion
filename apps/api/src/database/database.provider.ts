import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@turion/shared';
import { DRIZZLE } from './drizzle.token';
import type { Env } from '../config/env.validation';

export const DrizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService<Env, true>) => {
    const pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
    });
    return drizzle(pool, { schema });
  },
};
