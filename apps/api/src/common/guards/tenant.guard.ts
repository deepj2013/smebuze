import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContext } from '../tenant-context';

export const PERMISSIONS_KEY = 'permissions';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as TenantContext;
    if (!user) throw new ForbiddenException('Not authenticated');

    if (user.isSuperAdmin) return true;

    const hasAll = requiredPermissions.every((p) =>
      user.permissions?.includes(p),
    );
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }
    return true;
  }
}
