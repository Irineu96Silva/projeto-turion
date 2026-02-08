import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { MotorV1ResponseSchema, type MotorV1Request, type MotorV1Response } from '@turion/shared';
import type { Env } from '../config/env.validation';

export class MotorCallError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'MotorCallError';
  }
}

@Injectable()
export class MotorClientService {
  private readonly motorUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly httpService: HttpService,
    config: ConfigService<Env, true>,
  ) {
    this.motorUrl = config.get('MOTOR_URL', { infer: true });
    this.timeoutMs = config.get('MOTOR_TIMEOUT_MS', { infer: true });
  }

  async callMotor(
    payload: MotorV1Request,
    signature: string,
  ): Promise<MotorV1Response> {
    const headers = {
      'Content-Type': 'application/json',
      'x-signature': signature,
      'x-signature-version': 'v1',
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(this.motorUrl, payload, { headers, timeout: this.timeoutMs })
          .pipe(
            timeout(this.timeoutMs + 1000), // rxjs timeout slightly longer
            catchError((err) => {
              if (err.code === 'ECONNABORTED' || err.name === 'TimeoutError') {
                throw new MotorCallError('TIMEOUT', `Motor timed out after ${this.timeoutMs}ms`);
              }
              throw new MotorCallError(
                'HTTP_ERROR',
                `Motor returned error: ${err.message}`,
              );
            }),
          ),
      );

      // Validate response schema
      const parsed = MotorV1ResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new MotorCallError(
          'INVALID_RESPONSE',
          `Motor response validation failed: ${parsed.error.message}`,
        );
      }

      return parsed.data;
    } catch (err) {
      if (err instanceof MotorCallError) {
        throw err;
      }
      throw new MotorCallError('UNKNOWN', `Unexpected error calling motor: ${(err as Error).message}`);
    }
  }
}
