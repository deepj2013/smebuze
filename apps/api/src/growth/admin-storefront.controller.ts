import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { GrowthService } from './growth.service';

@Controller('admin/storefronts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdminStorefrontController {
  constructor(private readonly growth: GrowthService) {}

  @Get()
  @RequirePermissions('admin.tenant.view')
  list(@CurrentTenant() ctx: TenantContext) {
    return this.growth.adminListSites(ctx);
  }

  @Patch(':id')
  @RequirePermissions('admin.tenant.create')
  patch(
    @Param('id') id: string,
    @Body()
    body: {
      custom_domain?: string | null;
      domain_status?: string;
      domain_notes?: string | null;
      is_published?: boolean;
      slug?: string;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.adminPatchSite(ctx, id, body);
  }

  @Post(':tenantId/packs/:type')
  @RequirePermissions('admin.tenant.create')
  applyPack(
    @Param('tenantId') tenantId: string,
    @Param('type') type: string,
    @Body() body: { force?: boolean; list_existing_items?: boolean },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.growth.adminApplyPack(ctx, tenantId, type, body);
  }
}
