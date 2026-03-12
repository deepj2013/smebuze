import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/tenant-context';
import { TenantContext } from '../common/tenant-context';
import { RequirePermissions } from '../common/decorators/require-permissions';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.view')
  async dashboard(@CurrentTenant() ctx: TenantContext) {
    return this.reportsService.getDashboard(ctx);
  }

  @Get('sales-summary')
  @RequirePermissions('reports.view')
  async salesSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getSalesSummary(ctx, from, to, companyId);
    if (format === 'csv' && res) {
      const csv = ['Invoice ID,Number,Date,Total,Paid,Due', ...data.rows.map((r) => `${r.id},${r.number},${r.date},${r.total},${r.paid},${r.due}`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-summary.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('purchase-summary')
  @RequirePermissions('reports.view')
  async purchaseSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
  ) {
    return this.reportsService.getPurchaseSummary(ctx, from, to, companyId);
  }

  @Get('gst-summary')
  @RequirePermissions('reports.view')
  async gstSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getGstSummary(ctx, from, to, companyId);
    if (format === 'csv' && res) {
      const csv = ['HSN/Tariff,Taxable Value,CGST,SGST,IGST,Line Count', ...data.rows.map((r) => `${r.hsn_sac},${r.taxable_value},${r.cgst},${r.sgst},${r.igst},${r.count}`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=gst-summary.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('item-wise-sales')
  @RequirePermissions('reports.view')
  async itemWiseSales(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getItemWiseSalesReport(ctx, from, to, companyId);
    if (format === 'csv' && res) {
      const csv = ['Item ID,Description,Quantity,Taxable Value,Line Count', ...data.rows.map((r) => `${r.item_id ?? ''},${r.description},${r.quantity},${r.taxable_value},${r.count}`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=item-wise-sales.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('health-score')
  @RequirePermissions('reports.view')
  async healthScore(@CurrentTenant() ctx: TenantContext) {
    return this.reportsService.getBusinessHealthScore(ctx);
  }

  @Get('ledger-summary')
  @RequirePermissions('reports.view')
  async ledgerSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
  ) {
    return this.reportsService.getLedgerSummary(ctx, from, to, companyId);
  }

  @Get('general-ledger')
  @RequirePermissions('reports.view')
  async generalLedger(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
  ) {
    return this.reportsService.getGeneralLedger(ctx, from, to, companyId);
  }

  @Get('trial-balance')
  @RequirePermissions('reports.view')
  async trialBalance(
    @CurrentTenant() ctx: TenantContext,
    @Query('as_of') asOf?: string,
    @Query('company_id') companyId?: string,
  ) {
    return this.reportsService.getTrialBalance(ctx, asOf, companyId);
  }

  @Get('pl')
  @RequirePermissions('reports.view')
  async profitAndLoss(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('company_id') companyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getProfitAndLoss(ctx, from, to, companyId);
    if (format === 'csv' && res) {
      const csv = ['Metric,Amount', `Total Income,${(data as { total_income: number }).total_income}`, `Total Expense,${(data as { total_expense: number }).total_expense}`, `Net Profit,${(data as { net_profit: number }).net_profit}`].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=pl.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('balance-sheet')
  @RequirePermissions('reports.view')
  async balanceSheet(
    @CurrentTenant() ctx: TenantContext,
    @Query('as_of') asOf?: string,
    @Query('company_id') companyId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getBalanceSheet(ctx, asOf, companyId);
    if (format === 'csv' && res) {
      const d = data as { assets: number; liabilities: number; equity: number };
      const csv = ['Metric,Amount', `Assets,${d.assets}`, `Liabilities,${d.liabilities}`, `Equity,${d.equity}`].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=balance-sheet.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('export')
  @RequirePermissions('reports.view')
  async dataExport(@CurrentTenant() ctx: TenantContext) {
    return this.reportsService.getDataExport(ctx);
  }

  @Get('vendor-ledger')
  @RequirePermissions('reports.view')
  async vendorLedger(@CurrentTenant() ctx: TenantContext, @Query('vendor_id') vendorId?: string) {
    return this.reportsService.getVendorLedger(ctx, vendorId);
  }

  @Get('tds-summary')
  @RequirePermissions('reports.view')
  async tdsSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getTdsSummary(ctx, from, to);
  }

  @Get('requirement-vs-delivery')
  @RequirePermissions('reports.view')
  async requirementVsDelivery(
    @CurrentTenant() ctx: TenantContext,
    @Query('customer_id') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getRequirementVsDeliveryReport(ctx, customerId, from, to);
    if (format === 'csv' && res && data.rows?.length) {
      const csv = [
        'Order ID,Order Number,Order Date,Customer,Item,Required Qty,Delivered Qty,Pending Qty',
        ...data.rows.map((r) =>
          `${r.order_id},${r.order_number},${r.order_date},${r.customer_name},${r.item_name},${r.required_qty},${r.delivered_qty},${r.pending_qty}`,
        ),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=requirement-vs-delivery.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('stock-vs-delivery')
  @RequirePermissions('reports.view')
  async stockVsDelivery(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getStockVsDeliveryReport(ctx, from, to);
    if (format === 'csv' && res && data.rows?.length) {
      const csv = [
        'Item ID,Item Name,Stock on Hand,Delivered in Period',
        ...data.rows.map((r) => `${r.item_id},${r.item_name},${r.stock_on_hand},${r.delivered_in_period}`),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock-vs-delivery.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('delivery-vs-invoiced')
  @RequirePermissions('reports.view')
  async deliveryVsInvoiced(
    @CurrentTenant() ctx: TenantContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('customer_id') customerId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getDeliveryVsInvoicedReport(ctx, from, to, customerId);
    if (format === 'csv' && res && data.rows?.length) {
      const csv = [
        'Challan ID,Number,Date,Customer,Status,Invoiced,Invoice Number',
        ...data.rows.map((r) =>
          `${r.id},${r.number},${r.challan_date},${r.customer_name},${r.status},${r.invoiced},${r.invoice_number ?? ''}`,
        ),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=delivery-vs-invoiced.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('invoice-vs-payment')
  @RequirePermissions('reports.view')
  async invoiceVsPayment(
    @CurrentTenant() ctx: TenantContext,
    @Query('customer_id') customerId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getInvoiceVsPaymentReport(ctx, customerId);
    if (format === 'csv' && res && data.rows?.length) {
      const csv = [
        'Customer ID,Customer Name,Total Invoiced,Total Received,Total Pending,Invoice Count',
        ...data.rows.map((r) =>
          `${r.customer_id},${r.customer_name},${r.total_invoiced},${r.total_received},${r.total_pending},${r.invoice_count}`,
        ),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=invoice-vs-payment.csv');
      res.send(csv);
      return;
    }
    return data;
  }

  @Get('ageing')
  @RequirePermissions('reports.view')
  async ageing(
    @CurrentTenant() ctx: TenantContext,
    @Query('type') type?: 'receivables' | 'payables',
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getAgeingReport(ctx, type ?? 'receivables') as { type: string; rows?: { number: string; buyer?: string; vendor?: string; due: number; due_date?: string | null; daysOverdue: number; bucket: string }[] };
    if (format === 'csv' && res && data?.rows?.length) {
      const t = type ?? 'receivables';
      if (t === 'receivables') {
        const csv = ['Number,Buyer,Due,Due Date,Days Overdue,Bucket', ...data.rows.map((r) => `${r.number},${r.buyer ?? ''},${r.due},${r.due_date ?? ''},${r.daysOverdue},${r.bucket}`)].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ageing-receivables.csv');
        res.send(csv);
        return;
      }
      const csv = ['Number,Vendor,Due,Due Date,Days Overdue,Bucket', ...data.rows.map((r) => `${r.number},${r.vendor ?? ''},${r.due},${r.due_date ?? ''},${r.daysOverdue},${r.bucket}`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ageing-payables.csv');
      res.send(csv);
      return;
    }
    return data;
  }
}
