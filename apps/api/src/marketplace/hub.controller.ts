import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { HubService } from './hub.service';

@Controller('hub')
@UseGuards(JwtAuthGuard, TenantGuard)
export class HubController {
  constructor(private readonly hub: HubService) {}

  @Get('catalog')
  @RequirePermissions('inventory.item.view')
  listCatalog(
    @CurrentTenant() ctx: TenantContext,
    @Query('q') q?: string,
    @Query('category') category?: string,
  ) {
    return this.hub.listCatalog(ctx, q, category);
  }

  @Get('catalog/:id')
  @RequirePermissions('inventory.item.view')
  catalogDetail(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.hub.getCatalogDetail(ctx, id);
  }

  @Post('catalog/:id/link')
  @RequirePermissions('inventory.item.create')
  link(
    @Param('id') id: string,
    @Body() body: { item_id: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.linkItem(ctx, id, body.item_id);
  }

  @Get('orders')
  @RequirePermissions('purchase.order.view')
  listOrders(@CurrentTenant() ctx: TenantContext) {
    return this.hub.listOrders(ctx);
  }

  @Post('orders')
  @RequirePermissions('purchase.order.create')
  createOrder(
    @Body()
    body: {
      delivery_date?: string;
      notes?: string;
      warehouse_id?: string;
      lines: Array<{ hub_item_id: string; qty: number }>;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.createOrder(ctx, body);
  }

  @Post('orders/from-shortage')
  @RequirePermissions('purchase.order.create')
  fromShortage(
    @Body() body: { warehouse_id?: string; only_linked?: boolean; place?: boolean },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.orderFromShortage(ctx, body);
  }

  @Post('orders/:id/receive')
  @RequirePermissions('inventory.stock.view')
  receive(
    @Param('id') id: string,
    @Body() body: { warehouse_id: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.hub.receiveOrder(ctx, id, body.warehouse_id);
  }
}
