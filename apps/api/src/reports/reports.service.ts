import { Injectable } from '@nestjs/common';
import { SalesService } from '../sales/sales.service';
import { PurchaseService } from '../purchase/purchase.service';
import { AccountingService } from '../accounting/accounting.service';
import { CrmService } from '../crm/crm.service';
import { InventoryService } from '../inventory/inventory.service';
import { TenantContext } from '../common/tenant-context';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { SalesInvoiceLine } from '../sales/entities/sales-invoice-line.entity';

@Injectable()
export class ReportsService {
  constructor(
    private readonly salesService: SalesService,
    private readonly purchaseService: PurchaseService,
    private readonly accountingService: AccountingService,
    private readonly crmService: CrmService,
    private readonly inventoryService: InventoryService,
  ) {}

  private filterByDateAndCompany<T>(
    items: T[],
    from?: string,
    to?: string,
    companyId?: string,
    getDate?: (i: T) => Date | undefined,
    getCompanyId?: (i: T) => string | undefined,
  ): T[] {
    let out = items;
    if (companyId && getCompanyId) out = out.filter((i) => getCompanyId(i) === companyId);
    if ((from || to) && getDate) {
      if (from) {
        const fromDate = new Date(from);
        out = out.filter((i) => { const d = getDate(i); return d && new Date(d) >= fromDate; });
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        out = out.filter((i) => { const d = getDate(i); return d && new Date(d) <= toDate; });
      }
    }
    return out;
  }

  async getSalesSummary(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const invoices = await this.salesService.findInvoices(ctx);
    const filtered = this.filterByDateAndCompany(
      invoices,
      from,
      to,
      companyId,
      (i) => i.invoice_date,
      (i) => i.company_id,
    );
    const totalInvoiced = filtered.reduce((s, i) => s + parseFloat(i.total), 0);
    const totalReceived = filtered.reduce((s, i) => s + parseFloat(i.paid_amount), 0);
    const totalPending = totalInvoiced - totalReceived;
    return {
      from: from ?? null,
      to: to ?? null,
      company_id: companyId ?? null,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalReceived: Math.round(totalReceived * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      invoiceCount: filtered.length,
      rows: filtered.slice(0, 100).map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.invoice_date,
        total: parseFloat(inv.total),
        paid: parseFloat(inv.paid_amount),
        due: parseFloat(inv.total) - parseFloat(inv.paid_amount),
      })),
    };
  }

  async getPurchaseSummary(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const orders = await this.purchaseService.findPurchaseOrders(ctx);
    const filtered = this.filterByDateAndCompany(
      orders,
      from,
      to,
      companyId,
      (o) => o.order_date,
      (o) => o.company_id,
    );
    const totalOrdered = filtered.reduce((s, o) => s + parseFloat(o.total), 0);
    const totalPaid = filtered.reduce((s, o) => s + parseFloat(o.paid_amount || '0'), 0);
    const totalPending = totalOrdered - totalPaid;
    return {
      from: from ?? null,
      to: to ?? null,
      company_id: companyId ?? null,
      totalOrdered: Math.round(totalOrdered * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      orderCount: filtered.length,
      rows: filtered.slice(0, 100).map((o) => ({
        id: o.id,
        number: o.number,
        date: o.order_date,
        total: parseFloat(o.total),
        paid: parseFloat(o.paid_amount || '0'),
        due: parseFloat(o.total) - parseFloat(o.paid_amount || '0'),
      })),
    };
  }

  async getGstSummary(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const invoices = await this.salesService.findInvoices(ctx);
    const filtered = this.filterByDateAndCompany(
      invoices,
      from,
      to,
      companyId,
      (i) => i.invoice_date,
      (i) => i.company_id,
    );
    const byHsn: Record<string, { hsn_sac: string; taxable_value: number; cgst: number; sgst: number; igst: number; count: number }> = {};
    for (const inv of filtered) {
      const lines = (inv as SalesInvoice & { lines?: SalesInvoiceLine[] }).lines ?? [];
      for (const line of lines) {
        const hsn = line.hsn_sac || 'N/A';
        if (!byHsn[hsn]) byHsn[hsn] = { hsn_sac: hsn, taxable_value: 0, cgst: 0, sgst: 0, igst: 0, count: 0 };
        byHsn[hsn].taxable_value += parseFloat(line.taxable_value || '0');
        byHsn[hsn].cgst += parseFloat(line.cgst_amount || '0');
        byHsn[hsn].sgst += parseFloat(line.sgst_amount || '0');
        byHsn[hsn].igst += parseFloat(line.igst_amount || '0');
        byHsn[hsn].count += 1;
      }
    }
    const rows = Object.values(byHsn).map((r) => ({
      ...r,
      taxable_value: Math.round(r.taxable_value * 100) / 100,
      cgst: Math.round(r.cgst * 100) / 100,
      sgst: Math.round(r.sgst * 100) / 100,
      igst: Math.round(r.igst * 100) / 100,
    }));
    return { from: from ?? null, to: to ?? null, company_id: companyId ?? null, rows };
  }

  async getItemWiseSalesReport(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const invoices = await this.salesService.findInvoices(ctx);
    const filtered = this.filterByDateAndCompany(
      invoices,
      from,
      to,
      companyId,
      (i) => i.invoice_date,
      (i) => i.company_id,
    );
    const byItem: Record<string, { item_id: string | null; description: string; quantity: number; taxable_value: number; count: number }> = {};
    for (const inv of filtered) {
      const lines = (inv as SalesInvoice & { lines?: SalesInvoiceLine[] }).lines ?? [];
      for (const line of lines) {
        const key = line.item_id ?? `desc:${line.description || 'N/A'}`;
        if (!byItem[key]) byItem[key] = { item_id: line.item_id ?? null, description: line.description || 'N/A', quantity: 0, taxable_value: 0, count: 0 };
        byItem[key].quantity += parseFloat(line.qty || '0');
        byItem[key].taxable_value += parseFloat(line.taxable_value || '0');
        byItem[key].count += 1;
      }
    }
    const rows = Object.values(byItem).map((r) => ({
      ...r,
      quantity: Math.round(r.quantity * 10000) / 10000,
      taxable_value: Math.round(r.taxable_value * 100) / 100,
    }));
    return { from: from ?? null, to: to ?? null, company_id: companyId ?? null, rows };
  }

  async getLedgerSummary(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const entries = await this.accountingService.findJournalEntries(ctx, companyId ?? undefined);
    const filtered = this.filterByDateAndCompany(
      entries,
      from,
      to,
      companyId,
      (e) => e.entry_date,
      (e) => e.company_id,
    );
    const totalDebit = filtered.reduce((s, e) => s + parseFloat(e.total_debit), 0);
    const totalCredit = filtered.reduce((s, e) => s + parseFloat(e.total_credit), 0);
    return {
      from: from ?? null,
      to: to ?? null,
      company_id: companyId ?? null,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      entryCount: filtered.length,
      rows: filtered.slice(0, 100).map((e) => ({
        id: e.id,
        number: e.number,
        date: e.entry_date,
        reference: e.reference,
        total_debit: parseFloat(e.total_debit),
        total_credit: parseFloat(e.total_credit),
      })),
    };
  }

  async getBusinessHealthScore(ctx: TenantContext): Promise<{ score: number; message: string; factors: Record<string, unknown> }> {
    const dashboard = await this.getDashboard(ctx);
    const receivables = dashboard.summary.receivables.totalPending;
    const payables = dashboard.summary.payables.totalPayable;
    const pendingCount = dashboard.summary.receivables.pendingCount;
    let score = 10;
    const factors: Record<string, unknown> = { receivables, payables, pendingCount };
    if (receivables > 100000) score -= 2;
    else if (receivables > 50000) score -= 1;
    if (payables > 100000) score -= 2;
    else if (payables > 50000) score -= 1;
    if (pendingCount > 10) score -= 1;
    score = Math.max(1, Math.min(10, score));
    const message =
      score >= 8 ? 'Business health is strong. Cash flow looks good.'
      : score >= 5 ? 'Moderate health. Consider following up on pending receivables.'
      : 'Attention needed. High payables or receivables may need action.';
    return { score, message, factors };
  }

  async getGeneralLedger(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const data = await this.getLedgerSummary(ctx, from, to, companyId);
    return { ...data, note: 'Grouped by journal entry; for GL by account use journal_entry_lines when available.' };
  }

  async getTrialBalance(ctx: TenantContext, asOf?: string, companyId?: string) {
    const entries = await this.accountingService.findJournalEntries(ctx, companyId ?? undefined);
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const filtered = entries.filter((e) => new Date(e.entry_date) <= asOfDate);
    const totalDebit = filtered.reduce((s, e) => s + parseFloat(e.total_debit), 0);
    const totalCredit = filtered.reduce((s, e) => s + parseFloat(e.total_credit), 0);
    return {
      as_of: asOf ?? new Date().toISOString().slice(0, 10),
      company_id: companyId ?? null,
      total_debit: Math.round(totalDebit * 100) / 100,
      total_credit: Math.round(totalCredit * 100) / 100,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      entry_count: filtered.length,
    };
  }

  async getProfitAndLoss(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    const lines = await this.accountingService.findJournalEntryLinesByPeriod(ctx, fromDate, toDate, companyId ?? undefined);
    const byType: Record<string, { debit: number; credit: number }> = {};
    for (const l of lines) {
      if (!byType[l.type]) byType[l.type] = { debit: 0, credit: 0 };
      byType[l.type].debit += l.debit;
      byType[l.type].credit += l.credit;
    }
    const income = (byType['income']?.credit ?? 0) - (byType['income']?.debit ?? 0);
    const expense = (byType['expense']?.debit ?? 0) - (byType['expense']?.credit ?? 0);
    const netProfit = income - expense;
    return {
      from: from ?? fromDate.toISOString().slice(0, 10),
      to: to ?? toDate.toISOString().slice(0, 10),
      company_id: companyId ?? null,
      total_income: Math.round(income * 100) / 100,
      total_expense: Math.round(expense * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      by_type: byType,
    };
  }

  async getBalanceSheet(ctx: TenantContext, asOf?: string, companyId?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const lines = await this.accountingService.findJournalEntryLinesAsOf(ctx, asOfDate, companyId ?? undefined);
    const byType: Record<string, number> = {};
    for (const l of lines) {
      const net = l.debit - l.credit;
      if (!byType[l.type]) byType[l.type] = 0;
      byType[l.type] += net;
    }
    const assets = byType['asset'] ?? 0;
    const liabilities = byType['liability'] ?? 0;
    const equity = byType['equity'] ?? 0;
    return {
      as_of: asOf ?? asOfDate.toISOString().slice(0, 10),
      company_id: companyId ?? null,
      assets: Math.round(assets * 100) / 100,
      liabilities: Math.round(liabilities * 100) / 100,
      equity: Math.round(equity * 100) / 100,
      by_type: byType,
    };
  }

  async getVendorLedger(ctx: TenantContext, vendorId?: string) {
    const vendors = vendorId
      ? [await this.purchaseService.findOneVendor(vendorId, ctx)]
      : await this.purchaseService.findVendors(ctx);
    const orders = await this.purchaseService.findPurchaseOrders(ctx);
    const payments = await this.purchaseService.findVendorPayments(ctx, vendorId);
    const result = (Array.isArray(vendors) ? vendors : [vendors]).map((v) => {
      const vendorOrders = orders.filter((o) => o.vendor_id === v.id);
      const vendorPayments = payments.filter((p) => p.vendor_id === v.id);
      const transactions: { date: string; type: string; reference: string; debit: number; credit: number; balance: number }[] = [];
      let balance = 0;
      for (const o of vendorOrders) {
        const total = parseFloat(o.total);
        balance += total;
        transactions.push({
          date: String(o.order_date),
          type: 'PO',
          reference: o.number,
          debit: total,
          credit: 0,
          balance,
        });
      }
      for (const p of vendorPayments) {
        const amount = parseFloat(p.amount);
        balance -= amount;
        transactions.push({
          date: String(p.payment_date),
          type: 'Payment',
          reference: (p as { purchaseOrder?: { number?: string } }).purchaseOrder?.number ?? p.id.slice(0, 8),
          debit: 0,
          credit: amount,
          balance,
        });
      }
      transactions.sort((a, b) => a.date.localeCompare(b.date));
      return { vendor_id: v.id, vendor_name: v.name, transactions, closing_balance: balance };
    });
    return { vendors: result };
  }

  async getTdsSummary(ctx: TenantContext, from?: string, to?: string) {
    const payments = await this.purchaseService.findVendorPayments(ctx);
    let filtered = payments;
    if (from || to) {
      filtered = payments.filter((p) => {
        const d = new Date(p.payment_date).getTime();
        if (from && d < new Date(from).getTime()) return false;
        if (to && d > new Date(to + 'T23:59:59').getTime()) return false;
        return true;
      });
    }
    const tdsTotal = filtered.reduce((s, p) => s + parseFloat(p.tds_amount || '0'), 0);
    const rows = filtered
      .filter((p) => parseFloat(p.tds_amount || '0') > 0)
      .map((p) => ({
        id: p.id,
        vendor_id: p.vendor_id,
        payment_date: p.payment_date,
        amount: parseFloat(p.amount),
        tds_amount: parseFloat(p.tds_amount || '0'),
        tds_percent: parseFloat(p.tds_percent || '0'),
      }));
    return { from: from ?? null, to: to ?? null, total_tds_deducted: Math.round(tdsTotal * 100) / 100, rows };
  }

  async getDataExport(ctx: TenantContext): Promise<Record<string, unknown>> {
    const [customers, invoices, orders, vendors, journalEntries] = await Promise.all([
      this.crmService.findCustomers(ctx),
      this.salesService.findInvoices(ctx),
      this.purchaseService.findPurchaseOrders(ctx),
      this.purchaseService.findVendors(ctx),
      this.accountingService.findJournalEntries(ctx),
    ]);
    return {
      exported_at: new Date().toISOString(),
      tenant_id: ctx.tenantId,
      customers: customers.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, gstin: c.gstin })),
      sales_invoices: invoices.map((i) => ({ id: i.id, number: i.number, date: i.invoice_date, total: i.total, status: i.status })),
      purchase_orders: orders.map((o) => ({ id: o.id, number: o.number, date: o.order_date, total: o.total, status: o.status })),
      vendors: vendors.map((v) => ({ id: v.id, name: v.name, email: v.email, phone: v.phone, gstin: v.gstin })),
      journal_entries: journalEntries.map((e) => ({ id: e.id, number: e.number, date: e.entry_date, total_debit: e.total_debit, total_credit: e.total_credit })),
    };
  }

  async getDashboard(ctx: TenantContext) {
    let receivables: { invoices: SalesInvoice[]; totalPending: number };
    let payables: { orders: { id: string; number: string; vendor: string; total: number; paid: number; due: number; due_date?: string | null }[]; totalPayable: number };
    let allInvoices: SalesInvoice[];
    let lowStock: unknown[];

    try {
      const [rec, pay, invs, low] = await Promise.all([
        this.salesService.getPendingInvoices(ctx).catch(() => ({ invoices: [] as SalesInvoice[], totalPending: 0 })),
        this.purchaseService.getPayables(ctx).catch(() => ({ orders: [], totalPayable: 0 })),
        this.salesService.findInvoices(ctx).catch(() => [] as SalesInvoice[]),
        this.inventoryService.findLowStock(ctx).catch(() => []),
      ]);
      receivables = rec;
      payables = pay;
      allInvoices = Array.isArray(invs) ? invs : [];
      lowStock = Array.isArray(low) ? low : [];
    } catch (e) {
      // Ensure we have safe defaults if any call fails
      receivables = { invoices: [], totalPending: 0 };
      payables = { orders: [], totalPayable: 0 };
      allInvoices = [];
      lowStock = [];
    }

    const pendingInvoices = receivables?.invoices ?? [];
    const totalPending = Number(receivables?.totalPending) || 0;
    const orders = payables?.orders ?? [];
    const totalPayable = Number(payables?.totalPayable) || 0;

    const totalInvoiced = (allInvoices ?? []).reduce((sum, inv) => sum + (parseFloat(inv?.total) || 0), 0);
    const totalReceived = (allInvoices ?? []).reduce((sum, inv) => sum + (parseFloat(inv?.paid_amount) || 0), 0);

    const today = new Date().toISOString().slice(0, 10);
    const dueTodayReceivables = pendingInvoices.filter((inv) => inv?.due_date && new Date(inv.due_date).toISOString().slice(0, 10) === today);
    const dueTodayPayables = orders.filter(
      (o) => o?.due_date != null && new Date(o.due_date).toISOString().slice(0, 10) === today,
    );

    return {
      tenantId: ctx.tenantId,
      summary: {
        receivables: {
          totalInvoiced: Math.round(totalInvoiced * 100) / 100,
          totalReceived: Math.round(totalReceived * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          pendingCount: pendingInvoices.length,
          invoiceCount: (allInvoices ?? []).length,
        },
        payables: {
          totalPayable: Math.round(totalPayable * 100) / 100,
          payableCount: orders.length,
        },
        lowStockCount: lowStock.length,
        dueTodayReceivables: dueTodayReceivables.length,
        dueTodayReceivablesAmount: dueTodayReceivables.reduce((s, inv) => s + (parseFloat(inv?.total) || 0) - (parseFloat(inv?.paid_amount) || 0), 0),
        dueTodayPayables: dueTodayPayables.length,
        dueTodayPayablesAmount: dueTodayPayables.reduce((s, o) => s + (Number((o as { due?: number }).due) || 0), 0),
      },
      pendingReceivables: pendingInvoices.slice(0, 10).map((inv) => ({
        id: inv.id,
        number: inv.number,
        buyer: (inv.customer as { name?: string } | null)?.name ?? (inv.vendor as { name?: string } | null)?.name ?? 'N/A',
        total: parseFloat(inv.total) || 0,
        paid: parseFloat(inv.paid_amount) || 0,
        due: (parseFloat(inv.total) || 0) - (parseFloat(inv.paid_amount) || 0),
        due_date: inv.due_date,
      })),
      pendingPayables: orders.slice(0, 10).map((o) => ({
        id: o.id,
        number: o.number,
        vendor: o.vendor,
        total: o.total,
        paid: o.paid,
        due: o.due,
        due_date: o.due_date ?? null,
      })),
    };
  }

  async getAgeingReport(ctx: TenantContext, type: 'receivables' | 'payables' = 'receivables') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === 'receivables') {
      const { invoices } = await this.salesService.getPendingInvoices(ctx);
      const withDue = invoices
        .filter((inv) => parseFloat(inv.total) > parseFloat(inv.paid_amount))
        .map((inv) => {
          const due = parseFloat(inv.total) - parseFloat(inv.paid_amount);
          const dueDate = inv.due_date ? new Date(inv.due_date) : null;
          const daysOverdue = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
          let bucket: string;
          if (daysOverdue <= 0) bucket = '0-30';
          else if (daysOverdue <= 30) bucket = '0-30';
          else if (daysOverdue <= 60) bucket = '31-60';
          else if (daysOverdue <= 90) bucket = '61-90';
          else bucket = '90+';
          return { id: inv.id, number: inv.number, buyer: (inv.customer as { name?: string })?.name ?? (inv.vendor as { name?: string })?.name ?? 'N/A', due, due_date: inv.due_date, daysOverdue, bucket };
        });
      const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      withDue.forEach((r) => { buckets[r.bucket as keyof typeof buckets] += r.due; });
      return { type: 'receivables', as_of: today.toISOString().slice(0, 10), buckets, rows: withDue };
    }

    const payables = await this.purchaseService.getPayables(ctx);
    const ordersWithDue = payables.orders as { id: string; number: string; vendor: string; total: number; paid: number; due: number; due_date?: string | null }[];
    const withDue = ordersWithDue
      .filter((o) => o.due > 0)
      .map((o) => {
        const dueDate = o.due_date ? new Date(o.due_date) : null;
        const daysOverdue = dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        let bucket: string;
        if (daysOverdue <= 0) bucket = '0-30';
        else if (daysOverdue <= 30) bucket = '0-30';
        else if (daysOverdue <= 60) bucket = '31-60';
        else if (daysOverdue <= 90) bucket = '61-90';
        else bucket = '90+';
        return { id: o.id, number: o.number, vendor: o.vendor, due: o.due, due_date: o.due_date ?? null, daysOverdue, bucket };
      });
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    withDue.forEach((r) => { buckets[r.bucket as keyof typeof buckets] += r.due; });
    return { type: 'payables', as_of: today.toISOString().slice(0, 10), buckets, rows: withDue };
  }

  /** Requirement vs delivery: orders with line-level required/delivered/pending. For restaurant_wholesale / Star ICE. */
  async getRequirementVsDeliveryReport(
    ctx: TenantContext,
    customer_id?: string,
    from?: string,
    to?: string,
  ): Promise<{
    from: string | null;
    to: string | null;
    customer_id: string | null;
    summary: { total_orders: number; total_lines: number; total_required: number; total_delivered: number; total_pending: number };
    rows: Array<{
      order_id: string;
      order_number: string;
      order_date: string;
      customer_name: string;
      item_name: string;
      required_qty: number;
      delivered_qty: number;
      pending_qty: number;
    }>;
  }> {
    const data = await this.salesService.getRequirementVsDelivery(ctx, customer_id);
    const rows: Array<{
      order_id: string;
      order_number: string;
      order_date: string;
      customer_name: string;
      item_name: string;
      required_qty: number;
      delivered_qty: number;
      pending_qty: number;
    }> = [];
    let totalRequired = 0;
    let totalDelivered = 0;
    let totalPending = 0;
    for (const { order, lines } of data) {
      const orderDate = order.order_date ? new Date(order.order_date).toISOString().slice(0, 10) : '';
      if (from && orderDate < from) continue;
      if (to && orderDate > to) continue;
      const customerName = (order.customer as { name?: string } | null)?.name ?? 'Customer';
      for (const { line, delivered_qty, pending_qty } of lines) {
        const required = parseFloat(line.quantity) || 0;
        const itemName = (line.item as { name?: string } | null)?.name ?? line.description ?? 'Item';
        rows.push({
          order_id: order.id,
          order_number: (order as { number?: string }).number ?? order.id.slice(0, 8),
          order_date: orderDate,
          customer_name: customerName,
          item_name: itemName,
          required_qty: required,
          delivered_qty: delivered_qty,
          pending_qty: pending_qty,
        });
        totalRequired += required;
        totalDelivered += delivered_qty;
        totalPending += pending_qty;
      }
    }
    const orderIds = [...new Set(rows.map((r) => r.order_id))];
    return {
      from: from ?? null,
      to: to ?? null,
      customer_id: customer_id ?? null,
      summary: {
        total_orders: orderIds.length,
        total_lines: rows.length,
        total_required: Math.round(totalRequired * 10000) / 10000,
        total_delivered: Math.round(totalDelivered * 10000) / 10000,
        total_pending: Math.round(totalPending * 10000) / 10000,
      },
      rows,
    };
  }

  /** Stock on hand vs quantity delivered in period. For restaurant_wholesale / Star ICE. */
  async getStockVsDeliveryReport(
    ctx: TenantContext,
    from?: string,
    to?: string,
  ): Promise<{
    from: string | null;
    to: string | null;
    rows: Array<{
      item_id: string;
      item_name: string;
      stock_on_hand: number;
      delivered_in_period: number;
    }>;
  }> {
    const [stockList, delivered] = await Promise.all([
      this.inventoryService.findStock(ctx),
      this.salesService.getDeliveredByItem(ctx, from, to),
    ]);
    const stockByItem: Record<string, { item_name: string; quantity: number }> = {};
    for (const s of stockList) {
      const id = s.item_id;
      const name = (s.item as { name?: string })?.name ?? 'Item';
      const qty = parseFloat(s.quantity) || 0;
      if (!stockByItem[id]) stockByItem[id] = { item_name: name, quantity: 0 };
      stockByItem[id].item_name = name;
      stockByItem[id].quantity += qty;
    }
    const deliveredMap = new Map(delivered.map((d) => [d.item_id, { item_name: d.item_name, quantity_delivered: d.quantity_delivered }]));
    const allItemIds = new Set([...Object.keys(stockByItem), ...deliveredMap.keys()]);
    const rows: Array<{ item_id: string; item_name: string; stock_on_hand: number; delivered_in_period: number }> = [];
    for (const item_id of allItemIds) {
      const st = stockByItem[item_id];
      const del = deliveredMap.get(item_id);
      rows.push({
        item_id,
        item_name: st?.item_name ?? del?.item_name ?? 'Item',
        stock_on_hand: Math.round((st?.quantity ?? 0) * 10000) / 10000,
        delivered_in_period: Math.round((del?.quantity_delivered ?? 0) * 10000) / 10000,
      });
    }
    rows.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { from: from ?? null, to: to ?? null, rows };
  }

  /** Delivery challans with invoiced status. For restaurant_wholesale / Star ICE. */
  async getDeliveryVsInvoicedReport(
    ctx: TenantContext,
    from?: string,
    to?: string,
    customer_id?: string,
  ): Promise<{
    from: string | null;
    to: string | null;
    summary: { total_challans: number; invoiced: number; not_invoiced: number };
    rows: Array<{
      id: string;
      number: string;
      challan_date: string;
      customer_name: string;
      status: string;
      invoiced: boolean;
      invoice_number: string | null;
    }>;
  }> {
    const [challans, invoices] = await Promise.all([
      this.salesService.findDeliveryChallans(ctx, undefined, customer_id, from, to),
      this.salesService.findInvoices(ctx),
    ]);
    const invMap = new Map(invoices.map((i) => [i.id, i.number]));
    let invoiced = 0;
    const rows = challans.map((dc) => {
      const inv = dc.invoice_id != null;
      if (inv) invoiced += 1;
      return {
        id: dc.id,
        number: (dc as { number?: string }).number ?? dc.id.slice(0, 8),
        challan_date: dc.challan_date ? new Date(dc.challan_date).toISOString().slice(0, 10) : '',
        customer_name: (dc.customer as { name?: string } | null)?.name ?? '—',
        status: (dc as { status?: string }).status ?? 'draft',
        invoiced: inv,
        invoice_number: dc.invoice_id ? invMap.get(dc.invoice_id) ?? null : null,
      };
    });
    return {
      from: from ?? null,
      to: to ?? null,
      summary: { total_challans: rows.length, invoiced, not_invoiced: rows.length - invoiced },
      rows,
    };
  }

  /** Invoice vs payment: customer-wise receivables summary. For restaurant_wholesale / Star ICE. */
  async getInvoiceVsPaymentReport(
    ctx: TenantContext,
    customer_id?: string,
  ): Promise<{
    customer_id: string | null;
    summary: { total_invoiced: number; total_received: number; total_pending: number };
    rows: Array<{
      customer_id: string;
      customer_name: string;
      total_invoiced: number;
      total_received: number;
      total_pending: number;
      invoice_count: number;
    }>;
  }> {
    const invoices = await this.salesService.findInvoices(ctx);
    const byCustomer: Record<
      string,
      { customer_name: string; total_invoiced: number; total_received: number; invoice_count: number }
    > = {};
    for (const inv of invoices) {
      const cid = inv.customer_id ?? (inv as { vendor_id?: string }).vendor_id ?? 'unknown';
      if (customer_id && cid !== customer_id) continue;
      const name = (inv.customer as { name?: string } | null)?.name ?? (inv.vendor as { name?: string } | null)?.name ?? '—';
      if (!byCustomer[cid]) byCustomer[cid] = { customer_name: name, total_invoiced: 0, total_received: 0, invoice_count: 0 };
      byCustomer[cid].customer_name = name;
      byCustomer[cid].total_invoiced += parseFloat(inv.total);
      byCustomer[cid].total_received += parseFloat(inv.paid_amount);
      byCustomer[cid].invoice_count += 1;
    }
    const rows = Object.entries(byCustomer).map(([cid, v]) => ({
      customer_id: cid,
      customer_name: v.customer_name,
      total_invoiced: Math.round(v.total_invoiced * 100) / 100,
      total_received: Math.round(v.total_received * 100) / 100,
      total_pending: Math.round((v.total_invoiced - v.total_received) * 100) / 100,
      invoice_count: v.invoice_count,
    }));
    const total_invoiced = rows.reduce((s, r) => s + r.total_invoiced, 0);
    const total_received = rows.reduce((s, r) => s + r.total_received, 0);
    const total_pending = rows.reduce((s, r) => s + r.total_pending, 0);
    return {
      customer_id: customer_id ?? null,
      summary: { total_invoiced, total_received, total_pending },
      rows,
    };
  }
}
