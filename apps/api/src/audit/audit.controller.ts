import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('platform')
  @RequirePermissions('admin.tenant.view')
  async platform(
    @CurrentTenant() ctx: TenantContext,
    @Query('tenant_id') tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Only the platform admin can read every workspace log.');
    return this.auditService.findPlatform({
      tenantId: tenantId || undefined,
      limit: limit ? parseInt(limit, 10) : 200,
    });
  }

  @Get()
  @RequirePermissions('org.user.view')
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('resource') resource?: string,
    @Query('limit') limit?: string,
  ) {
    if (!ctx.tenantId) return [];
    const logs = await this.auditService.findForTenant(ctx.tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      resource,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    return logs;
  }
}
