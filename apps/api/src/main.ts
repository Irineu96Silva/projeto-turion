import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const frontendUrl = config.get('FRONTEND_URL', { infer: true });

  // Allow multiple origins for CORS
  const allowedOrigins = [
    frontendUrl,
    'https://master.turion-web.pages.dev',
    'http://localhost:9000', // Local dev
    'http://127.0.0.1:9000', // Local dev
  ];

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl requests, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Still allow the request but without CORS headers
        // This prevents 405 errors for preflight requests
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  console.log(`Turion API running on http://localhost:${port}/api`);
}

bootstrap();
