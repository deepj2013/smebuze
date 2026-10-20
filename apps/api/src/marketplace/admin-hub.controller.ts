import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { HubService } from './hub.service';

@Controller('admin/hub')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdminHubController {
  constructor(private readonly hub: HubService) {}

  @Get('catalog')
  @RequirePermissions('admin.tenant.view')
  list(@CurrentTenant() ctx: TenantContext) {
    return this.hub.adminListCatalog(ctx);
  }

  @Post('catalog')
  @RequirePermissions('admin.tenant.create')
  create(
    @Body()
    body: {
      name: string;
      brand?: string;
      category?: string;
      description?: string;
      pack_label?: string;
      barcode?: string;
      sku?: string;
      wholesale_price: number;
      mrp?: number;
      cost_price?: number;
      eta_days?: number;
      delivery_charge?: number;
      business_types: string[];
      image_url?: string;
      unit?: string;
      active?: boolean;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.adminCreateCatalog(ctx, body);
  }

  @Patch('catalog/:id')
  @RequirePermissions('admin.tenant.create')
  patch(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.adminPatchCatalog(ctx, id, body as never);
  }

  @Get('orders')
  @RequirePermissions('admin.tenant.view')
  orders(@CurrentTenant() ctx: TenantContext, @Query('status') status?: string) {
    return this.hub.adminListOrders(ctx, status);
  }

  @Patch('orders/:id')
  @RequirePermissions('admin.tenant.create')
  patchOrder(
    @Param('id') id: string,
    @Body() body: { status: string; delivery_date?: string; notes?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.adminPatchOrder(ctx, id, body);
  }
}
