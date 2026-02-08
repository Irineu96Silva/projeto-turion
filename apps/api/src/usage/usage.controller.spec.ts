import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantMembershipGuard } from '../tenants/guards/tenant-membership.guard';
import { UsageLimitGuard } from './usage.guard';

describe('UsageController', () => {
  let controller: UsageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [
        {
          provide: UsageService,
          useValue: {
            checkLimit: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantMembershipGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UsageLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsageController>(UsageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
