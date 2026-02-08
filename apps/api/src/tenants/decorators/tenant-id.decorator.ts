import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.params.tenantId;
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
      throw new BadRequestException('Invalid tenant ID');
    }
    return tenantId;
  },
);
