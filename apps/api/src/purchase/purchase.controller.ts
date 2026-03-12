import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RecordVendorPaymentDto } from './dto/record-vendor-payment.dto';

@Controller('purchase')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Post('vendors')
  @RequirePermissions('purchase.vendor.create')
  async createVendor(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.createVendor(body as Parameters<PurchaseService['createVendor']>[0], ctx);
  }

  @Get('vendors')
  @RequirePermissions('purchase.vendor.view')
  async getVendors(@CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findVendors(ctx);
  }

  @Get('vendors/:id')
  @RequirePermissions('purchase.vendor.view')
  async getVendor(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findOneVendor(id, ctx);
  }

  @Patch('vendors/:id')
  @RequirePermissions('purchase.vendor.create')
  async updateVendor(@Param('id') id: string, @Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.updateVendor(id, body as Parameters<PurchaseService['updateVendor']>[1], ctx);
  }

  @Post('orders')
  @RequirePermissions('purchase.order.create')
  async createOrder(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.createPurchaseOrder(body as Parameters<PurchaseService['createPurchaseOrder']>[0], ctx);
  }

  @Get('orders')
  @RequirePermissions('purchase.order.view')
  async getOrders(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findPurchaseOrders(ctx, status);
  }

  @Get('orders/:id')
  @RequirePermissions('purchase.order.view')
  async getOrder(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findOnePurchaseOrder(id, ctx);
  }

  @Patch('orders/:id')
  @RequirePermissions('purchase.order.create')
  async updateOrder(
    @Param('id') id: string,
    @Body() body: { sent_at?: string | null; status?: string },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.purchaseService.updatePurchaseOrder(id, body, ctx);
  }

  @Post('vendors/:id/payments')
  @RequirePermissions('purchase.order.create')
  async recordVendorPayment(
    @Param('id') vendorId: string,
    @Body() dto: RecordVendorPaymentDto,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.purchaseService.recordVendorPayment(vendorId, dto, ctx);
  }

  @Get('payables')
  @RequirePermissions('purchase.order.view')
  async getPayables(@CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.getPayables(ctx);
  }

  @Post('grns')
  @RequirePermissions('purchase.order.create')
  async createGrn(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.createGrn(body as Parameters<PurchaseService['createGrn']>[0], ctx);
  }

  @Get('grns')
  @RequirePermissions('purchase.order.view')
  async getGrns(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findGrns(ctx, status);
  }

  @Get('grns/:id')
  @RequirePermissions('purchase.order.view')
  async getGrn(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findOneGrn(id, ctx);
  }

  @Post('debit-notes')
  @RequirePermissions('purchase.order.create')
  async createDebitNote(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.createDebitNote(body as Parameters<PurchaseService['createDebitNote']>[0], ctx);
  }

  @Get('debit-notes')
  @RequirePermissions('purchase.order.view')
  async getDebitNotes(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findDebitNotes(ctx, status);
  }

  @Get('debit-notes/:id')
  @RequirePermissions('purchase.order.view')
  async getDebitNote(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.purchaseService.findOneDebitNote(id, ctx);
  }
}
