import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { FloorService } from './floor.service';

@Controller('admin/tickets')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdminTicketsController {
  constructor(private readonly floor: FloorService) {}

  @Get()
  @RequirePermissions('admin.tenant.view')
  list(
    @Query('status') status: string | undefined,
    @Query('tenant') tenant: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.floor.adminList(ctx, { status, tenant });
  }
}
