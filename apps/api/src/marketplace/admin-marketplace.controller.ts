import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentTenant, TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { MallService } from './mall.service';
import { CommerceService } from './commerce.service';
import { SettlementSchedulerService } from './settlement-scheduler.service';
import { MarketplacePaymentsService } from './marketplace-payments.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AdminMarketplaceController {
  constructor(
    private readonly mall: MallService,
    private readonly commerce: CommerceService,
    private readonly settlementCron: SettlementSchedulerService,
    private readonly payments: MarketplacePaymentsService,
  ) {}

  @Get('marketplace/finance')
  @RequirePermissions('admin.tenant.view')
  finance(@CurrentTenant() ctx: TenantContext) {
    return this.mall.financeOverview(ctx);
  }

  @Get('marketplace/settlements')
  @RequirePermissions('admin.tenant.view')
  listSettlements(@CurrentTenant() ctx: TenantContext, @Query('tenant_id') tenantId?: string) {
    return this.mall.listSettlements(ctx, tenantId);
  }

  @Post('marketplace/settlements/build')
  @RequirePermissions('admin.tenant.create')
  build(@CurrentTenant() ctx: TenantContext) {
    return this.mall.buildOpenSettlements(ctx);
  }

  @Post('marketplace/settlements/run-weekly')
  @RequirePermissions('admin.tenant.create')
  runWeekly() {
    return this.settlementCron.runNow();
  }

  @Get('marketplace/payments/status')
  @RequirePermissions('admin.tenant.view')
  paymentsStatus() {
    return this.payments.addonCatalog();
  }

  @Post('marketplace/settlements/:id/pay')
  @RequirePermissions('admin.tenant.create')
  pay(
    @Param('id') id: string,
    @Body() body: { reference?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.mall.markSettlementPaid(ctx, id, body.reference);
  }

  @Post('marketplace/orders/:id/mark-paid')
  @RequirePermissions('admin.tenant.create')
  markPaid(
    @Param('id') id: string,
    @Body() body: { payment_ref?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.payments.markMallPaidById(id, body.payment_ref);
  }

  @Patch('tenants/:tenantId/commerce')
  @RequirePermissions('admin.tenant.create')
  patchTenantCommerce(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      commission_pct?: number;
      listing_fee_monthly?: number;
      mall_enabled?: boolean;
      pass_fee_to_customer?: boolean;
      settle_days?: number;
    },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.commerce.adminPatchFees(ctx, tenantId, body);
  }

  @Get('delivery-jobs')
  @RequirePermissions('admin.tenant.view')
  jobs(@CurrentTenant() ctx: TenantContext, @Query('status') status?: string) {
    return this.mall.listDeliveryJobs(ctx, status);
  }

  @Patch('delivery-jobs/:id')
  @RequirePermissions('admin.tenant.create')
  patchJob(
    @Param('id') id: string,
    @Body() body: { status?: string; rider_name?: string; rider_phone?: string; notes?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.mall.patchDeliveryJob(ctx, id, body);
  }
}
