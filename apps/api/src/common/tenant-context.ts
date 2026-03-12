import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TENANT_CONTEXT_KEY = 'user';

export interface TenantContext {
  tenantId: string | null;
  userId: string;
  email: string;
  name?: string | null;
  isSuperAdmin: boolean;
  roleIds: string[];
  permissions: string[];
  companyId?: string;
  branchId?: string;
  /** When set, menu is filtered to these modules (e.g. crm, sales). If not set, use permissions. */
  allowed_modules?: string[];
}

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | string | string[] | boolean | undefined | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as TenantContext;
    if (!user) return undefined;
    if (data) return user[data] as string | string[] | boolean | undefined;
    return user;
  },
);
