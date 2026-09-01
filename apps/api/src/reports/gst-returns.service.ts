import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import {
  inPeriod,
  isGstin,
  monthRange,
  normalizeGstin,
  normalizeInvoiceNo,
  roundMoney,
} from '../common/gst-returns';
import { SalesService } from '../sales/sales.service';
import { PurchaseService } from '../purchase/purchase.service';
import { BusinessExpense } from '../ice-crest/entities/business-expense.entity';
import { Vendor } from '../purchase/entities/vendor.entity';
import { Gstr2aInvoice } from './entities/gstr2a-invoice.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';

type BooksRow = {
  source: 'expense' | 'purchase_order';
  id: string;
  supplier_gstin: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  invoice_value: number;
};

@Injectable()
export class GstReturnsService {
  constructor(
    private readonly salesService: SalesService,
    private readonly purchaseService: PurchaseService,
    @InjectRepository(BusinessExpense)
    private readonly expenseRepo: Repository<BusinessExpense>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Gstr2aInvoice)
    private readonly gstr2aRepo: Repository<Gstr2aInvoice>,
  ) {}

  async getGstr1(ctx: TenantContext, period: string, companyId?: string) {
    const { from, to } = this.periodOrThrow(period);
    const invoices = (await this.salesService.findInvoices(ctx)).filter((inv) => {
      if (['draft', 'cancelled', 'void'].includes(inv.status)) return false;
      if (companyId && inv.company_id !== companyId) return false;
      return inPeriod(inv.invoice_date, from, to);
    });
    const creditNotes = (await this.salesService.findCreditNotes(ctx)).filter((cn) => {
      if (cn.status === 'cancelled' || cn.status === 'void') return false;
      if (companyId && cn.company_id !== companyId) return false;
      return inPeriod(cn.note_date, from, to);
    });

    const b2b: Array<Record<string, unknown>> = [];
    const b2c: Array<Record<string, unknown>> = [];
    const hsnMap = new Map<string, { hsn_sac: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; invoices: number }>();
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const inv of invoices) {
      const sums = this.invoiceTax(inv);
      taxable += sums.taxable;
      cgst += sums.cgst;
      sgst += sums.sgst;
      igst += sums.igst;
      const gstin = normalizeGstin(inv.customer?.gstin);
      const row = {
        invoice_id: inv.id,
        invoice_number: inv.number,
        invoice_date: new Date(inv.invoice_date).toISOString().slice(0, 10),
        customer: inv.customer?.name || inv.vendor?.name || '—',
        gstin: gstin || '',
        taxable_value: sums.taxable,
        cgst: sums.cgst,
        sgst: sums.sgst,
        igst: sums.igst,
        invoice_value: roundMoney(Number(inv.total)),
        place_of_supply: this.placeOfSupply(inv),
      };
      if (isGstin(gstin)) b2b.push(row);
      else b2c.push(row);
      for (const line of inv.lines ?? []) {
        const hsn = line.hsn_sac || 'N/A';
        const cur = hsnMap.get(hsn) ?? { hsn_sac: hsn, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, invoices: 0 };
        cur.qty += Number(line.qty || 0);
        cur.taxable += Number(line.taxable_value || 0);
        cur.cgst += Number(line.cgst_amount || 0);
        cur.sgst += Number(line.sgst_amount || 0);
        cur.igst += Number(line.igst_amount || 0);
        cur.invoices += 1;
        hsnMap.set(hsn, cur);
      }
    }

    const cdnr = creditNotes.map((cn) => ({
      note_number: cn.number,
      note_date: new Date(cn.note_date).toISOString().slice(0, 10),
      invoice_number: cn.invoice?.number ?? '',
      amount: roundMoney(Number(cn.amount)),
      reason: cn.reason ?? '',
    }));

    return {
      period,
      from,
      to,
      summary: {
        invoice_count: invoices.length,
        b2b_count: b2b.length,
        b2c_count: b2c.length,
        credit_note_count: cdnr.length,
        taxable_value: roundMoney(taxable),
        cgst: roundMoney(cgst),
        sgst: roundMoney(sgst),
        igst: roundMoney(igst),
        invoice_value: roundMoney(invoices.reduce((s, i) => s + Number(i.total), 0)),
        credit_note_value: roundMoney(cdnr.reduce((s, r) => s + r.amount, 0)),
      },
      documents: [
        { nature: 'Invoices', count: invoices.length, cancelled: 0 },
        { nature: 'Credit notes', count: cdnr.length, cancelled: 0 },
      ],
      b2b,
      b2c,
      hsn: Array.from(hsnMap.values()).map((r) => ({
        ...r,
        qty: roundMoney(r.qty),
        taxable: roundMoney(r.taxable),
        cgst: roundMoney(r.cgst),
        sgst: roundMoney(r.sgst),
        igst: roundMoney(r.igst),
      })),
      cdnr,
    };
  }

  gstr1Csv(data: Awaited<ReturnType<GstReturnsService['getGstr1']>>): string {
    const lines = [
      'Section,GSTIN,Party,Doc No,Date,Taxable,CGST,SGST,IGST,Value,POS',
      ...data.b2b.map((r) => `B2B,${r.gstin},${csv(String(r.customer))},${r.invoice_number},${r.invoice_date},${r.taxable_value},${r.cgst},${r.sgst},${r.igst},${r.invoice_value},${r.place_of_supply}`),
      ...data.b2c.map((r) => `B2C,,${csv(String(r.customer))},${r.invoice_number},${r.invoice_date},${r.taxable_value},${r.cgst},${r.sgst},${r.igst},${r.invoice_value},${r.place_of_supply}`),
      ...data.cdnr.map((r) => `CDNR,,${csv(r.reason)},${r.note_number},${r.note_date},,,,,${r.amount},`),
      '',
      'HSN,Qty,Taxable,CGST,SGST,IGST',
      ...data.hsn.map((r) => `${r.hsn_sac},${r.qty},${r.taxable},${r.cgst},${r.sgst},${r.igst}`),
    ];
    return lines.join('\n');
  }

  async uploadGstr2a(
    ctx: TenantContext,
    body: { period: string; company_id?: string; json?: unknown; csv?: string; invoices?: Array<Record<string, unknown>> },
  ) {
    if (!ctx.tenantId) throw new BadRequestException('Tenant required');
    const { from } = this.periodOrThrow(body.period);
    const parsed = [
      ...this.parsePortalJson(body.json, body.period),
      ...this.parseCsv(body.csv, body.period),
      ...this.parseRows(body.invoices, body.period),
    ].filter((row): row is NonNullable<typeof row> => row != null);
    if (!parsed.length) throw new BadRequestException('No GSTR-2A invoices found. Paste GST portal JSON or a CSV with supplier GSTIN and invoice number.');
    await this.gstr2aRepo.delete({ tenant_id: ctx.tenantId, period: body.period });
    const saved = await this.gstr2aRepo.save(
      parsed.map((row) =>
        this.gstr2aRepo.create({
          tenant_id: ctx.tenantId!,
          company_id: body.company_id ?? null,
          period: body.period,
          supplier_gstin: row.supplier_gstin,
          invoice_number: row.invoice_number,
          invoice_date: row.invoice_date || from,
          taxable_value: row.taxable_value.toFixed(2),
          cgst: row.cgst.toFixed(2),
          sgst: row.sgst.toFixed(2),
          igst: row.igst.toFixed(2),
          invoice_value: row.invoice_value.toFixed(2),
          source_table: row.source_table,
        }),
      ),
    );
    return { period: body.period, uploaded: saved.length };
  }

  async reconcileGstr2a(ctx: TenantContext, period: string, companyId?: string) {
    if (!ctx.tenantId) throw new BadRequestException('Tenant required');
    const { from, to } = this.periodOrThrow(period);
    const portal = await this.gstr2aRepo.find({ where: { tenant_id: ctx.tenantId, period } });
    const books = await this.booksPurchases(ctx, from, to, companyId);

    const portalMap = new Map<string, typeof portal[number]>();
    for (const row of portal) portalMap.set(this.matchKey(row.supplier_gstin, row.invoice_number), row);
    const booksMap = new Map<string, BooksRow>();
    for (const row of books) booksMap.set(this.matchKey(row.supplier_gstin, row.invoice_number), row);

    const matched: Array<Record<string, unknown>> = [];
    const mismatch: Array<Record<string, unknown>> = [];
    const inBooksOnly: BooksRow[] = [];
    const in2aOnly: Array<Record<string, unknown>> = [];

    for (const [key, book] of booksMap) {
      const twoA = portalMap.get(key);
      if (!twoA) {
        inBooksOnly.push(book);
        continue;
      }
      const portalTaxable = Number(twoA.taxable_value);
      const portalValue = Number(twoA.invoice_value);
      const ok =
        Math.abs(portalTaxable - book.taxable_value) <= 1 &&
        Math.abs(portalValue - book.invoice_value) <= 1;
      const row = {
        ...book,
        portal_taxable: portalTaxable,
        portal_value: portalValue,
        portal_cgst: Number(twoA.cgst),
        portal_sgst: Number(twoA.sgst),
        portal_igst: Number(twoA.igst),
      };
      if (ok) matched.push(row);
      else mismatch.push(row);
    }
    for (const [key, twoA] of portalMap) {
      if (booksMap.has(key)) continue;
      in2aOnly.push({
        supplier_gstin: twoA.supplier_gstin,
        invoice_number: twoA.invoice_number,
        invoice_date: new Date(twoA.invoice_date).toISOString().slice(0, 10),
        taxable_value: Number(twoA.taxable_value),
        invoice_value: Number(twoA.invoice_value),
        cgst: Number(twoA.cgst),
        sgst: Number(twoA.sgst),
        igst: Number(twoA.igst),
      });
    }

    return {
      period,
      from,
      to,
      uploaded: portal.length,
      books: books.length,
      summary: {
        matched: matched.length,
        amount_mismatch: mismatch.length,
        in_books_not_in_2a: inBooksOnly.length,
        in_2a_not_in_books: in2aOnly.length,
      },
      matched,
      mismatch,
      in_books_not_in_2a: inBooksOnly,
      in_2a_not_in_books: in2aOnly,
    };
  }

  private async booksPurchases(ctx: TenantContext, from: string, to: string, companyId?: string): Promise<BooksRow[]> {
    const tenantId = ctx.tenantId!;
    const vendors = await this.vendorRepo.find({ where: { tenant_id: tenantId } });
    const vendorById = new Map(vendors.map((v) => [v.id, v]));
    const rows: BooksRow[] = [];

    const expenses = await this.expenseRepo
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.expense_date >= :from', { from })
      .andWhere('e.expense_date <= :to', { to })
      .getMany();
    for (const e of expenses) {
      if (companyId && e.company_id && e.company_id !== companyId) continue;
      const vendor = e.vendor_id ? vendorById.get(e.vendor_id) : undefined;
      const gstin = normalizeGstin(vendor?.gstin);
      if (!isGstin(gstin) || Number(e.gst_amount) <= 0) continue;
      const gst = roundMoney(Number(e.gst_amount));
      rows.push({
        source: 'expense',
        id: e.id,
        supplier_gstin: gstin,
        supplier_name: vendor?.name || 'Vendor',
        invoice_number: e.invoice_number || e.expense_number || e.id.slice(0, 8),
        invoice_date: new Date(e.expense_date).toISOString().slice(0, 10),
        taxable_value: roundMoney(Number(e.taxable_amount)),
        cgst: roundMoney(gst / 2),
        sgst: roundMoney(gst / 2),
        igst: 0,
        invoice_value: roundMoney(Number(e.amount)),
      });
    }

    const orders = await this.purchaseService.findPurchaseOrders(ctx);
    for (const o of orders) {
      if (['draft', 'cancelled'].includes(o.status)) continue;
      if (companyId && o.company_id !== companyId) continue;
      if (!inPeriod(o.order_date, from, to)) continue;
      const gstin = normalizeGstin(o.vendor?.gstin);
      if (!isGstin(gstin) || Number(o.tax_amount) <= 0) continue;
      const tax = roundMoney(Number(o.tax_amount));
      const total = roundMoney(Number(o.total));
      rows.push({
        source: 'purchase_order',
        id: o.id,
        supplier_gstin: gstin,
        supplier_name: o.vendor?.name || 'Vendor',
        invoice_number: o.number,
        invoice_date: new Date(o.order_date).toISOString().slice(0, 10),
        taxable_value: roundMoney(total - tax),
        cgst: roundMoney(tax / 2),
        sgst: roundMoney(tax / 2),
        igst: 0,
        invoice_value: total,
      });
    }
    return rows;
  }

  private invoiceTax(inv: SalesInvoice) {
    const lines = inv.lines ?? [];
    if (lines.length) {
      return {
        taxable: roundMoney(lines.reduce((s, l) => s + Number(l.taxable_value || 0), 0)),
        cgst: roundMoney(lines.reduce((s, l) => s + Number(l.cgst_amount || 0), 0)),
        sgst: roundMoney(lines.reduce((s, l) => s + Number(l.sgst_amount || 0), 0)),
        igst: roundMoney(lines.reduce((s, l) => s + Number(l.igst_amount || 0), 0)),
      };
    }
    return {
      taxable: roundMoney(Number(inv.subtotal || 0)),
      cgst: 0,
      sgst: 0,
      igst: roundMoney(Number(inv.tax_amount || 0)),
    };
  }

  private placeOfSupply(inv: SalesInvoice): string {
    const addr = (inv.customer?.address || {}) as Record<string, unknown>;
    const state = typeof addr.state === 'string' ? addr.state : '';
    const code = typeof addr.state_code === 'string' ? addr.state_code : '';
    if (code && state) return `${code}-${state}`;
    const gstin = normalizeGstin(inv.customer?.gstin || inv.company?.gstin);
    if (gstin.length >= 2) return gstin.slice(0, 2);
    return '';
  }

  private periodOrThrow(period: string) {
    try {
      return monthRange(period);
    } catch {
      throw new BadRequestException('Period must be YYYY-MM (example: 2026-04)');
    }
  }

  private matchKey(gstin: string, invoiceNumber: string) {
    return `${normalizeGstin(gstin)}|${normalizeInvoiceNo(invoiceNumber)}`;
  }

  private parseRows(
    rows: Array<Record<string, unknown>> | undefined,
    period: string,
  ): Array<ReturnType<GstReturnsService['normalizeRow']>> {
    return (rows ?? []).map((r) => this.normalizeRow(r, period)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  }

  private parseCsv(csv: string | undefined, period: string) {
    if (!csv?.trim()) return [];
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const idx = (names: string[]) => names.reduce((found, n) => (found >= 0 ? found : header.indexOf(n)), -1);
    const gstinI = idx(['supplier_gstin', 'gstin', 'ctin']);
    const numI = idx(['invoice_number', 'inum', 'invoice no', 'invoice']);
    const dateI = idx(['invoice_date', 'idt', 'date']);
    const taxI = idx(['taxable', 'taxable_value', 'txval']);
    const cgstI = idx(['cgst', 'camt']);
    const sgstI = idx(['sgst', 'samt']);
    const igstI = idx(['igst', 'iamt']);
    const valI = idx(['invoice_value', 'val', 'total']);
    const out = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const row = this.normalizeRow(
        {
          supplier_gstin: gstinI >= 0 ? cols[gstinI] : '',
          invoice_number: numI >= 0 ? cols[numI] : '',
          invoice_date: dateI >= 0 ? cols[dateI] : '',
          taxable_value: taxI >= 0 ? cols[taxI] : 0,
          cgst: cgstI >= 0 ? cols[cgstI] : 0,
          sgst: sgstI >= 0 ? cols[sgstI] : 0,
          igst: igstI >= 0 ? cols[igstI] : 0,
          invoice_value: valI >= 0 ? cols[valI] : 0,
        },
        period,
      );
      if (row) out.push(row);
    }
    return out;
  }

  private parsePortalJson(json: unknown, period: string) {
    if (!json || typeof json !== 'object') return [];
    const root = json as { b2b?: Array<{ ctin?: string; inv?: Array<Record<string, unknown>> }>; fp?: string };
    const out = [];
    for (const party of root.b2b ?? []) {
      for (const inv of party.inv ?? []) {
        const items = (inv.itms as Array<{ itm_det?: Record<string, number> }> | undefined) ?? [];
        const det = items.reduce(
          (s, it) => {
            const d = it.itm_det ?? {};
            s.taxable += Number(d.txval || 0);
            s.cgst += Number(d.camt || 0);
            s.sgst += Number(d.samt || 0);
            s.igst += Number(d.iamt || 0);
            return s;
          },
          { taxable: 0, cgst: 0, sgst: 0, igst: 0 },
        );
        const row = this.normalizeRow(
          {
            supplier_gstin: party.ctin,
            invoice_number: inv.inum,
            invoice_date: inv.idt,
            taxable_value: det.taxable,
            cgst: det.cgst,
            sgst: det.sgst,
            igst: det.igst,
            invoice_value: inv.val ?? det.taxable + det.cgst + det.sgst + det.igst,
          },
          period,
        );
        if (row) out.push(row);
      }
    }
    return out;
  }

  private normalizeRow(raw: Record<string, unknown>, period: string) {
    const gstin = normalizeGstin(String(raw.supplier_gstin || raw.gstin || raw.ctin || ''));
    const invoice_number = String(raw.invoice_number || raw.inum || '').trim();
    if (!gstin || !invoice_number) return null;
    const dateRaw = String(raw.invoice_date || raw.idt || `${period}-01`);
    const invoice_date = this.parseDate(dateRaw, period);
    const taxable_value = roundMoney(Number(raw.taxable_value ?? raw.txval ?? 0));
    const cgst = roundMoney(Number(raw.cgst ?? raw.camt ?? 0));
    const sgst = roundMoney(Number(raw.sgst ?? raw.samt ?? 0));
    const igst = roundMoney(Number(raw.igst ?? raw.iamt ?? 0));
    const invoice_value = roundMoney(Number(raw.invoice_value ?? raw.val ?? taxable_value + cgst + sgst + igst));
    return { supplier_gstin: gstin, invoice_number, invoice_date, taxable_value, cgst, sgst, igst, invoice_value, source_table: 'b2b' as const };
  }

  private parseDate(value: string, period: string): string {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(value);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const dmy2 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
    if (dmy2) return `${dmy2[3]}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
    return `${period}-01`;
  }
}

function csv(value: string): string {
  if (value.includes(',') || value.includes('"')) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
