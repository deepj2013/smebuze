import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { InvoicePayment } from './entities/invoice-payment.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { DeliveryChallan } from './entities/delivery-challan.entity';
import { DeliveryChallanLine } from './entities/delivery-challan-line.entity';
import { InvoiceDeliveryChallan } from './entities/invoice-delivery-challan.entity';
import { CreditNote } from './entities/credit-note.entity';
import { RecurringInvoice } from './entities/recurring-invoice.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Vendor } from '../purchase/entities/vendor.entity';
import { Company } from '../tenant/entities/company.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { InventoryService } from '../inventory/inventory.service';
import { TenantContext } from '../common/tenant-context';
import { CreateInvoiceDto, CreateInvoiceLineDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesInvoice)
    private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(SalesInvoiceLine)
    private readonly lineRepo: Repository<SalesInvoiceLine>,
    @InjectRepository(InvoicePayment)
    private readonly paymentRepo: Repository<InvoicePayment>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly quotationItemRepo: Repository<QuotationItem>,
    @InjectRepository(SalesOrder)
    private readonly salesOrderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly salesOrderLineRepo: Repository<SalesOrderLine>,
    @InjectRepository(DeliveryChallan)
    private readonly deliveryChallanRepo: Repository<DeliveryChallan>,
    @InjectRepository(DeliveryChallanLine)
    private readonly deliveryChallanLineRepo: Repository<DeliveryChallanLine>,
    @InjectRepository(InvoiceDeliveryChallan)
    private readonly invoiceDeliveryChallanRepo: Repository<InvoiceDeliveryChallan>,
    @InjectRepository(CreditNote)
    private readonly creditNoteRepo: Repository<CreditNote>,
    @InjectRepository(RecurringInvoice)
    private readonly recurringInvoiceRepo: Repository<RecurringInvoice>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly inventoryService: InventoryService,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createInvoice(dto: CreateInvoiceDto, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    if (!dto.customer_id && !dto.vendor_id) {
      throw new ForbiddenException('Provide either customer_id or vendor_id (buyer).');
    }
    if (dto.customer_id && dto.vendor_id) {
      throw new ForbiddenException('Provide only one of customer_id or vendor_id.');
    }

    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');

    let customerId: string | null = null;
    let vendorId: string | null = null;
    if (dto.customer_id) {
      const customer = await this.customerRepo.findOne({ where: { id: dto.customer_id, tenant_id: tenantId } });
      if (!customer) throw new NotFoundException('Customer not found');
      customerId = dto.customer_id;
      const creditLimit = parseFloat(customer.credit_limit || '0');
      if (creditLimit > 0) {
        let draftTotal = 0;
        for (const line of dto.lines) {
          const taxable = line.qty * line.rate;
          const cgst = taxable * ((line.cgst_rate ?? 0) / 100);
          const sgst = taxable * ((line.sgst_rate ?? 0) / 100);
          const igst = taxable * (((line as { igst_rate?: number }).igst_rate ?? 0) / 100);
          draftTotal += taxable + cgst + sgst + igst;
        }
        const pendingInvoices = await this.invoiceRepo.find({ where: { tenant_id: tenantId, customer_id: customerId } });
        const currentExposure = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total) - parseFloat(inv.paid_amount), 0);
        if (currentExposure + draftTotal > creditLimit) {
          throw new ForbiddenException(`Invoice total (₹${draftTotal.toFixed(2)}) would exceed customer credit limit (₹${creditLimit.toFixed(2)}). Current exposure: ₹${currentExposure.toFixed(2)}.`);
        }
      }
    } else {
      const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendor_id!, tenant_id: tenantId } });
      if (!vendor) throw new NotFoundException('Vendor not found');
      vendorId = dto.vendor_id!;
    }

    const number = dto.number ?? `INV-${Date.now()}`;
    const invoice = this.invoiceRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      customer_id: customerId,
      vendor_id: vendorId,
      number,
      invoice_date: new Date(dto.invoice_date),
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      status: 'issued',
      subtotal: '0',
      tax_amount: '0',
      total: '0',
      paid_amount: '0',
      created_by: ctx.userId,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    let subtotal = 0;
    let taxAmount = 0;
    for (let i = 0; i < dto.lines.length; i++) {
      const lineDto = dto.lines[i];
      const taxableValue = lineDto.qty * lineDto.rate;
      const cgstRate = lineDto.cgst_rate ?? 0;
      const sgstRate = lineDto.sgst_rate ?? 0;
      const igstRate = lineDto.igst_rate ?? 0;
      const cgstAmount = (taxableValue * cgstRate) / 100;
      const sgstAmount = (taxableValue * sgstRate) / 100;
      const igstAmount = (taxableValue * igstRate) / 100;
      subtotal += taxableValue;
      taxAmount += cgstAmount + sgstAmount + igstAmount;

      const line = this.lineRepo.create({
        invoice_id: savedInvoice.id,
        item_id: lineDto.item_id ?? null,
        hsn_sac: lineDto.hsn_sac,
        description: lineDto.description,
        qty: String(lineDto.qty),
        unit: lineDto.unit ?? 'pcs',
        rate: String(lineDto.rate),
        taxable_value: String(taxableValue.toFixed(2)),
        cgst_rate: String(cgstRate),
        cgst_amount: String(cgstAmount.toFixed(2)),
        sgst_rate: String(sgstRate),
        sgst_amount: String(sgstAmount.toFixed(2)),
        igst_rate: String(igstRate),
        igst_amount: String(igstAmount.toFixed(2)),
        sort_order: i,
      });
      await this.lineRepo.save(line);
    }

    const total = subtotal + taxAmount;
    await this.invoiceRepo.update(savedInvoice.id, {
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    });

    return this.invoiceRepo.findOne({
      where: { id: savedInvoice.id },
      relations: ['customer', 'vendor', 'company', 'lines'],
    }) as Promise<SalesInvoice>;
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['lines'],
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (parseFloat(invoice.paid_amount) > 0) {
      throw new ForbiddenException('Cannot edit invoice that has payments; adjust payments first.');
    }

    if (dto.company_id) {
      const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
      if (!company) throw new NotFoundException('Company not found');
      invoice.company_id = dto.company_id;
    }
    if (dto.branch_id !== undefined) invoice.branch_id = dto.branch_id || null;
    if (dto.customer_id !== undefined) {
      if (dto.customer_id) {
        const customer = await this.customerRepo.findOne({ where: { id: dto.customer_id, tenant_id: tenantId } });
        if (!customer) throw new NotFoundException('Customer not found');
        invoice.customer_id = dto.customer_id;
        invoice.vendor_id = null;
      } else {
        invoice.customer_id = null;
      }
    }
    if (dto.vendor_id !== undefined) {
      if (dto.vendor_id) {
        const vendor = await this.vendorRepo.findOne({ where: { id: dto.vendor_id, tenant_id: tenantId } });
        if (!vendor) throw new NotFoundException('Vendor not found');
        invoice.vendor_id = dto.vendor_id;
        invoice.customer_id = null;
      } else {
        invoice.vendor_id = null;
      }
    }
    if (dto.invoice_date) invoice.invoice_date = new Date(dto.invoice_date);
    if (dto.due_date !== undefined) invoice.due_date = dto.due_date ? new Date(dto.due_date) : null;
    if (dto.number) invoice.number = dto.number;
    await this.invoiceRepo.save(invoice);

    if (dto.lines && dto.lines.length > 0) {
      await this.lineRepo.delete({ invoice_id: id });
      let subtotal = 0;
      let taxAmount = 0;
      const lineDtos = dto.lines as UpdateInvoiceLineDto[];
      for (let i = 0; i < lineDtos.length; i++) {
        const lineDto = lineDtos[i];
        const taxableValue = lineDto.qty * lineDto.rate;
        const cgstRate = lineDto.cgst_rate ?? 0;
        const sgstRate = lineDto.sgst_rate ?? 0;
        const igstRate = lineDto.igst_rate ?? 0;
        const cgstAmount = (taxableValue * cgstRate) / 100;
        const sgstAmount = (taxableValue * sgstRate) / 100;
        const igstAmount = (taxableValue * igstRate) / 100;
        subtotal += taxableValue;
        taxAmount += cgstAmount + sgstAmount + igstAmount;
        const line = this.lineRepo.create({
          invoice_id: id,
          item_id: lineDto.item_id ?? null,
          hsn_sac: lineDto.hsn_sac,
          description: lineDto.description,
          qty: String(lineDto.qty),
          unit: lineDto.unit ?? 'pcs',
          rate: String(lineDto.rate),
          taxable_value: String(taxableValue.toFixed(2)),
          cgst_rate: String(cgstRate),
          cgst_amount: String(cgstAmount.toFixed(2)),
          sgst_rate: String(sgstRate),
          sgst_amount: String(sgstAmount.toFixed(2)),
          igst_rate: String(igstRate),
          igst_amount: String(igstAmount.toFixed(2)),
          sort_order: i,
        });
        await this.lineRepo.save(line);
      }
      await this.invoiceRepo.update(id, {
        subtotal: subtotal.toFixed(2),
        tax_amount: taxAmount.toFixed(2),
        total: (subtotal + taxAmount).toFixed(2),
      });
    }

    return this.findOneInvoice(id, ctx);
  }

  async findInvoices(ctx: TenantContext, status?: string, customerId?: string): Promise<SalesInvoice[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string; customer_id?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    if (customerId) where.customer_id = customerId;
    return this.invoiceRepo.find({
      where,
      relations: ['customer', 'vendor', 'company', 'lines'],
      order: { invoice_date: 'DESC', created_at: 'DESC' },
    });
  }

  async findOneInvoice(id: string, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const inv = await this.invoiceRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['customer', 'vendor', 'company', 'branch', 'lines'],
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const total = parseFloat(invoice.total);
    const paid = parseFloat(invoice.paid_amount);
    const newPaid = paid + dto.amount;
    if (newPaid > total) throw new ForbiddenException('Payment exceeds invoice total');

    await this.paymentRepo.save(
      this.paymentRepo.create({
        invoice_id: invoiceId,
        amount: String(dto.amount),
        payment_date: new Date(dto.payment_date),
        mode: dto.mode ?? 'cash',
        reference: dto.reference ?? null,
      }),
    );
    await this.invoiceRepo.update(invoiceId, {
      paid_amount: newPaid.toFixed(2),
      status: newPaid >= total ? 'paid' : 'partial',
    });
    return this.findOneInvoice(invoiceId, ctx);
  }

  async createPaymentLink(invoiceId: string, ctx: TenantContext): Promise<{ enabled: boolean; url?: string }> {
    const invoice = await this.findOneInvoice(invoiceId, ctx);
    const enabled = process.env.PAYMENT_GATEWAY_ENABLED === 'true';
    if (!enabled) return { enabled: false };
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001';
    const url = `${baseUrl}/payments?invoice_id=${invoiceId}&amount=${invoice.total}`;
    return { enabled: true, url };
  }

  async recordPaymentByInvoiceId(invoiceId: string, amount: number, reference?: string): Promise<SalesInvoice | null> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) return null;
    const total = parseFloat(invoice.total);
    const paid = parseFloat(invoice.paid_amount);
    const newPaid = paid + amount;
    if (newPaid > total) return null;
    await this.paymentRepo.save(
      this.paymentRepo.create({
        invoice_id: invoiceId,
        amount: String(amount),
        payment_date: new Date(),
        mode: 'gateway',
        reference: reference ?? null,
      }),
    );
    await this.invoiceRepo.update(invoiceId, {
      paid_amount: newPaid.toFixed(2),
      status: newPaid >= total ? 'paid' : 'partial',
    });
    return this.invoiceRepo.findOne({ where: { id: invoiceId }, relations: ['customer', 'vendor', 'company', 'lines'] }) as Promise<SalesInvoice>;
  }

  async getPendingInvoices(ctx: TenantContext): Promise<{ invoices: SalesInvoice[]; totalPending: number }> {
    const tenantId = this.assertTenantId(ctx);
    const invoices = await this.invoiceRepo.find({
      where: { tenant_id: tenantId },
      relations: ['customer', 'vendor'],
      order: { due_date: 'ASC' },
    });
    const pending = invoices.filter((inv) => parseFloat(inv.paid_amount) < parseFloat(inv.total));
    const totalPending = pending.reduce(
      (sum, inv) => sum + (parseFloat(inv.total) - parseFloat(inv.paid_amount)),
      0,
    );
    return { invoices: pending, totalPending };
  }

  async createQuotation(
    dto: {
      company_id: string;
      branch_id?: string;
      customer_id?: string;
      lead_id?: string;
      number?: string;
      issue_date: string;
      valid_until?: string;
      lines: { item_id?: string; description?: string; qty: number; unit?: string; rate: number; tax_rate?: number }[];
    },
    ctx: TenantContext,
  ): Promise<Quotation> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const number = dto.number ?? `QT-${Date.now()}`;
    const quotation = this.quotationRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      customer_id: dto.customer_id ?? null,
      lead_id: dto.lead_id ?? null,
      number,
      issue_date: new Date(dto.issue_date),
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null,
      status: 'draft',
      total: '0',
      tax_amount: '0',
      created_by: ctx.userId,
    });
    const saved = await this.quotationRepo.save(quotation);
    let total = 0;
    let taxAmount = 0;
    for (let i = 0; i < dto.lines.length; i++) {
      const l = dto.lines[i];
      const amount = l.qty * l.rate;
      const tax = amount * ((l.tax_rate ?? 0) / 100);
      total += amount + tax;
      taxAmount += tax;
      await this.quotationItemRepo.save(
        this.quotationItemRepo.create({
          quotation_id: saved.id,
          item_id: l.item_id ?? null,
          description: l.description ?? null,
          qty: String(l.qty),
          unit: l.unit ?? 'pcs',
          rate: String(l.rate),
          amount: amount.toFixed(2),
          tax_rate: String(l.tax_rate ?? 0),
          sort_order: i,
        }),
      );
    }
    await this.quotationRepo.update(saved.id, { total: total.toFixed(2), tax_amount: taxAmount.toFixed(2) });
    return this.quotationRepo.findOne({ where: { id: saved.id }, relations: ['items', 'customer', 'company', 'lead'] }) as Promise<Quotation>;
  }

  async updateQuotation(
    id: string,
    dto: { sent_at?: string; status?: string; lead_id?: string | null; customer_id?: string | null },
    ctx: TenantContext,
  ): Promise<Quotation> {
    const tenantId = this.assertTenantId(ctx);
    const q = await this.quotationRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!q) throw new NotFoundException('Quotation not found');
    if (dto.sent_at !== undefined) q.sent_at = dto.sent_at ? new Date(dto.sent_at) : null;
    if (dto.status !== undefined) q.status = dto.status;
    if (dto.lead_id !== undefined) q.lead_id = dto.lead_id ?? null;
    if (dto.customer_id !== undefined) q.customer_id = dto.customer_id ?? null;
    await this.quotationRepo.save(q);
    return this.findOneQuotation(id, ctx);
  }

  async findQuotations(ctx: TenantContext, status?: string): Promise<Quotation[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.quotationRepo.find({ where, relations: ['customer', 'company', 'lead'], order: { issue_date: 'DESC' } });
  }

  async findOneQuotation(id: string, ctx: TenantContext): Promise<Quotation> {
    const tenantId = this.assertTenantId(ctx);
    const q = await this.quotationRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['items', 'customer', 'company', 'lead'] });
    if (!q) throw new NotFoundException('Quotation not found');
    return q;
  }

  async createSalesOrder(
    dto: {
      company_id: string;
      branch_id?: string;
      customer_id?: string;
      quotation_id?: string;
      number?: string;
      order_date: string;
      lines?: { item_id?: string; description?: string; qty: number; unit?: string; rate: number }[];
    },
    ctx: TenantContext,
  ): Promise<SalesOrder> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const number = dto.number ?? `SO-${Date.now()}`;
    let total = 0;
    if (dto.lines?.length) {
      for (const l of dto.lines) total += (l.qty ?? 0) * (l.rate ?? 0);
    }
    const order = this.salesOrderRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      customer_id: dto.customer_id ?? null,
      quotation_id: dto.quotation_id ?? null,
      number,
      order_date: new Date(dto.order_date),
      status: 'draft',
      total: String(total.toFixed(2)),
      tax_amount: '0',
      created_by: ctx.userId,
    });
    const saved = await this.salesOrderRepo.save(order);
    if (dto.lines?.length) {
      for (let i = 0; i < dto.lines.length; i++) {
        const row = dto.lines[i];
        const line = this.salesOrderLineRepo.create({
          sales_order_id: saved.id,
          item_id: row.item_id ?? null,
          description: row.description ?? null,
          quantity: String(row.qty ?? 0),
          unit: row.unit ?? 'pcs',
          rate: String(row.rate ?? 0),
          sort_order: i,
        });
        await this.salesOrderLineRepo.save(line);
      }
    }
    return this.findOneSalesOrder(saved.id, ctx);
  }

  async updateSalesOrder(
    id: string,
    dto: {
      status?: string;
      lines?: Array<{ item_id?: string | null; description?: string; qty: number; unit?: string; rate: number; sort_order?: number }>;
    },
    ctx: TenantContext,
  ): Promise<SalesOrder> {
    const tenantId = this.assertTenantId(ctx);
    const order = await this.salesOrderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (dto.status != null) order.status = dto.status;
    if (dto.lines && Array.isArray(dto.lines)) {
      await this.salesOrderLineRepo.delete({ sales_order_id: id });
      let total = 0;
      for (let i = 0; i < dto.lines.length; i++) {
        const row = dto.lines[i];
        const line = this.salesOrderLineRepo.create({
          sales_order_id: id,
          item_id: row.item_id ?? null,
          description: row.description ?? null,
          quantity: String(row.qty ?? 0),
          unit: row.unit ?? 'pcs',
          rate: String(row.rate ?? 0),
          sort_order: row.sort_order ?? i,
        });
        await this.salesOrderLineRepo.save(line);
        total += (row.qty ?? 0) * (row.rate ?? 0);
      }
      order.total = String(total.toFixed(2));
      await this.salesOrderRepo.save(order);
    }
    return this.findOneSalesOrder(id, ctx);
  }

  async findSalesOrders(ctx: TenantContext, status?: string, customer_id?: string): Promise<SalesOrder[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string; customer_id?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    return this.salesOrderRepo.find({ where, relations: ['customer', 'company', 'lines', 'lines.item'], order: { order_date: 'DESC', created_at: 'DESC' } });
  }

  async findOneSalesOrder(id: string, ctx: TenantContext): Promise<SalesOrder> {
    const tenantId = this.assertTenantId(ctx);
    const o = await this.salesOrderRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['customer', 'company', 'quotation', 'lines', 'lines.item'] });
    if (!o) throw new NotFoundException('Sales order not found');
    return o;
  }

  /** Requirement vs delivery: orders with lines and delivered qty per line (from delivery challans linked to this order). */
  async getRequirementVsDelivery(ctx: TenantContext, customer_id?: string): Promise<
    Array<{
      order: SalesOrder;
      lines: Array<{ line: SalesOrderLine; delivered_qty: number; pending_qty: number }>;
    }>
  > {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; customer_id?: string } = { tenant_id: tenantId };
    if (customer_id) where.customer_id = customer_id;
    const orders = await this.salesOrderRepo.find({
      where,
      relations: ['customer', 'company', 'lines', 'lines.item'],
      order: { order_date: 'DESC', created_at: 'DESC' },
    });
    const result: Array<{ order: SalesOrder; lines: Array<{ line: SalesOrderLine; delivered_qty: number; pending_qty: number }> }> = [];
    for (const order of orders) {
      const linesWithDelivery: Array<{ line: SalesOrderLine; delivered_qty: number; pending_qty: number }> = [];
      for (const line of order.lines || []) {
        const reqQty = parseFloat(line.quantity) || 0;
        const challans = await this.deliveryChallanRepo.find({ where: { order_id: order.id }, relations: ['lines'] });
        let delivered = 0;
        for (const dc of challans) {
          for (const dcl of dc.lines || []) {
            if (dcl.item_id && dcl.item_id === line.item_id) delivered += parseFloat(dcl.quantity) || 0;
            else if (!dcl.item_id && dcl.description && line.description && dcl.description === line.description) delivered += parseFloat(dcl.quantity) || 0;
          }
        }
        linesWithDelivery.push({ line, delivered_qty: delivered, pending_qty: Math.max(0, reqQty - delivered) });
      }
      result.push({ order, lines: linesWithDelivery });
    }
    return result;
  }

  /** Pending requirements by customer (orders with at least one line having pending_qty > 0). For delivery entry. */
  async getPendingRequirementsByCustomer(ctx: TenantContext): Promise<
    Array<{ customer_id: string; customer_name: string; orders: Array<{ order: SalesOrder; pending_lines: Array<{ line: SalesOrderLine; delivered_qty: number; pending_qty: number }> }> }>
  > {
    const data = await this.getRequirementVsDelivery(ctx);
    const byCustomer = new Map<string, { customer_name: string; orders: Array<{ order: SalesOrder; pending_lines: Array<{ line: SalesOrderLine; delivered_qty: number; pending_qty: number }> }> }>();
    for (const { order, lines } of data) {
      const pending = lines.filter((l) => l.pending_qty > 0);
      if (pending.length === 0 || !order.customer_id) continue;
      const name = (order.customer as Customer)?.name ?? 'Customer';
      if (!byCustomer.has(order.customer_id)) {
        byCustomer.set(order.customer_id, { customer_name: name, orders: [] });
      }
      byCustomer.get(order.customer_id)!.orders.push({ order, pending_lines: pending });
    }
    return Array.from(byCustomer.entries()).map(([customer_id, v]) => ({ customer_id, customer_name: v.customer_name, orders: v.orders }));
  }

  /** Delivered quantity by item in a date range (from delivery challan lines). For stock-vs-delivery report. */
  async getDeliveredByItem(ctx: TenantContext, from?: string, to?: string): Promise<Array<{ item_id: string; item_name: string; quantity_delivered: number }>> {
    const tenantId = this.assertTenantId(ctx);
    const qb = this.deliveryChallanLineRepo
      .createQueryBuilder('dcl')
      .innerJoin('dcl.deliveryChallan', 'dc')
      .leftJoin('dcl.item', 'item')
      .where('dc.tenant_id = :tenantId', { tenantId })
      .andWhere('dcl.item_id IS NOT NULL');
    if (from) qb.andWhere('dc.challan_date >= :from', { from });
    if (to) qb.andWhere('dc.challan_date <= :to', { to });
    const lines = await qb.select(['dcl.item_id', 'dcl.quantity', 'item.name']).getRawMany();
    const byItem: Record<string, { item_id: string; item_name: string; quantity_delivered: number }> = {};
    for (const row of lines) {
      const id = row.dcl_item_id as string;
      const name = (row.item_name as string) ?? 'Item';
      const qty = parseFloat(row.dcl_quantity) || 0;
      if (!byItem[id]) byItem[id] = { item_id: id, item_name: name, quantity_delivered: 0 };
      byItem[id].quantity_delivered += qty;
    }
    return Object.values(byItem).map((r) => ({ ...r, quantity_delivered: Math.round(r.quantity_delivered * 10000) / 10000 }));
  }

  async createDeliveryChallan(
    dto: { company_id: string; branch_id?: string; customer_id?: string; order_id?: string; invoice_id?: string; number?: string; challan_date: string },
    ctx: TenantContext,
  ): Promise<DeliveryChallan> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const number = dto.number ?? `DC-${Date.now()}`;
    const challan = this.deliveryChallanRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      customer_id: dto.customer_id ?? null,
      order_id: dto.order_id ?? null,
      invoice_id: dto.invoice_id ?? null,
      number,
      challan_date: new Date(dto.challan_date),
      status: 'draft',
      created_by: ctx.userId,
    });
    return this.deliveryChallanRepo.save(challan);
  }

  async findDeliveryChallans(
    ctx: TenantContext,
    status?: string,
    customer_id?: string,
    from_date?: string,
    to_date?: string,
    not_invoiced?: boolean,
  ): Promise<DeliveryChallan[]> {
    const tenantId = this.assertTenantId(ctx);
    const qb = this.deliveryChallanRepo
      .createQueryBuilder('dc')
      .leftJoinAndSelect('dc.customer', 'customer')
      .leftJoinAndSelect('dc.company', 'company')
      .where('dc.tenant_id = :tenantId', { tenantId });
    if (status) qb.andWhere('dc.status = :status', { status });
    if (customer_id) qb.andWhere('dc.customer_id = :customer_id', { customer_id });
    if (from_date) qb.andWhere('dc.challan_date >= :from_date', { from_date });
    if (to_date) qb.andWhere('dc.challan_date <= :to_date', { to_date });
    if (not_invoiced) qb.andWhere('dc.invoice_id IS NULL');
    qb.orderBy('dc.challan_date', 'DESC');
    return qb.getMany();
  }

  async findOneDeliveryChallan(id: string, ctx: TenantContext): Promise<DeliveryChallan> {
    const tenantId = this.assertTenantId(ctx);
    const dc = await this.deliveryChallanRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['customer', 'company', 'order', 'invoice', 'lines', 'lines.item'],
    });
    if (!dc) throw new NotFoundException('Delivery challan not found');
    return dc;
  }

  async updateDeliveryChallan(
    id: string,
    dto: {
      status?: string;
      signed_challan_image_url?: string | null;
      lines?: Array<{ item_id?: string | null; description?: string; quantity: number; unit?: string; unit_price: number; sort_order?: number }>;
    },
    ctx: TenantContext,
  ): Promise<DeliveryChallan> {
    const tenantId = this.assertTenantId(ctx);
    const dc = await this.deliveryChallanRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!dc) throw new NotFoundException('Delivery challan not found');
    const previousStatus = (dc as { status?: string }).status;
    if (dto.status != null) dc.status = dto.status;
    if (dto.signed_challan_image_url !== undefined) dc.signed_challan_image_url = dto.signed_challan_image_url;
    await this.deliveryChallanRepo.save(dc);
    if (dto.lines && Array.isArray(dto.lines)) {
      await this.deliveryChallanLineRepo.delete({ delivery_challan_id: id });
      for (let i = 0; i < dto.lines.length; i++) {
        const row = dto.lines[i];
        const line = this.deliveryChallanLineRepo.create({
          delivery_challan_id: id,
          item_id: row.item_id ?? null,
          description: row.description ?? null,
          quantity: String(row.quantity),
          unit: row.unit ?? 'pcs',
          unit_price: String(row.unit_price),
          sort_order: row.sort_order ?? i,
        });
        await this.deliveryChallanLineRepo.save(line);
      }
    }
    // When challan is first marked delivered, deduct stock from default warehouse (Star ICE / restaurant_wholesale)
    if (dto.status === 'delivered' && previousStatus !== 'delivered') {
      const linesToDeduct = dto.lines?.length
        ? dto.lines
        : await this.deliveryChallanLineRepo.find({ where: { delivery_challan_id: id } });
      const warehouseId = await this.inventoryService.getDefaultWarehouse(ctx);
      if (warehouseId && linesToDeduct.length > 0) {
        for (const row of linesToDeduct) {
          const itemId = (row as { item_id?: string | null }).item_id ?? (row as { item_id?: string }).item_id;
          const qty = typeof (row as { quantity: string | number }).quantity === 'number'
            ? (row as { quantity: number }).quantity
            : parseFloat(String((row as { quantity: string }).quantity)) || 0;
          if (itemId && qty > 0) {
            try {
              await this.inventoryService.deductStock(ctx, warehouseId, itemId, qty);
            } catch {
              // Insufficient stock or no record; do not block challan update
            }
          }
        }
      }
    }
    return this.findOneDeliveryChallan(id, ctx);
  }

  async createInvoiceFromChallans(
    dto: {
      company_id: string;
      branch_id?: string;
      customer_id: string;
      challan_ids: string[];
      invoice_date: string;
      due_date?: string;
      number?: string;
    },
    ctx: TenantContext,
  ): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    if (!dto.challan_ids?.length) throw new ForbiddenException('Select at least one delivery challan.');
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const customer = await this.customerRepo.findOne({ where: { id: dto.customer_id, tenant_id: tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const challans = await this.deliveryChallanRepo.find({
      where: { id: In(dto.challan_ids), tenant_id: tenantId, customer_id: dto.customer_id },
      relations: ['lines', 'lines.item'],
    });
    if (challans.length !== dto.challan_ids.length) throw new NotFoundException('One or more delivery challans not found or customer mismatch.');

    const alreadyInvoiced = challans.filter((c) => c.invoice_id != null);
    if (alreadyInvoiced.length) throw new ForbiddenException('One or more challans are already linked to an invoice.');

    const aggregated = new Map<string, { qty: number; rate: number; hsn_sac: string; description: string; unit: string }>();
    for (const dc of challans) {
      for (const line of dc.lines || []) {
        const key = line.item_id ? String(line.item_id) : `desc-${line.description ?? 'unknown'}`;
        const qty = parseFloat(line.quantity) || 0;
        const rate = parseFloat(line.unit_price) || 0;
        const existing = aggregated.get(key);
        const item = line.item;
        const hsn = item?.hsn_sac ?? '22019010';
        const desc = (line.description || item?.name) ?? 'Item';
        const unit = line.unit ?? item?.unit ?? 'kg';
        if (existing) {
          existing.qty += qty;
          if (rate > 0) existing.rate = rate;
        } else {
          aggregated.set(key, { qty, rate, hsn_sac: hsn, description: desc, unit });
        }
      }
    }

    const number = dto.number ?? `INV-${Date.now()}`;
    const invoice = this.invoiceRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      customer_id: dto.customer_id,
      vendor_id: null,
      number,
      invoice_date: new Date(dto.invoice_date),
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      status: 'issued',
      subtotal: '0',
      tax_amount: '0',
      total: '0',
      paid_amount: '0',
      created_by: ctx.userId,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    const gstRate = 2.5;
    let subtotal = 0;
    let taxAmount = 0;
    let sortOrder = 0;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const [key, agg] of aggregated) {
      if (agg.qty <= 0) continue;
      const taxableValue = agg.qty * agg.rate;
      const cgst = (taxableValue * gstRate) / 100;
      const sgst = (taxableValue * gstRate) / 100;
      subtotal += taxableValue;
      taxAmount += cgst + sgst;
      const itemId = uuidRegex.test(key) ? key : null;
      await this.lineRepo.save(
        this.lineRepo.create({
          invoice_id: savedInvoice.id,
          item_id: itemId,
          hsn_sac: agg.hsn_sac,
          description: agg.description,
          qty: String(agg.qty),
          unit: agg.unit,
          rate: String(agg.rate),
          taxable_value: String(taxableValue.toFixed(2)),
          cgst_rate: String(gstRate),
          cgst_amount: String(cgst.toFixed(2)),
          sgst_rate: String(gstRate),
          sgst_amount: String(sgst.toFixed(2)),
          igst_rate: '0',
          igst_amount: '0',
          sort_order: sortOrder++,
        }),
      );
    }

    const total = subtotal + taxAmount;
    await this.invoiceRepo.update(savedInvoice.id, {
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    });

    for (const dc of challans) {
      await this.invoiceDeliveryChallanRepo.save(
        this.invoiceDeliveryChallanRepo.create({
          invoice_id: savedInvoice.id,
          delivery_challan_id: dc.id,
        }),
      );
      await this.deliveryChallanRepo.update(dc.id, { invoice_id: savedInvoice.id });
    }

    return this.invoiceRepo.findOne({
      where: { id: savedInvoice.id },
      relations: ['customer', 'company', 'lines'],
    }) as Promise<SalesInvoice>;
  }

  async createCreditNote(
    dto: { company_id: string; branch_id?: string; invoice_id: string; number?: string; note_date: string; amount: number; reason?: string },
    ctx: TenantContext,
  ): Promise<CreditNote> {
    const tenantId = this.assertTenantId(ctx);
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoice_id, tenant_id: tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const number = dto.number ?? `CN-${Date.now()}`;
    const note = this.creditNoteRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      branch_id: dto.branch_id ?? null,
      invoice_id: dto.invoice_id,
      number,
      note_date: new Date(dto.note_date),
      amount: String(dto.amount),
      reason: dto.reason ?? null,
      status: 'draft',
      created_by: ctx.userId,
    });
    return this.creditNoteRepo.save(note);
  }

  async findCreditNotes(ctx: TenantContext, status?: string): Promise<CreditNote[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.creditNoteRepo.find({ where, relations: ['invoice', 'company'], order: { note_date: 'DESC' } });
  }

  async findOneCreditNote(id: string, ctx: TenantContext): Promise<CreditNote> {
    const tenantId = this.assertTenantId(ctx);
    const cn = await this.creditNoteRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['invoice', 'company'] });
    if (!cn) throw new NotFoundException('Credit note not found');
    return cn;
  }

  async getInvoicePrintHtml(id: string, ctx: TenantContext): Promise<string> {
    const inv = await this.findOneInvoice(id, ctx);
    const tenant = ctx.tenantId ? await this.tenantRepo.findOne({ where: { id: ctx.tenantId } }) : null;
    if (tenant?.slug === 'star-ice') {
      return this.buildStarIceInvoiceHtml(inv);
    }

    const company = inv.company as { name: string; legal_name?: string; gstin?: string; address?: Record<string, unknown> };
    const billTo = (inv.vendor as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? (inv.customer as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? { name: 'N/A', gstin: '', address: undefined };
    const addr = (v: Record<string, unknown> | undefined) => (v && typeof v === 'object' && v.line1) ? [v.line1, v.line2, v.city, v.state, v.pincode].filter(Boolean).join(', ') : (v && typeof v === 'object' ? Object.values(v).filter(Boolean).join(', ') : '');
    const lines = inv.lines ?? [];
    const subtotal = parseFloat(inv.subtotal ?? '0');
    const taxAmount = parseFloat(inv.tax_amount ?? '0');
    const total = parseFloat(inv.total ?? '0');
    const paid = parseFloat(inv.paid_amount ?? '0');
    const due = total - paid;

    const lineRows = lines
      .map(
        (l: SalesInvoiceLine) =>
          `<tr><td>${escapeHtml(l.hsn_sac)}</td><td>${escapeHtml(String(l.description).slice(0, 15))}</td><td>${l.qty}</td><td>${l.rate}</td><td>${parseFloat(l.taxable_value).toFixed(2)}</td><td>${l.cgst_rate}</td><td>${parseFloat(l.cgst_amount).toFixed(2)}</td><td>${l.sgst_rate}</td><td>${parseFloat(l.sgst_amount).toFixed(2)}</td></tr>`,
      )
      .join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.number)}</title><style>
*{box-sizing:border-box}
body{font-family:'Courier New',monospace;font-size:11px;line-height:1.25;width:80mm;max-width:80mm;margin:0 auto;padding:4px;background:#fff}
h1{font-size:13px;text-align:center;margin:0 0 6px 0;text-transform:uppercase}
.section{margin:6px 0}
table{border-collapse:collapse;width:100%;font-size:10px}
th,td{border:1px solid #000;padding:2px 3px;text-align:left}
th{background:#eee;font-weight:bold}
.right{text-align:right}
.totals{margin-top:6px;font-weight:bold}
.totals td{border:none;padding:1px 0}
.footer{text-align:center;margin-top:8px;font-size:9px}
</style></head><body>
<h1>Tax Invoice</h1>
<div class="section"><strong>${escapeHtml(company.name)}</strong><br>${company.legal_name ? escapeHtml(company.legal_name) + '<br>' : ''}GSTIN: ${escapeHtml(company.gstin ?? 'N/A')}<br>${escapeHtml(addr(company.address))}</div>
<div class="section"><strong>Bill To:</strong><br>${escapeHtml(billTo.name)}<br>${billTo.gstin ? 'GSTIN: ' + escapeHtml(billTo.gstin) + '<br>' : ''}${escapeHtml(addr(billTo.address))}</div>
<div class="section">Inv No: <strong>${escapeHtml(inv.number)}</strong> | Date: ${inv.invoice_date}${inv.due_date ? ' | Due: ' + inv.due_date : ''}</div>
<table>
<thead><tr><th>HSN</th><th>Desc</th><th>Qty</th><th>Rate</th><th>TaxVal</th><th>CGST%</th><th>CGST</th><th>SGST%</th><th>SGST</th></tr></thead>
<tbody>${lineRows}</tbody>
</table>
<div class="totals">
<table><tr><td>Subtotal</td><td class="right">₹${subtotal.toFixed(2)}</td></tr>
<tr><td>Tax (GST)</td><td class="right">₹${taxAmount.toFixed(2)}</td></tr>
<tr><td>Total</td><td class="right">₹${total.toFixed(2)}</td></tr>
<tr><td>Paid</td><td class="right">₹${paid.toFixed(2)}</td></tr>
<tr><td>Amount Due</td><td class="right">₹${due.toFixed(2)}</td></tr></table>
</div>
<p class="footer">Thank you | SMEBUZE</p>
</body></html>`;
  }

  /** STAR ICE tenant: invoice layout matching their printed format (header, Bill To, goods table, itemized rows, tax, bank, certification). */
  private buildStarIceInvoiceHtml(inv: SalesInvoice): string {
    const company = inv.company as {
      name: string;
      legal_name?: string;
      gstin?: string;
      address?: Record<string, unknown> & { email?: string; phone?: string };
      bank_details?: Record<string, unknown> & { bank_name?: string; branch?: string; account_no?: string; ifsc?: string };
    };
    const billTo = (inv.vendor as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? (inv.customer as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? { name: 'N/A', gstin: '', address: undefined };
    const addr = (v: Record<string, unknown> | undefined) =>
      (v && typeof v === 'object' && v.line1)
        ? [v.line1, v.line2, v.city, v.state, v.pincode].filter(Boolean).join(', ')
        : (v && typeof v === 'object' ? Object.values(v).filter(Boolean).join(', ') : '');
    const getState = (v: Record<string, unknown> | undefined) => (v && typeof v === 'object' && v.state) ? String(v.state) : '';
    const getStateCode = (v: Record<string, unknown> | undefined) => (v && typeof v === 'object' && v.state_code) ? String(v.state_code) : '';
    const lines = inv.lines ?? [];
    const invDate = new Date(inv.invoice_date as Date | string).toISOString().slice(0, 10);
    const subtotal = parseFloat(inv.subtotal ?? '0');
    const taxAmount = parseFloat(inv.tax_amount ?? '0');
    const total = parseFloat(inv.total ?? '0');
    const companyAddr = addr(company.address);
    const companyEmail = (company.address && typeof company.address === 'object' && (company.address as Record<string, unknown>).email) ? String((company.address as Record<string, unknown>).email) : '';
    const companyPhone = (company.address && typeof company.address === 'object' && (company.address as Record<string, unknown>).phone) ? String((company.address as Record<string, unknown>).phone) : '';
    const bank = company.bank_details && typeof company.bank_details === 'object' ? company.bank_details as Record<string, unknown> : null;
    const bankName = bank?.bank_name ? String(bank.bank_name) : '';
    const bankBranch = bank?.branch ? String(bank.branch) : '';
    const bankAccount = bank?.account_no ? String(bank.account_no) : '';
    const bankIfsc = bank?.ifsc ? String(bank.ifsc) : '';

    const goodsRows = lines
      .map(
        (l: SalesInvoiceLine) =>
          `<tr><td>${escapeHtml(String(l.description))}</td><td>${l.rate}</td><td>${escapeHtml(l.hsn_sac)}</td></tr>`,
      )
      .join('');

    let sr = 0;
    const itemRows = lines
      .map(
        (l: SalesInvoiceLine) => {
          sr++;
          const qty = parseFloat(l.qty ?? '0');
          const amt = parseFloat(l.taxable_value ?? '0');
          return `<tr><td>${sr}</td><td>${invDate}</td><td></td><td>${escapeHtml(String(l.description))}</td><td>${qty}</td><td>${amt.toFixed(2)}</td></tr>`;
        },
      )
      .join('');

    const totalQty = lines.reduce((sum, l) => sum + parseFloat(l.qty ?? '0'), 0);
    const lines2_5 = lines.filter((l) => parseFloat(l.cgst_rate ?? '0') === 2.5);
    const lines9 = lines.filter((l) => parseFloat(l.cgst_rate ?? '0') === 9);
    const sgst2_5 = lines2_5.reduce((s, l) => s + parseFloat(l.sgst_amount ?? '0'), 0);
    const cgst2_5 = lines2_5.reduce((s, l) => s + parseFloat(l.cgst_amount ?? '0'), 0);
    const sgst9 = lines9.reduce((s, l) => s + parseFloat(l.sgst_amount ?? '0'), 0);
    const cgst9 = lines9.reduce((s, l) => s + parseFloat(l.cgst_amount ?? '0'), 0);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${escapeHtml(inv.number)}</title><style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;line-height:1.35;max-width:210mm;margin:0 auto;padding:12px;background:#fff;color:#000}
.star-ice-header{margin-bottom:12px;border-bottom:1px solid #000;padding-bottom:8px}
.star-ice-header h2{margin:0 0 4px 0;font-size:14px;text-transform:uppercase;font-weight:bold}
.star-ice-header p{margin:2px 0;font-size:11px}
.star-ice-section{margin:10px 0}
.star-ice-section h3{margin:0 0 4px 0;font-size:11px;font-weight:bold}
table{border-collapse:collapse;width:100%;font-size:10px;margin:6px 0}
th,td{border:1px solid #000;padding:4px 6px;text-align:left}
th{background:#f0f0f0;font-weight:bold}
.right{text-align:right}
.star-ice-tax-table{margin-top:8px}
.star-ice-tax-table td{border:none;padding:2px 8px}
.star-ice-bank{margin-top:12px;font-size:11px}
.star-ice-cert{margin-top:16px;font-size:10px;font-style:italic}
.star-ice-cert p{margin:4px 0}
</style></head><body>
<div class="star-ice-header">
  <h2>${escapeHtml(company.name)}</h2>
  <p>${escapeHtml(companyAddr)}</p>
  ${companyEmail ? `<p><strong>Email ID:</strong> ${escapeHtml(companyEmail)}</p>` : ''}
  ${companyPhone ? `<p><strong>Mobile Numbers:</strong> ${escapeHtml(companyPhone)}</p>` : ''}
  <p><strong>GSTIN:</strong> ${escapeHtml(company.gstin ?? 'N/A')}</p>
</div>

<p><strong>Invoice No.:</strong> ${escapeHtml(inv.number)} &nbsp; <strong>Invoice Date:</strong> ${invDate}</p>

<div class="star-ice-section">
  <h3>Bill To:</h3>
  <p><strong>${escapeHtml(billTo.name)}</strong></p>
  <p>${escapeHtml(addr(billTo.address))}</p>
  <p><strong>GSTIN:</strong> ${escapeHtml(billTo.gstin ?? '')}</p>
  <p><strong>State:</strong> ${escapeHtml(getState(billTo.address))} &nbsp; <strong>State Code:</strong> ${escapeHtml(getStateCode(billTo.address))}</p>
  <p><strong>Vehicle No.:</strong> </p>
</div>

<table>
  <thead><tr><th>Goods Details</th><th>Rate</th><th>HSN Code</th></tr></thead>
  <tbody>${goodsRows}</tbody>
</table>

<table>
  <thead><tr><th>Sr. No</th><th>Date</th><th>Challan no</th><th>Goods Details</th><th>Total Kg</th><th>Amount</th></tr></thead>
  <tbody>${itemRows}</tbody>
  <tfoot><tr><td colspan="4" class="right"><strong>Total</strong></td><td>${totalQty}</td><td>${subtotal.toFixed(2)}</td></tr></tfoot>
</table>

<div class="star-ice-tax-table">
  <table style="width:auto;border:none">
    <tr><td>SGST @ 2.5%</td><td class="right">${sgst2_5.toFixed(2)}</td></tr>
    <tr><td>CGST @ 2.5%</td><td class="right">${cgst2_5.toFixed(2)}</td></tr>
    <tr><td>SGST @ 9%</td><td class="right">${sgst9.toFixed(2)}</td></tr>
    <tr><td>CGST @ 9%</td><td class="right">${cgst9.toFixed(2)}</td></tr>
    <tr><td><strong>Grand Total</strong></td><td class="right"><strong>₹${total.toFixed(2)}</strong></td></tr>
  </table>
</div>

${bankName || bankAccount ? `<div class="star-ice-bank">
  <p><strong>Bank Details:</strong> ${escapeHtml(bankName)}${bankBranch ? ', ' + escapeHtml(bankBranch) : ''}</p>
  ${bankAccount ? `<p><strong>Bank Account No.:</strong> ${escapeHtml(bankAccount)}</p>` : ''}
  ${bankIfsc ? `<p><strong>Bank Branch IFSC:</strong> ${escapeHtml(bankIfsc)}</p>` : ''}
</div>` : ''}

<div class="star-ice-cert">
  <p>Certified that the particulars given above are true and correct</p>
  <p>For ${escapeHtml(company.name)}</p>
  <p>Authorised Signatory</p>
</div>
</body></html>`;
  }

  async findRecurringInvoices(ctx: TenantContext): Promise<RecurringInvoice[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.recurringInvoiceRepo.find({
      where: { tenant_id: tenantId },
      relations: ['customer', 'company', 'template_invoice'],
      order: { next_run_at: 'ASC' },
    });
  }

  async createRecurringInvoice(
    dto: { company_id: string; customer_id?: string; number_prefix?: string; frequency: string; next_run_at: string; template_invoice_id?: string },
    ctx: TenantContext,
  ): Promise<RecurringInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const rec = this.recurringInvoiceRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id,
      customer_id: dto.customer_id ?? null,
      number_prefix: dto.number_prefix ?? 'RINV',
      frequency: dto.frequency,
      next_run_at: new Date(dto.next_run_at),
      template_invoice_id: dto.template_invoice_id ?? null,
      created_by: ctx.userId,
    });
    return this.recurringInvoiceRepo.save(rec);
  }

  async runDueRecurringInvoices(ctx: TenantContext): Promise<{ created: number; errors: string[] }> {
    const tenantId = this.assertTenantId(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const due = await this.recurringInvoiceRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      relations: ['template_invoice', 'template_invoice.lines', 'customer', 'company'],
    });
    const toRun = due.filter((r) => r.next_run_at && new Date(r.next_run_at).toISOString().slice(0, 10) <= today);
    const errors: string[] = [];
    let created = 0;
    for (const r of toRun) {
      try {
        const template = r.template_invoice as SalesInvoice & { lines?: SalesInvoiceLine[] } | null;
        if (!template) {
          errors.push(`Recurring ${r.id}: no template invoice`);
          continue;
        }
        const lines = template.lines ?? [];
        const createDto: CreateInvoiceDto = {
          company_id: r.company_id,
          customer_id: r.customer_id ?? undefined,
          vendor_id: undefined,
          invoice_date: new Date(r.next_run_at).toISOString().slice(0, 10),
          lines: lines.map((l) => ({
            hsn_sac: l.hsn_sac,
            description: l.description,
            qty: parseFloat(l.qty),
            unit: l.unit ?? 'pcs',
            rate: parseFloat(l.rate),
            cgst_rate: parseFloat(l.cgst_rate ?? '0'),
            sgst_rate: parseFloat(l.sgst_rate ?? '0'),
          })),
        };
        await this.createInvoice(createDto, ctx);
        const next = new Date(r.next_run_at);
        if (r.frequency === 'daily') next.setDate(next.getDate() + 1);
        else if (r.frequency === 'weekly') next.setDate(next.getDate() + 7);
        else if (r.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (r.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
        await this.recurringInvoiceRepo.update(r.id, { last_run_at: r.next_run_at, next_run_at: next });
        created++;
      } catch (e) {
        errors.push(`Recurring ${r.id}: ${(e as Error).message}`);
      }
    }
    return { created, errors };
  }
}

function escapeHtml(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
