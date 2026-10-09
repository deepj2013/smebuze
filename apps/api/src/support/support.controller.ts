import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { SupportService } from './support.service';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('support/tickets')
  listMine(@CurrentTenant() ctx: TenantContext) {
    return this.support.listMine(ctx);
  }

  @Post('support/tickets')
  create(
    @CurrentTenant() ctx: TenantContext,
    @Body() body: { subject: string; description?: string; category?: string; priority?: string },
  ) {
    return this.support.createForTenant(ctx, body);
  }

  @Get('admin/support-tickets')
  @RequirePermissions('admin.tenant.view')
  listAll(@CurrentTenant() ctx: TenantContext, @Query('status') status?: string) {
    return this.support.listAll(ctx, status);
  }

  @Patch('admin/support-tickets/:id')
  @RequirePermissions('admin.tenant.create')
  update(
    @CurrentTenant() ctx: TenantContext,
    @Param('id') id: string,
    @Body() body: { status?: string; admin_notes?: string; priority?: string },
  ) {
    return this.support.updateAdmin(ctx, id, body);
  }
}
