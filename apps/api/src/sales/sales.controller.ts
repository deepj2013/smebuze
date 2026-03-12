import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('invoices')
  @RequirePermissions('sales.invoice.create')
  async createInvoice(@Body() dto: CreateInvoiceDto, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createInvoice(dto, ctx);
  }

  @Get('invoices')
  @RequirePermissions('sales.invoice.view')
  async listInvoices(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findInvoices(ctx, status);
  }

  @Get('invoices/pending')
  @RequirePermissions('sales.invoice.view')
  async pendingInvoices(@CurrentTenant() ctx: TenantContext) {
    return this.salesService.getPendingInvoices(ctx);
  }

  @Post('invoices/from-challans')
  @RequirePermissions('sales.invoice.create')
  async createInvoiceFromChallans(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createInvoiceFromChallans(body as Parameters<SalesService['createInvoiceFromChallans']>[0], ctx);
  }

  @Get('invoices/:id')
  @RequirePermissions('sales.invoice.view')
  async getInvoice(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findOneInvoice(id, ctx);
  }

  @Patch('invoices/:id')
  @RequirePermissions('sales.invoice.create')
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.updateInvoice(id, dto, ctx);
  }

  @Post('invoices/:id/payment')
  @RequirePermissions('sales.invoice.create')
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.recordPayment(id, dto, ctx);
  }

  @Get('invoices/:id/print')
  @RequirePermissions('sales.invoice.view')
  async printInvoice(@Param('id') id: string, @Res() res: Response, @CurrentTenant() ctx: TenantContext) {
    const html = await this.salesService.getInvoicePrintHtml(id, ctx);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('invoices/:id/payment-link')
  @RequirePermissions('sales.invoice.view')
  async createPaymentLink(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createPaymentLink(id, ctx);
  }

  @Post('quotations')
  @RequirePermissions('sales.quotation.create')
  async createQuotation(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createQuotation(body as Parameters<SalesService['createQuotation']>[0], ctx);
  }

  @Get('quotations')
  @RequirePermissions('sales.quotation.view')
  async listQuotations(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findQuotations(ctx, status);
  }

  @Get('quotations/:id')
  @RequirePermissions('sales.quotation.view')
  async getQuotation(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findOneQuotation(id, ctx);
  }

  @Patch('quotations/:id')
  @RequirePermissions('sales.quotation.create')
  async updateQuotation(
    @Param('id') id: string,
    @Body() body: { sent_at?: string; status?: string; lead_id?: string | null; customer_id?: string | null },
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.updateQuotation(id, body, ctx);
  }

  @Post('orders')
  @RequirePermissions('sales.order.create')
  async createSalesOrder(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createSalesOrder(body as Parameters<SalesService['createSalesOrder']>[0], ctx);
  }

  @Get('orders')
  @RequirePermissions('sales.order.view')
  async listSalesOrders(
    @Query('status') status: string | undefined,
    @Query('customer_id') customer_id: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.findSalesOrders(ctx, status, customer_id);
  }

  @Get('orders/:id')
  @RequirePermissions('sales.order.view')
  async getSalesOrder(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findOneSalesOrder(id, ctx);
  }

  @Patch('orders/:id')
  @RequirePermissions('sales.order.create')
  async updateSalesOrder(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.updateSalesOrder(id, body as Parameters<SalesService['updateSalesOrder']>[1], ctx);
  }

  @Get('requirement-vs-delivery')
  @RequirePermissions('sales.order.view')
  async getRequirementVsDelivery(@Query('customer_id') customer_id: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.getRequirementVsDelivery(ctx, customer_id);
  }

  @Get('pending-requirements')
  @RequirePermissions('sales.order.view')
  async getPendingRequirements(@CurrentTenant() ctx: TenantContext) {
    return this.salesService.getPendingRequirementsByCustomer(ctx);
  }

  @Post('upload-challan-image')
  @RequirePermissions('sales.invoice.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadChallanImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentTenant() ctx: TenantContext,
    @Req() req: Request,
  ): Promise<{ url: string }> {
    if (!file?.buffer) throw new BadRequestException('No file uploaded');
    if (!ctx.tenantId) throw new BadRequestException('Tenant required');
    const dir = path.join(process.cwd(), 'uploads', 'delivery-challans');
    fs.mkdirSync(dir, { recursive: true });
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg';
    const filename = `${ctx.tenantId}-${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);
    const base = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    return { url: `${base}/uploads/delivery-challans/${filename}` };
  }

  @Post('delivery-challans')
  @RequirePermissions('sales.invoice.create')
  async createDeliveryChallan(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createDeliveryChallan(body as Parameters<SalesService['createDeliveryChallan']>[0], ctx);
  }

  @Get('delivery-challans')
  @RequirePermissions('sales.invoice.view')
  async listDeliveryChallans(
    @Query('status') status: string | undefined,
    @Query('customer_id') customer_id: string | undefined,
    @Query('from_date') from_date: string | undefined,
    @Query('to_date') to_date: string | undefined,
    @Query('not_invoiced') not_invoiced: string | undefined,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.findDeliveryChallans(
      ctx,
      status,
      customer_id,
      from_date,
      to_date,
      not_invoiced === 'true' || not_invoiced === '1',
    );
  }

  @Get('delivery-challans/:id')
  @RequirePermissions('sales.invoice.view')
  async getDeliveryChallan(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findOneDeliveryChallan(id, ctx);
  }

  @Patch('delivery-challans/:id')
  @RequirePermissions('sales.invoice.create')
  async updateDeliveryChallan(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentTenant() ctx: TenantContext,
  ) {
    return this.salesService.updateDeliveryChallan(id, body as Parameters<SalesService['updateDeliveryChallan']>[1], ctx);
  }

  @Post('credit-notes')
  @RequirePermissions('sales.invoice.create')
  async createCreditNote(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createCreditNote(body as Parameters<SalesService['createCreditNote']>[0], ctx);
  }

  @Get('credit-notes')
  @RequirePermissions('sales.invoice.view')
  async listCreditNotes(@Query('status') status: string | undefined, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findCreditNotes(ctx, status);
  }

  @Get('credit-notes/:id')
  @RequirePermissions('sales.invoice.view')
  async getCreditNote(@Param('id') id: string, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.findOneCreditNote(id, ctx);
  }

  @Get('recurring-invoices')
  @RequirePermissions('sales.invoice.view')
  async listRecurringInvoices(@CurrentTenant() ctx: TenantContext) {
    return this.salesService.findRecurringInvoices(ctx);
  }

  @Post('recurring-invoices')
  @RequirePermissions('sales.invoice.create')
  async createRecurringInvoice(@Body() body: Record<string, unknown>, @CurrentTenant() ctx: TenantContext) {
    return this.salesService.createRecurringInvoice(body as Parameters<SalesService['createRecurringInvoice']>[0], ctx);
  }

  @Post('recurring-invoices/run')
  @RequirePermissions('sales.invoice.create')
  async runRecurringInvoices(@CurrentTenant() ctx: TenantContext) {
    return this.salesService.runDueRecurringInvoices(ctx);
  }
}
