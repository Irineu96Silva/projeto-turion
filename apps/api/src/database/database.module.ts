import { Global, Module } from '@nestjs/common';
import { DrizzleProvider } from './database.provider';
import { DRIZZLE } from './drizzle.token';

@Global()
@Module({
  providers: [DrizzleProvider],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
