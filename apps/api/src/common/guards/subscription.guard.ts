import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IS_PUBLIC_KEY } from '../decorators/public';
import { SKIP_SUBSCRIPTION_KEY } from '../decorators/skip-subscription';
import { TenantContext } from '../tenant-context';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { subscriptionStatus } from '../plans';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<{ originalUrl?: string; url?: string; user?: TenantContext }>();
    const path = String(req.originalUrl || req.url || '');
    if (
      path.includes('/auth/') ||
      path.includes('/health') ||
      path.includes('/billing') ||
      path.includes('/pay/') ||
      path.includes('/webhook') ||
      path.includes('website-leads')
    ) {
      return true;
    }

    const user = req.user;
    if (!user?.tenantId || user.isSuperAdmin) return true;

    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
      select: ['id', 'subscription_ends_at', 'is_active'],
    });
    if (!tenant?.is_active) {
      throw new HttpException(
        { statusCode: 403, code: 'TENANT_INACTIVE', message: 'This workspace is paused. Contact support.' },
        HttpStatus.FORBIDDEN,
      );
    }
    const status = subscriptionStatus(tenant.subscription_ends_at);
    if (!status.expired) return true;
    throw new HttpException(
      {
        statusCode: 402,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Your 7-day trial or subscription has ended. Pay to continue using SMEBUZE.',
        ends_at: status.ends_at,
        pay_path: '/billing',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
