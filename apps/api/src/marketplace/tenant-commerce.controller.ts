import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { CommerceService } from './commerce.service';
import { MallService } from './mall.service';
import { MarketplacePaymentsService } from './marketplace-payments.service';
import { CommerceAddonId } from './commerce-addons';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantCommerceController {
  constructor(
    private readonly commerce: CommerceService,
    private readonly mall: MallService,
    private readonly payments: MarketplacePaymentsService,
  ) {}

  @Get('tenant/commerce/settings')
  @RequirePermissions('org.company.view')
  getSettings(@CurrentTenant() ctx: TenantContext) {
    return this.commerce.getSettings(ctx);
  }

  @Patch('tenant/commerce/settings')
  @RequirePermissions('org.company.update')
  patchSettings(
    @Body()
    body: Partial<{
      storefront_enabled: boolean;
      mall_enabled: boolean;
      restock_hub_enabled: boolean;
      delivery_mode: string;
      payment_mode: string;
    }>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.commerce.patchSettings(ctx, body);
  }

  @Get('tenant/mall/listings')
  @RequirePermissions('inventory.item.view')
  listings(@CurrentTenant() ctx: TenantContext) {
    return this.mall.listMyListings(ctx);
  }

  @Post('tenant/mall/listings')
  @RequirePermissions('inventory.item.create')
  upsertListing(
    @Body() body: { item_id: string; active?: boolean },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.mall.upsertListing(ctx, body);
  }

  @Get('tenant/marketplace/orders')
  @RequirePermissions('sales.order.view')
  marketplaceOrders(@CurrentTenant() ctx: TenantContext) {
    return this.mall.tenantMarketplaceOrders(ctx);
  }

  @Get('tenant/delivery-jobs')
  @RequirePermissions('sales.order.view')
  deliveryJobs(@CurrentTenant() ctx: TenantContext) {
    return this.mall.tenantDeliveryJobs(ctx);
  }

  @Get('tenant/commerce/addons')
  @RequirePermissions('org.company.view')
  addons() {
    return this.payments.addonCatalog();
  }

  @Post('tenant/commerce/addons/pay')
  @RequirePermissions('org.company.update')
  payAddon(
    @Body() body: { addon: CommerceAddonId },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.payments.createAddonOrder(ctx, body.addon);
  }

  @Post('tenant/commerce/addons/confirm')
  @RequirePermissions('org.company.update')
  confirmAddon(
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.payments.confirmAddonPayment(ctx, body);
  }
}
