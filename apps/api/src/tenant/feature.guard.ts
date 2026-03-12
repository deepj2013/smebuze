import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from './tenant.service';
import { FEATURE_KEY } from '../common/decorators/require-feature';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly tenantService: TenantService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      FEATURE_KEY,
      context.getHandler(),
    ) ?? this.reflector.get<string>(FEATURE_KEY, context.getClass());
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as TenantContext;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.isSuperAdmin) return true;
    if (!user.tenantId) return true;

    const tenant = await this.tenantService.findOne(user.tenantId, user);
    if (!tenant) throw new ForbiddenException('Tenant not found');
    if (!tenant.features || tenant.features.length === 0) return true;
    if (tenant.features.includes(requiredFeature)) return true;

    throw new ForbiddenException(
      `Feature "${requiredFeature}" is not available on your plan. Please upgrade.`,
    );
  }
}
