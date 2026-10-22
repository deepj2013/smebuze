import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
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
      rows: filtered.slice(0, 100).map((inv) => {
        const gst = inv as SalesInvoice & { taxable_value?: string; cgst_amount?: string; sgst_amount?: string; igst_amount?: string };
        const customerName = inv.customer?.name?.trim() || inv.vendor?.name?.trim() || null;
        const customerGstin = inv.customer?.gstin?.trim() || inv.vendor?.gstin?.trim() || null;
        return {
          id: inv.id,
          number: inv.number,
          customer_name: customerName,
          customer_gstin: customerGstin,
          date: inv.invoice_date,
          taxable_value: Number(gst.taxable_value ?? inv.subtotal ?? 0),
          cgst: Number(gst.cgst_amount ?? 0),
          sgst: Number(gst.sgst_amount ?? 0),
          igst: Number(gst.igst_amount ?? 0),
          total: parseFloat(inv.total),
          paid: parseFloat(inv.paid_amount),
          due: parseFloat(inv.total) - parseFloat(inv.paid_amount),
        };
      }),
    };
  }

  /** Invoice-wise sales register for CA / accountant — full period, with party GSTIN. */
  async getSalesRegister(ctx: TenantContext, from?: string, to?: string, companyId?: string) {
    const invoices = await this.salesService.findInvoices(ctx);
    const filtered = this.filterByDateAndCompany(
      invoices,
      from,
      to,
      companyId,
      (i) => i.invoice_date,
      (i) => i.company_id,
    ).filter((i) => i.status !== 'deleted' && i.status !== 'draft');
    const round = (n: number) => Math.round(n * 100) / 100;
    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let invoiceTotal = 0;
    const rows = filtered
      .sort((a, b) => {
        const da = new Date(a.invoice_date).getTime();
        const db = new Date(b.invoice_date).getTime();
        return da - db || a.number.localeCompare(b.number);
      })
      .map((inv) => {
        const gst = inv as SalesInvoice & {
          taxable_value?: string;
          cgst_amount?: string;
          sgst_amount?: string;
          igst_amount?: string;
        };
        const taxable = round(Number(gst.taxable_value ?? inv.subtotal ?? 0));
        const cgst = round(Number(gst.cgst_amount ?? 0));
        const sgst = round(Number(gst.sgst_amount ?? 0));
        const igst = round(Number(gst.igst_amount ?? 0));
        const total = round(parseFloat(inv.total));
        taxableTotal += taxable;
        cgstTotal += cgst;
        sgstTotal += sgst;
        igstTotal += igst;
        invoiceTotal += total;
        const day =
          inv.invoice_date instanceof Date
            ? inv.invoice_date.toISOString().slice(0, 10)
            : String(inv.invoice_date).slice(0, 10);
        return {
          id: inv.id,
          number: inv.number,
          date: day,
          customer_name: inv.customer?.name?.trim() || inv.vendor?.name?.trim() || '—',
          customer_gstin: inv.customer?.gstin?.trim() || inv.vendor?.gstin?.trim() || '',
          taxable_value: taxable,
          cgst,
          sgst,
          igst,
          total,
        };
      });
    return {
      from: from ?? null,
      to: to ?? null,
      company_id: companyId ?? null,
      invoiceCount: rows.length,
      totals: {
        taxable_value: round(taxableTotal),
        cgst: round(cgstTotal),
        sgst: round(sgstTotal),
        igst: round(igstTotal),
        total: round(invoiceTotal),
      },
      rows,
    };
  }

  /** Account-style ledger: each bill (debit) and each payment receipt (credit) for one customer. */
  async getCustomerAccountLedger(
    ctx: TenantContext,
    customerId: string,
    from?: string,
    to?: string,
    companyId?: string,
  ) {
    if (!customerId) throw new BadRequestException('customer_id is required');
    const round = (n: number) => Math.round(n * 100) / 100;
    const day = (value: Date | string | null | undefined): string => {
      if (!value) return '';
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value).slice(0, 10);
    };
    const inRange = (d: string) => {
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };

    let partyName = 'Customer';
    let partyGstin: string | null = null;
    let partyType: 'customer' | 'vendor' = 'customer';
    try {
      const c = await this.crmService.findOneCustomer(customerId, ctx);
      partyName = c.name;
      partyGstin = c.gstin ?? null;
    } catch {
      try {
        const v = await this.purchaseService.findOneVendor(customerId, ctx);
        partyName = v.name;
        partyGstin = v.gstin ?? null;
        partyType = 'vendor';
      } catch {
        /* resolved from invoices below */
      }
    }

    const invoices = await this.salesService.findInvoices(ctx, undefined, undefined, undefined, undefined, undefined, true);
    const partyInvoices = invoices.filter(
      (inv) =>
        (inv.customer_id === customerId || inv.vendor_id === customerId) &&
        inv.status !== 'deleted' &&
        (!companyId || inv.company_id === companyId),
    );
    if (partyName === 'Customer' && partyInvoices.length) {
      partyName = partyInvoices[0].customer?.name ?? partyInvoices[0].vendor?.name ?? partyName;
      partyGstin = partyInvoices[0].customer?.gstin ?? partyInvoices[0].vendor?.gstin ?? partyGstin;
      partyType = partyInvoices[0].customer_id === customerId ? 'customer' : 'vendor';
    }

    const invoiceIds = partyInvoices.map((i) => i.id);
    type PayRow = {
      payment_date: string | Date;
      amount: string;
      mode: string;
      reference: string | null;
      invoice_number: string;
    };
    let payments: PayRow[] = [];
    if (invoiceIds.length) {
      payments = await this.dataSource.query(
        `SELECT p.payment_date, p.amount, p.mode, p.reference, inv.number AS invoice_number
         FROM invoice_payments p
         INNER JOIN sales_invoices inv ON inv.id = p.invoice_id
         WHERE inv.tenant_id = $1 AND p.invoice_id = ANY($2::uuid[])
         ORDER BY p.payment_date ASC, p.created_at ASC`,
        [ctx.tenantId, invoiceIds],
      );
    }

    const netOf = (inv: SalesInvoice) =>
      round(Number((inv as SalesInvoice & { net_amount?: string }).net_amount ?? inv.total));

    let openingBalance = 0;
    if (from) {
      for (const inv of partyInvoices) {
        const d = day(inv.invoice_date);
        if (d && d < from) openingBalance = round(openingBalance + netOf(inv));
      }
      for (const p of payments) {
        const d = day(p.payment_date);
        if (d && d < from) openingBalance = round(openingBalance - parseFloat(p.amount || '0'));
      }
    }

    type RawEntry = {
      date: string;
      sort: number;
      kind: 'opening' | 'invoice' | 'payment';
      reference: string;
      particulars: string;
      debit: number;
      credit: number;
    };
    const raw: RawEntry[] = [];
    if (from && Math.abs(openingBalance) > 0.005) {
      raw.push({
        date: from,
        sort: 0,
        kind: 'opening',
        reference: '—',
        particulars: 'Opening balance',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      });
    }
    for (const inv of partyInvoices) {
      const d = day(inv.invoice_date);
      if (!inRange(d)) continue;
      const net = netOf(inv);
      raw.push({
        date: d,
        sort: 1,
        kind: 'invoice',
        reference: inv.number,
        particulars: 'Sales invoice / bill',
        debit: net,
        credit: 0,
      });
    }
    for (const p of payments) {
      const d = day(p.payment_date);
      if (!inRange(d)) continue;
      const amt = round(parseFloat(p.amount || '0'));
      const mode = (p.mode || 'cash').replace(/_/g, ' ');
      const ref = p.reference ? ` · Ref ${p.reference}` : '';
      raw.push({
        date: d,
        sort: 2,
        kind: 'payment',
        reference: p.invoice_number,
        particulars: `Payment received (${mode}) against invoice ${p.invoice_number}${ref}`,
        debit: 0,
        credit: amt,
      });
    }
    raw.sort((a, b) => a.date.localeCompare(b.date) || a.sort - b.sort || a.reference.localeCompare(b.reference));

    let balance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;
    const entries = raw.map((row) => {
      if (row.kind !== 'opening') {
        balance = round(balance + row.debit - row.credit);
        totalDebit = round(totalDebit + row.debit);
        totalCredit = round(totalCredit + row.credit);
      }
      return {
        date: row.date,
        kind: row.kind,
        reference: row.reference,
        particulars: row.particulars,
        debit: row.debit,
        credit: row.credit,
        balance: row.kind === 'opening' ? openingBalance : balance,
      };
    });

    return {
      customer_id: customerId,
      customer_name: partyName,
      customer_gstin: partyGstin,
      party_type: partyType,
      from: from ?? null,
      to: to ?? null,
      company_id: companyId ?? null,
      opening_balance: openingBalance,
      closing_balance: balance,
      total_debit: totalDebit,
      total_credit: totalCredit,
      entries,
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
      sales_invoices: invoices.map((i) => {
        const gst = i as SalesInvoice & { taxable_value?: string; cgst_amount?: string; sgst_amount?: string; igst_amount?: string };
        return {
          id: i.id,
          number: i.number,
          date: i.invoice_date,
          taxable_value: gst.taxable_value ?? i.subtotal,
          cgst: gst.cgst_amount ?? '0.00',
          sgst: gst.sgst_amount ?? '0.00',
          igst: gst.igst_amount ?? '0.00',
          total: i.total,
          status: i.status,
        };
      }),
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
      pendingReceivables: pendingInvoices.slice(0, 10).map((inv) => {
        const gst = inv as SalesInvoice & { taxable_value?: string; cgst_amount?: string; sgst_amount?: string; igst_amount?: string; balance_due?: string };
        return {
          id: inv.id,
          number: inv.number,
          buyer: (inv.customer as { name?: string } | null)?.name ?? (inv.vendor as { name?: string } | null)?.name ?? 'N/A',
          taxable_value: Number(gst.taxable_value ?? inv.subtotal ?? 0),
          cgst: Number(gst.cgst_amount ?? 0),
          sgst: Number(gst.sgst_amount ?? 0),
          igst: Number(gst.igst_amount ?? 0),
          total: parseFloat(inv.total) || 0,
          paid: parseFloat(inv.paid_amount) || 0,
          due: Number(gst.balance_due ?? (parseFloat(inv.total) || 0) - (parseFloat(inv.paid_amount) || 0)),
          due_date: inv.due_date,
        };
      }),
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

  /** Invoice vs payment: customer summary, with each invoice's received and pending amounts. */
  async getInvoiceVsPaymentReport(
    ctx: TenantContext,
    customer_id?: string,
  ): Promise<{
    customer_id: string | null;
    summary: { total_invoiced: number; total_received: number; total_pending: number };
    rows: Array<{
      customer_id: string;
      customer_name: string;
      party_type: 'customer' | 'vendor' | 'none';
      total_invoiced: number;
      total_received: number;
      total_pending: number;
      taxable_value: number;
      cgst: number;
      sgst: number;
      igst: number;
      invoice_value: number;
      invoice_count: number;
      invoices: Array<{
        id: string;
        number: string;
        invoice_date: string;
        due_date: string | null;
        payment_status: string;
        taxable_value: number;
        cgst: number;
        sgst: number;
        igst: number;
        invoice_value: number;
        total_invoiced: number;
        total_received: number;
        total_pending: number;
      }>;
    }>;
  }> {
    const day = (value: Date | string | null | undefined): string | null => {
      if (!value) return null;
      if (typeof value === 'string') return value.slice(0, 10);
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const invoices = await this.salesService.findInvoices(ctx, undefined, undefined, undefined, undefined, undefined, true);
    const byCustomer: Record<
      string,
      {
        customer_name: string;
        party_type: 'customer' | 'vendor' | 'none';
        total_invoiced: number;
        total_received: number;
        total_pending: number;
        taxable_value: number;
        cgst: number;
        sgst: number;
        igst: number;
        invoice_value: number;
        invoices: Array<{
          id: string;
          number: string;
          invoice_date: string;
          due_date: string | null;
          payment_status: string;
          taxable_value: number;
          cgst: number;
          sgst: number;
          igst: number;
          invoice_value: number;
          total_invoiced: number;
          total_received: number;
          total_pending: number;
        }>;
      }
    > = {};
    for (const inv of invoices) {
      const partyType = inv.customer_id ? 'customer' : inv.vendor_id ? 'vendor' : 'none';
      const cid = inv.customer_id ?? inv.vendor_id ?? 'unknown';
      if (customer_id && cid !== customer_id) continue;
      const name = inv.customer?.name ?? inv.vendor?.name ?? '—';
      const view = inv as SalesInvoice & {
        net_amount?: string;
        balance_due?: string;
        payment_status?: string;
        taxable_value?: string;
        cgst_amount?: string;
        sgst_amount?: string;
        igst_amount?: string;
        invoice_value?: string;
      };
      const invoiced = Math.round(Number(view.net_amount ?? inv.total) * 100) / 100;
      const received = Math.round(parseFloat(inv.paid_amount || '0') * 100) / 100;
      const pending = Math.round(Number(view.balance_due ?? invoiced - received) * 100) / 100;
      const taxable = Math.round(Number(view.taxable_value ?? inv.subtotal ?? 0) * 100) / 100;
      const cgst = Math.round(Number(view.cgst_amount ?? 0) * 100) / 100;
      const sgst = Math.round(Number(view.sgst_amount ?? 0) * 100) / 100;
      const igst = Math.round(Number(view.igst_amount ?? 0) * 100) / 100;
      const invoiceValue = Math.round(Number(view.invoice_value ?? inv.total) * 100) / 100;
      const line = {
        id: inv.id,
        number: inv.number,
        invoice_date: day(inv.invoice_date) ?? '',
        due_date: day(inv.due_date),
        payment_status:
          view.payment_status ||
          (pending < -0.05 ? 'credit' : pending <= 0.05 ? 'paid' : received > 0.05 ? 'partial' : 'pending'),
        taxable_value: taxable,
        cgst,
        sgst,
        igst,
        invoice_value: invoiceValue,
        total_invoiced: invoiced,
        total_received: received,
        total_pending: pending,
      };
      if (!byCustomer[cid]) {
        byCustomer[cid] = {
          customer_name: name,
          party_type: partyType,
          total_invoiced: 0,
          total_received: 0,
          total_pending: 0,
          taxable_value: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          invoice_value: 0,
          invoices: [],
        };
      }
      byCustomer[cid].customer_name = name;
      byCustomer[cid].total_invoiced = Math.round((byCustomer[cid].total_invoiced + invoiced) * 100) / 100;
      byCustomer[cid].total_received = Math.round((byCustomer[cid].total_received + received) * 100) / 100;
      byCustomer[cid].total_pending = Math.round((byCustomer[cid].total_pending + pending) * 100) / 100;
      byCustomer[cid].taxable_value = Math.round((byCustomer[cid].taxable_value + taxable) * 100) / 100;
      byCustomer[cid].cgst = Math.round((byCustomer[cid].cgst + cgst) * 100) / 100;
      byCustomer[cid].sgst = Math.round((byCustomer[cid].sgst + sgst) * 100) / 100;
      byCustomer[cid].igst = Math.round((byCustomer[cid].igst + igst) * 100) / 100;
      byCustomer[cid].invoice_value = Math.round((byCustomer[cid].invoice_value + invoiceValue) * 100) / 100;
      byCustomer[cid].invoices.push(line);
    }
    const rows = Object.entries(byCustomer).map(([cid, v]) => ({
      customer_id: cid,
      customer_name: v.customer_name,
      party_type: v.party_type,
      total_invoiced: v.total_invoiced,
      total_received: v.total_received,
      total_pending: v.total_pending,
      taxable_value: v.taxable_value,
      cgst: v.cgst,
      sgst: v.sgst,
      igst: v.igst,
      invoice_value: v.invoice_value,
      invoice_count: v.invoices.length,
      invoices: v.invoices.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)),
    }));
    rows.sort((a, b) => b.total_pending - a.total_pending || a.customer_name.localeCompare(b.customer_name));
    const total_invoiced = Math.round(rows.reduce((s, r) => s + r.total_invoiced, 0) * 100) / 100;
    const total_received = Math.round(rows.reduce((s, r) => s + r.total_received, 0) * 100) / 100;
    const total_pending = Math.round(rows.reduce((s, r) => s + r.total_pending, 0) * 100) / 100;
    return {
      customer_id: customer_id ?? null,
      summary: { total_invoiced, total_received, total_pending },
      rows,
    };
  }

  /**
   * Cash counter day close: collections by mode (cash / UPI / card) + credit sales,
   * and profit for today / this week / this month.
   */
  async getCashCounterReport(ctx: TenantContext, date?: string) {
    const tenantId = ctx.tenantId;
    const round = (n: number) => Math.round(Number(n || 0) * 100) / 100;
    const emptyPeriod = () => ({
      sales: 0,
      cost: 0,
      profit: 0,
      bills: 0,
      cash: 0,
      upi: 0,
      card: 0,
      credit: 0,
      other: 0,
    });
    if (!tenantId) {
      return {
        date: date || new Date().toISOString().slice(0, 10),
        day: emptyPeriod(),
        week: emptyPeriod(),
        month: emptyPeriod(),
      };
    }

    const day = (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10));
    const dayDate = new Date(`${day}T12:00:00`);
    const weekStart = new Date(dayDate);
    const dow = weekStart.getDay(); // 0 Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekFrom = weekStart.toISOString().slice(0, 10);
    const monthFrom = `${day.slice(0, 7)}-01`;

    const periodStats = async (from: string, to: string) => {
      const salesRows = await this.dataSource.query(
        `SELECT
            COALESCE(SUM(inv.total), 0)::float AS sales,
            COALESCE(SUM(cost.line_cost), 0)::float AS cost,
            COUNT(*)::int AS bills
         FROM sales_invoices inv
         LEFT JOIN (
           SELECT l.invoice_id,
                  SUM(l.qty * COALESCE(i.cost_price, 0)) AS line_cost
           FROM sales_invoice_lines l
           LEFT JOIN items i ON i.id = l.item_id
           GROUP BY l.invoice_id
         ) cost ON cost.invoice_id = inv.id
         WHERE inv.tenant_id = $1
           AND inv.invoice_date >= $2::date
           AND inv.invoice_date <= $3::date
           AND COALESCE(inv.status, '') <> 'deleted'`,
        [tenantId, from, to],
      );
      const payRows = await this.dataSource.query(
        `SELECT LOWER(COALESCE(p.mode, 'cash')) AS mode,
                COALESCE(SUM(p.amount), 0)::float AS amount
         FROM invoice_payments p
         JOIN sales_invoices inv ON inv.id = p.invoice_id
         WHERE inv.tenant_id = $1
           AND p.payment_date >= $2::date
           AND p.payment_date <= $3::date
           AND COALESCE(inv.status, '') <> 'deleted'
         GROUP BY 1`,
        [tenantId, from, to],
      );
      // Credit = bills in the period still unpaid (or only partly paid)
      const creditRows = await this.dataSource.query(
        `SELECT COALESCE(SUM(GREATEST(
            COALESCE(inv.total, 0)
            - COALESCE(pay.paid, 0),
            0
          )), 0)::float AS credit
         FROM sales_invoices inv
         LEFT JOIN (
           SELECT invoice_id, SUM(amount) AS paid FROM invoice_payments GROUP BY invoice_id
         ) pay ON pay.invoice_id = inv.id
         WHERE inv.tenant_id = $1
           AND inv.invoice_date >= $2::date
           AND inv.invoice_date <= $3::date
           AND COALESCE(inv.status, '') <> 'deleted'
           AND COALESCE(inv.total, 0) > COALESCE(pay.paid, 0) + 0.009`,
        [tenantId, from, to],
      );

      let cash = 0;
      let upi = 0;
      let card = 0;
      let other = 0;
      for (const row of payRows as { mode: string; amount: number }[]) {
        const m = String(row.mode || 'cash').toLowerCase();
        const amt = Number(row.amount) || 0;
        if (m === 'cash') cash += amt;
        else if (m === 'upi') upi += amt;
        else if (m === 'card') card += amt;
        else other += amt;
      }
      const sales = Number(salesRows[0]?.sales) || 0;
      const cost = Number(salesRows[0]?.cost) || 0;
      return {
        sales: round(sales),
        cost: round(cost),
        profit: round(sales - cost),
        bills: Number(salesRows[0]?.bills) || 0,
        cash: round(cash),
        upi: round(upi),
        card: round(card),
        credit: round(Number(creditRows[0]?.credit) || 0),
        other: round(other),
      };
    };

    const [dayStats, weekStats, monthStats] = await Promise.all([
      periodStats(day, day),
      periodStats(weekFrom, day),
      periodStats(monthFrom, day),
    ]);

    return {
      date: day,
      week_from: weekFrom,
      month_from: monthFrom,
      day: dayStats,
      week: weekStats,
      month: monthStats,
    };
  }

  /** Counter report for a department store: GST, margin, credit accounts, and bulk packs. */
  async getDepartmentCounterReport(ctx: TenantContext, from?: string, to?: string) {
    const tenantId = ctx.tenantId;
    if (!tenantId) return { items: [], categories: [], credit: [], packs: [] };
    const start = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const end = to || new Date().toISOString().slice(0, 10);
    const items = await this.dataSource.query(
      `SELECT COALESCE(i.category, 'Uncategorised') AS category,
              COALESCE(i.subcategory, '') AS subcategory,
              COALESCE(i.name, l.description) AS name,
              COALESCE(i.variant_size, '') AS variant_size,
              COALESCE(i.variant_shape, '') AS variant_shape,
              COALESCE(SUM(l.qty), 0)::float AS qty,
              COALESCE(SUM(l.taxable_value), 0)::float AS taxable_value,
              COALESCE(SUM(l.cgst_amount), 0)::float AS cgst,
              COALESCE(SUM(l.sgst_amount), 0)::float AS sgst,
              COALESCE(SUM(l.igst_amount), 0)::float AS igst,
              COALESCE(SUM(l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount), 0)::float AS invoice_value,
              COALESCE(SUM(l.qty * COALESCE(i.cost_price, 0)), 0)::float AS cost
       FROM sales_invoice_lines l
       JOIN sales_invoices inv ON inv.id = l.invoice_id
       LEFT JOIN items i ON i.id = l.item_id
       WHERE inv.tenant_id = $1
         AND inv.invoice_date >= $2::date
         AND inv.invoice_date <= $3::date
         AND COALESCE(inv.status, '') <> 'deleted'
       GROUP BY 1, 2, 3, 4, 5
       ORDER BY 1, 2, 3`,
      [tenantId, start, end],
    );
    const categories = await this.dataSource.query(
      `SELECT COALESCE(i.category, 'Uncategorised') AS category,
              COALESCE(SUM(l.taxable_value), 0)::float AS taxable_value,
              COALESCE(SUM(l.cgst_amount), 0)::float AS cgst,
              COALESCE(SUM(l.sgst_amount), 0)::float AS sgst,
              COALESCE(SUM(l.igst_amount), 0)::float AS igst,
              COALESCE(SUM(l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount), 0)::float AS invoice_value,
              COALESCE(SUM(l.qty * COALESCE(i.cost_price, 0)), 0)::float AS cost
       FROM sales_invoice_lines l
       JOIN sales_invoices inv ON inv.id = l.invoice_id
       LEFT JOIN items i ON i.id = l.item_id
       WHERE inv.tenant_id = $1
         AND inv.invoice_date >= $2::date
         AND inv.invoice_date <= $3::date
         AND COALESCE(inv.status, '') <> 'deleted'
       GROUP BY 1
       ORDER BY invoice_value DESC`,
      [tenantId, start, end],
    );
    const credit = await this.dataSource.query(
      `SELECT c.id, c.name, c.phone,
              COALESCE(SUM(inv.total), 0)::float AS invoiced,
              COALESCE(SUM(pay.paid), 0)::float AS paid
       FROM customers c
       LEFT JOIN sales_invoices inv
         ON inv.customer_id = c.id AND inv.tenant_id = c.tenant_id AND COALESCE(inv.status, '') <> 'deleted'
       LEFT JOIN (
         SELECT invoice_id, SUM(amount) AS paid FROM invoice_payments GROUP BY invoice_id
       ) pay ON pay.invoice_id = inv.id
       WHERE c.tenant_id = $1
         AND c.is_active = true
         AND (c.segment = 'credit' OR COALESCE(c.tags, '[]'::jsonb) @> '["credit"]'::jsonb)
       GROUP BY c.id, c.name, c.phone
       ORDER BY c.name`,
      [tenantId],
    );
    const packs = await this.dataSource.query(
      `SELECT src.name AS bulk_name, src.unit AS bulk_unit,
              COALESCE(SUM(st.quantity), 0)::float AS bulk_qty,
              pack.name AS pack_name, pack.variant_size, pack.pack_qty::float AS pack_qty,
              pack.mrp::float AS mrp, pack.cost_price::float AS cost_price, pack.sale_price::float AS sale_price,
              pack.discount_percent::float AS discount_percent
       FROM items pack
       JOIN items src ON src.id = pack.pack_source_id AND src.tenant_id = pack.tenant_id
       LEFT JOIN stock st ON st.item_id = src.id AND st.tenant_id = pack.tenant_id
       WHERE pack.tenant_id = $1 AND pack.is_active = true
       GROUP BY src.name, src.unit, pack.name, pack.variant_size, pack.pack_qty, pack.mrp, pack.cost_price, pack.sale_price, pack.discount_percent
       ORDER BY src.name, pack.name`,
      [tenantId],
    );
    const round = (n: number) => Math.round(Number(n || 0) * 100) / 100;
    return {
      from: start,
      to: end,
      categories: categories.map((r: Record<string, number | string>) => ({
        ...r,
        taxable_value: round(Number(r.taxable_value)),
        cgst: round(Number(r.cgst)),
        sgst: round(Number(r.sgst)),
        igst: round(Number(r.igst)),
        invoice_value: round(Number(r.invoice_value)),
        cost: round(Number(r.cost)),
        margin: round(Number(r.invoice_value) - Number(r.cost)),
      })),
      items: items.map((r: Record<string, number | string>) => ({
        ...r,
        qty: round(Number(r.qty)),
        taxable_value: round(Number(r.taxable_value)),
        cgst: round(Number(r.cgst)),
        sgst: round(Number(r.sgst)),
        igst: round(Number(r.igst)),
        invoice_value: round(Number(r.invoice_value)),
        cost: round(Number(r.cost)),
        margin: round(Number(r.invoice_value) - Number(r.cost)),
      })),
      credit: credit.map((r: { invoiced: number; paid: number; name: string; phone: string | null; id: string }) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        invoiced: round(r.invoiced),
        paid: round(r.paid),
        due: round(Number(r.invoiced) - Number(r.paid)),
      })),
      packs: packs.map((r: { bulk_qty: number; pack_qty: number; bulk_name: string; bulk_unit: string; pack_name: string; variant_size: string; mrp: number; cost_price: number; sale_price: number; discount_percent: number }) => ({
        ...r,
        bulk_qty: round(Number(r.bulk_qty)),
        packs_left: Number(r.pack_qty) > 0 ? Math.floor(Number(r.bulk_qty) / Number(r.pack_qty)) : 0,
        margin: round(Number(r.sale_price || 0) - Number(r.cost_price || 0)),
      })),
    };
  }

  /** Day-book CSV for Tally / Busy / Marg upload. Same columns; filename differs. */
  async accountingExportCsv(ctx: TenantContext, from?: string, to?: string, flavour: string = 'tally') {
    if (!ctx.tenantId) throw new Error('Tenant required');
    const tenant = await this.dataSource.query(`SELECT features FROM tenants WHERE id = $1`, [ctx.tenantId]);
    const features = tenant?.[0]?.features;
    const list = Array.isArray(features) ? features : [];
    if (!ctx.isSuperAdmin && !list.includes('accounting_export')) {
      throw new ForbiddenException('Accounting export is not enabled for this shop.');
    }
    const start = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const end = to || new Date().toISOString().slice(0, 10);
    const sales = (await this.dataSource.query(
      `SELECT number, invoice_date::text AS date, COALESCE(c.name, v.name, 'Cash') AS party,
              subtotal::text, tax_amount::text, total::text, 'Sales' AS vch
       FROM sales_invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN vendors v ON v.id = i.vendor_id
       WHERE i.tenant_id = $1 AND i.status <> 'deleted' AND i.invoice_date BETWEEN $2 AND $3
       ORDER BY i.invoice_date, i.number`,
      [ctx.tenantId, start, end],
    )) as Array<Record<string, string>>;
    let purchases: Array<Record<string, string>> = [];
    try {
      purchases = (await this.dataSource.query(
        `SELECT number, bill_date::text AS date, COALESCE(v.name, '') AS party,
                taxable_amount::text AS subtotal, (cgst_amount+sgst_amount+igst_amount)::text AS tax_amount,
                total::text, 'Purchase' AS vch
         FROM purchase_invoices i
         LEFT JOIN vendors v ON v.id = i.vendor_id
         WHERE i.tenant_id = $1 AND i.bill_date BETWEEN $2 AND $3
         ORDER BY i.bill_date, i.number`,
        [ctx.tenantId, start, end],
      )) as Array<Record<string, string>>;
    } catch {
      purchases = [];
    }
    const header = 'VoucherType,Date,VoucherNo,Party,Taxable,Tax,Total';
    const line = (r: Record<string, string>) =>
      `${r.vch},${String(r.date).slice(0, 10)},${r.number},${String(r.party || '').replace(/,/g, ' ')},${r.subtotal},${r.tax_amount},${r.total}`;
    const csv = [header, ...sales.map(line), ...purchases.map(line)].join('\n');
    const tag = ['tally', 'busy', 'marg'].includes(flavour) ? flavour : 'tally';
    return { csv, filename: `${tag}-daybook-${start}-to-${end}.csv`, flavour: tag, rows: sales.length + purchases.length };
  }
}
