import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsageService } from './usage.service';

@Injectable()
export class UsageLimitGuard implements CanActivate {
  constructor(private readonly usageService: UsageService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.params?.tenantId ?? request.membership?.tenantId;

    if (!tenantId) {
      // If no tenant context, skip check (or block?)
      // For now skip, assuming public routes or misconfiguration
      return true;
    }

    const { allowed, usage, limit, planName } =
      await this.usageService.checkLimit(tenantId);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Monthly request limit exceeded',
          limit,
          usage,
          plan: planName,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Attach usage info to request for convenience
    request.usage = { usage, limit, planName };

    return true;
  }
}
