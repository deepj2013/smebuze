import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
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
import { isPosBusinessType, isStockTrackedPos } from '../common/tenant-client-types';
import { parseTenantBranding, TenantBranding } from '../common/tenant-branding';
import {
  buildInvoicePaySlip,
  frontendPayUrl,
  InvoicePaySlip,
  makeInvoicePayToken,
  parseTenantRazorpay,
  razorpayReady,
} from '../common/tenant-razorpay';
import { TenantContext } from '../common/tenant-context';
import { CreateInvoiceDto, CreateInvoiceLineDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { StockMovement } from '../ice-crest/entities/stock-movement.entity';
import { StockReservation } from '../inventory/entities/stock-reservation.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { amountInInrWords, formatInr, formatInvoiceDate, formatQty, gstPlaceOfSupply } from '../common/inr-words';
import { moneyStr, round2, roundQty } from '../common/money';

function gstLine(qty: number, rate: number, cgstRate = 0, sgstRate = 0, igstRate = 0) {
  const q = roundQty(qty);
  const r = round2(rate);
  const taxable = round2(q * r);
  const cgst = round2(cgstRate);
  const sgst = round2(sgstRate);
  const igst = round2(igstRate);
  const cgstAmount = round2((taxable * cgst) / 100);
  const sgstAmount = round2((taxable * sgst) / 100);
  const igstAmount = round2((taxable * igst) / 100);
  return {
    qty: q,
    rate: r,
    taxable,
    cgst,
    sgst,
    igst,
    cgstAmount,
    sgstAmount,
    igstAmount,
    tax: round2(cgstAmount + sgstAmount + igstAmount),
  };
}

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
    @InjectRepository(StockMovement)
    private readonly stockMovementRepo: Repository<StockMovement>,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createInvoice(dto: CreateInvoiceDto, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const invoiceTenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const isIceCrest = !!invoiceTenant && (invoiceTenant.settings?.business_type === 'ice_crest' || invoiceTenant.features?.includes('ice_crest'));
    if (isIceCrest) return this.createIceCrestInvoiceTransactional(dto, ctx);
    if (!dto.customer_id && !dto.vendor_id) {
      throw new ForbiddenException('Provide either customer_id or vendor_id (buyer).');
    }
    if (dto.customer_id && dto.vendor_id) {
      throw new ForbiddenException('Provide only one of customer_id or vendor_id.');
    }

    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');

    let iceCrestWarehouseId: string | null = null;
    if (isIceCrest) {
      iceCrestWarehouseId = await this.inventoryService.getDefaultWarehouse(ctx);
      if (!iceCrestWarehouseId) throw new ForbiddenException('Create a warehouse before issuing an Ice Crest invoice');
      const stockRows = await this.inventoryService.findStock(ctx, iceCrestWarehouseId);
      const required = new Map<string, number>();
      for (const line of dto.lines) if (line.item_id) required.set(line.item_id, (required.get(line.item_id) ?? 0) + line.qty);
      for (const [itemId, qty] of required) {
        const available = stockRows.filter(row => row.item_id === itemId).reduce((sum, row) => sum + Number(row.quantity), 0);
        if (available < qty) throw new ForbiddenException(`Insufficient stock for invoice item: have ${available}, need ${qty}`);
      }
    }

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
          const { taxable, tax } = gstLine(line.qty, line.rate, line.cgst_rate ?? 0, line.sgst_rate ?? 0, (line as { igst_rate?: number }).igst_rate ?? 0);
          draftTotal += taxable + tax;
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
      shipping_charges: moneyStr(dto.shipping_charges ?? 0),
      other_charges: moneyStr(dto.other_charges ?? 0),
      discount_amount: moneyStr(dto.discount_amount ?? 0),
      gst_applicable: dto.gst_applicable !== false,
      stock_deducted_at: null,
      created_by: ctx.userId,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    let subtotal = 0;
    let taxAmount = 0;
    for (let i = 0; i < dto.lines.length; i++) {
      const lineDto = dto.lines[i];
      const gst = gstLine(
        lineDto.qty,
        lineDto.rate,
        dto.gst_applicable === false ? 0 : lineDto.cgst_rate ?? 0,
        dto.gst_applicable === false ? 0 : lineDto.sgst_rate ?? 0,
        dto.gst_applicable === false ? 0 : lineDto.igst_rate ?? 0,
      );
      subtotal = round2(subtotal + gst.taxable);
      taxAmount = round2(taxAmount + gst.tax);

      const line = this.lineRepo.create({
        invoice_id: savedInvoice.id,
        item_id: lineDto.item_id ?? null,
        hsn_sac: lineDto.hsn_sac,
        description: lineDto.description,
        qty: moneyStr(gst.qty),
        unit: lineDto.unit ?? 'pcs',
        rate: moneyStr(gst.rate),
        taxable_value: moneyStr(gst.taxable),
        cgst_rate: moneyStr(gst.cgst),
        cgst_amount: moneyStr(gst.cgstAmount),
        sgst_rate: moneyStr(gst.sgst),
        sgst_amount: moneyStr(gst.sgstAmount),
        igst_rate: moneyStr(gst.igst),
        igst_amount: moneyStr(gst.igstAmount),
        sort_order: i,
      });
      await this.lineRepo.save(line);
    }

    const total = Math.max(0, round2(subtotal + taxAmount + (dto.shipping_charges ?? 0) + (dto.other_charges ?? 0) - (dto.discount_amount ?? 0)));
    await this.invoiceRepo.update(savedInvoice.id, {
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total: total.toFixed(2),
    });

    // Ice Crest invoices are inventory outward documents. Deduct exactly once and write an audit movement.
    if (isIceCrest && iceCrestWarehouseId) {
      const warehouseId = iceCrestWarehouseId;
      for (const line of dto.lines) {
        if (!line.item_id || line.qty <= 0) continue;
        await this.inventoryService.deductStock(ctx, warehouseId, line.item_id, line.qty);
        await this.stockMovementRepo.save(this.stockMovementRepo.create({ tenant_id: tenantId, warehouse_id: warehouseId,
          item_id: line.item_id, movement_type: 'outward', quantity: String(line.qty), movement_date: new Date(dto.invoice_date),
          reference_type: 'sales_invoice', reference_id: savedInvoice.id, reference_number: number, notes: 'Automatic deduction on invoice', created_by: ctx.userId }));
      }
      await this.invoiceRepo.update(savedInvoice.id, { stock_deducted_at: new Date() });
    }

    const businessType = invoiceTenant?.settings?.business_type;
    if (!isIceCrest && isPosBusinessType(businessType)) {
      const warehouseId = await this.inventoryService.getDefaultWarehouse(ctx);
      if (warehouseId) {
        const strict = isStockTrackedPos(businessType);
        for (const line of dto.lines) {
          if (!line.item_id || line.qty <= 0) continue;
          try {
            await this.inventoryService.deductStock(ctx, warehouseId, line.item_id, line.qty);
          } catch (err) {
            if (strict) throw err;
          }
        }
        await this.invoiceRepo.update(savedInvoice.id, { stock_deducted_at: new Date() });
      }
    }

    return this.invoiceRepo.findOne({
      where: { id: savedInvoice.id },
      relations: ['customer', 'vendor', 'company', 'lines'],
    }) as Promise<SalesInvoice>;
  }

  /** All Ice Crest invoice, stock and reservation writes commit or roll back together. */
  private async createIceCrestInvoiceTransactional(dto: CreateInvoiceDto, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    if ((!dto.customer_id && !dto.vendor_id) || (dto.customer_id && dto.vendor_id)) throw new ForbiddenException('Provide exactly one bill-to customer or vendor.');
    if (!dto.lines?.length) throw new ForbiddenException('Invoice requires at least one line');
    return this.dataSource.transaction('SERIALIZABLE', async (manager: EntityManager) => {
      const company = await manager.findOne(Company, { where: { id: dto.company_id, tenant_id: tenantId } });
      if (!company) throw new NotFoundException('Company not found');
      if (dto.customer_id && !(await manager.findOne(Customer,{where:{id:dto.customer_id,tenant_id:tenantId}}))) throw new NotFoundException('Customer not found');
      if (dto.vendor_id && !(await manager.findOne(Vendor,{where:{id:dto.vendor_id,tenant_id:tenantId}}))) throw new NotFoundException('Vendor not found');
      const warehouse = await manager.findOne(Warehouse,{where:{tenant_id:tenantId,is_default:true}}) ?? await manager.findOne(Warehouse,{where:{tenant_id:tenantId},order:{created_at:'ASC'}});
      if (!warehouse) throw new ForbiddenException('Create a warehouse before issuing an Ice Crest invoice');
      let order: SalesOrder | null = null;
      if (dto.sales_order_id) {
        order = await manager.findOne(SalesOrder,{where:{id:dto.sales_order_id,tenant_id:tenantId}});
        if (!order) throw new NotFoundException('Sales order not found');
        if (['cancelled','closed'].includes(order.status)) throw new ForbiddenException('Cannot invoice a cancelled or closed sales order');
      }
      const required = new Map<string,number>();
      for (const line of dto.lines) {
        if (!Number.isFinite(line.qty) || line.qty <= 0) throw new ForbiddenException('Every invoice quantity must be greater than zero');
        if (line.item_id) required.set(line.item_id,(required.get(line.item_id)??0)+line.qty);
      }
      const lockedStocks = new Map<string,Stock>();
      const reservations = new Map<string,StockReservation>();
      for (const [itemId,qty] of required) {
        const stock = await manager.getRepository(Stock).createQueryBuilder('s').setLock('pessimistic_write')
          .where('s.tenant_id=:tenantId AND s.warehouse_id=:warehouseId AND s.item_id=:itemId',{tenantId,warehouseId:warehouse.id,itemId}).getOne();
        if (!stock) throw new ForbiddenException(`No stock record exists for invoice item ${itemId}`);
        if (order) {
          const reservation = await manager.findOne(StockReservation,{where:{sales_order_id:order.id,item_id:itemId,status:'active'}});
          const remaining = reservation ? Number(reservation.quantity)-Number(reservation.consumed_quantity) : 0;
          if (!reservation || remaining < qty) throw new ForbiddenException(`Invoice quantity ${qty} exceeds reserved order quantity ${remaining} for item ${itemId}`);
          reservations.set(itemId,reservation);
        } else {
          const available = Number(stock.quantity)-Number(stock.reserved);
          if (available < qty) throw new ForbiddenException(`Insufficient unreserved stock: have ${available}, need ${qty}`);
        }
        lockedStocks.set(itemId,stock);
      }
      let subtotal=0,taxAmount=0;
      const number=dto.number?.trim()||`INV-${Date.now()}`;
      const invoice=await manager.save(SalesInvoice,manager.create(SalesInvoice,{tenant_id:tenantId,company_id:dto.company_id,branch_id:dto.branch_id??null,
        customer_id:dto.customer_id??null,vendor_id:dto.vendor_id??null,sales_order_id:dto.sales_order_id??null,number,invoice_date:new Date(dto.invoice_date),
        due_date:dto.due_date?new Date(dto.due_date):null,status:'issued',subtotal:'0',tax_amount:'0',total:'0',paid_amount:'0',shipping_charges:moneyStr(dto.shipping_charges??0),
        other_charges:moneyStr(dto.other_charges??0),discount_amount:moneyStr(dto.discount_amount??0),gst_applicable:dto.gst_applicable!==false,stock_deducted_at:null,created_by:ctx.userId}));
      for (let i=0;i<dto.lines.length;i++) {
        const l=dto.lines[i], g=gstLine(l.qty,l.rate,dto.gst_applicable===false?0:l.cgst_rate??0,dto.gst_applicable===false?0:l.sgst_rate??0,dto.gst_applicable===false?0:l.igst_rate??0);
        subtotal=round2(subtotal+g.taxable);taxAmount=round2(taxAmount+g.tax);
        await manager.save(SalesInvoiceLine,manager.create(SalesInvoiceLine,{invoice_id:invoice.id,item_id:l.item_id??null,hsn_sac:l.hsn_sac,description:l.description,qty:moneyStr(g.qty),unit:l.unit??'pcs',rate:moneyStr(g.rate),taxable_value:moneyStr(g.taxable),cgst_rate:moneyStr(g.cgst),cgst_amount:moneyStr(g.cgstAmount),sgst_rate:moneyStr(g.sgst),sgst_amount:moneyStr(g.sgstAmount),igst_rate:moneyStr(g.igst),igst_amount:moneyStr(g.igstAmount),sort_order:i}));
      }
      for (const [itemId,qty] of required) {
        const stock=lockedStocks.get(itemId)!; stock.quantity=String(Number(stock.quantity)-qty);
        const reservation=reservations.get(itemId);
        if (reservation) { stock.reserved=String(Math.max(0,Number(stock.reserved)-qty)); reservation.consumed_quantity=String(Number(reservation.consumed_quantity)+qty); if(Number(reservation.consumed_quantity)>=Number(reservation.quantity))reservation.status='consumed'; await manager.save(reservation); }
        await manager.save(stock);
        await manager.save(StockMovement,manager.create(StockMovement,{tenant_id:tenantId,warehouse_id:warehouse.id,item_id:itemId,movement_type:'outward',quantity:String(qty),movement_date:new Date(dto.invoice_date),reference_type:'sales_invoice',reference_id:invoice.id,reference_number:number,notes:order?`Consumed reservation for ${order.number}`:'Automatic deduction on invoice',created_by:ctx.userId}));
      }
      const total=Math.max(0,round2(subtotal+taxAmount+(dto.shipping_charges??0)+(dto.other_charges??0)-(dto.discount_amount??0)));
      invoice.subtotal=moneyStr(subtotal);invoice.tax_amount=moneyStr(taxAmount);invoice.total=moneyStr(total);invoice.stock_deducted_at=new Date();await manager.save(invoice);
      if(order){const active=await manager.count(StockReservation,{where:{sales_order_id:order.id,status:'active'}});if(active===0){order.status='invoiced';await manager.save(order);}}
      return manager.findOneOrFail(SalesInvoice,{where:{id:invoice.id},relations:['customer','vendor','company','lines']});
    });
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
        const gst = gstLine(lineDto.qty, lineDto.rate, lineDto.cgst_rate ?? 0, lineDto.sgst_rate ?? 0, lineDto.igst_rate ?? 0);
        subtotal = round2(subtotal + gst.taxable);
        taxAmount = round2(taxAmount + gst.tax);
        const line = this.lineRepo.create({
          invoice_id: id,
          item_id: lineDto.item_id ?? null,
          hsn_sac: lineDto.hsn_sac,
          description: lineDto.description,
          qty: moneyStr(gst.qty),
          unit: lineDto.unit ?? 'pcs',
          rate: moneyStr(gst.rate),
          taxable_value: moneyStr(gst.taxable),
          cgst_rate: moneyStr(gst.cgst),
          cgst_amount: moneyStr(gst.cgstAmount),
          sgst_rate: moneyStr(gst.sgst),
          sgst_amount: moneyStr(gst.sgstAmount),
          igst_rate: moneyStr(gst.igst),
          igst_amount: moneyStr(gst.igstAmount),
          sort_order: i,
        });
        await this.lineRepo.save(line);
      }
      await this.invoiceRepo.update(id, {
        subtotal: moneyStr(subtotal),
        tax_amount: moneyStr(taxAmount),
        total: moneyStr(subtotal + taxAmount),
      });
    }

    return this.findOneInvoice(id, ctx);
  }

  async findInvoices(ctx: TenantContext, status?: string, customerId?: string, from?: string, limit?: number): Promise<SalesInvoice[]> {
    const tenantId = this.assertTenantId(ctx);
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.customer', 'customer')
      .leftJoinAndSelect('inv.vendor', 'vendor')
      .leftJoinAndSelect('inv.company', 'company')
      .where('inv.tenant_id = :tenantId', { tenantId })
      .orderBy('inv.created_at', 'DESC');
    if (!limit) qb.leftJoinAndSelect('inv.lines', 'lines');
    if (status) qb.andWhere('inv.status = :status', { status });
    if (customerId) qb.andWhere('inv.customer_id = :customerId', { customerId });
    if (from) qb.andWhere('inv.invoice_date >= :from', { from });
    if (limit && limit > 0) qb.take(Math.min(limit, 200));
    return qb.getMany();
  }

  async findOneInvoice(id: string, ctx: TenantContext): Promise<SalesInvoice> {
    const tenantId = this.assertTenantId(ctx);
    const inv = await this.invoiceRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['customer', 'vendor', 'company', 'branch', 'lines', 'lines.item'],
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
    const tenant = ctx.tenantId ? await this.tenantRepo.findOne({ where: { id: ctx.tenantId } }) : null;
    const cfg = parseTenantRazorpay(tenant?.settings as Record<string, unknown>);
    const total = parseFloat(String(invoice.total ?? 0));
    const paid = parseFloat(String(invoice.paid_amount ?? 0));
    if (!razorpayReady(cfg) || total - paid < 1) return { enabled: false };
    return { enabled: true, url: frontendPayUrl(makeInvoicePayToken(invoice.id, invoice.tenant_id)) };
  }

  async recordPaymentByInvoiceId(
    invoiceId: string,
    amount: number,
    reference?: string,
    tenantId?: string,
  ): Promise<SalesInvoice | null> {
    const invoice = await this.invoiceRepo.findOne({
      where: tenantId ? { id: invoiceId, tenant_id: tenantId } : { id: invoiceId },
    });
    if (!invoice) return null;
    if (reference) {
      const duplicate = await this.paymentRepo.findOne({ where: { invoice_id: invoiceId, reference } });
      if (duplicate) {
        return this.invoiceRepo.findOne({
          where: { id: invoiceId },
          relations: ['customer', 'vendor', 'company', 'lines'],
        }) as Promise<SalesInvoice>;
      }
    }
    const total = parseFloat(invoice.total);
    const paid = parseFloat(invoice.paid_amount);
    const remaining = Math.round((total - paid) * 100) / 100;
    if (remaining <= 0) return invoice;
    const applied = Math.min(Math.round(Number(amount) * 100) / 100, remaining);
    if (applied < 0.01) return invoice;
    const newPaid = Math.round((paid + applied) * 100) / 100;
    await this.paymentRepo.save(
      this.paymentRepo.create({
        invoice_id: invoiceId,
        amount: applied.toFixed(2),
        payment_date: new Date(),
        mode: 'razorpay',
        reference: reference ?? null,
      }),
    );
    await this.invoiceRepo.update(invoiceId, {
      paid_amount: newPaid.toFixed(2),
      status: newPaid >= total - 0.05 ? 'paid' : 'partial',
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
      const amount = round2(round2(l.qty) * round2(l.rate));
      const tax = round2(amount * (round2(l.tax_rate ?? 0) / 100));
      total = round2(total + amount + tax);
      taxAmount = round2(taxAmount + tax);
      await this.quotationItemRepo.save(
        this.quotationItemRepo.create({
          quotation_id: saved.id,
          item_id: l.item_id ?? null,
          description: l.description ?? null,
          qty: moneyStr(l.qty),
          unit: l.unit ?? 'pcs',
          rate: moneyStr(l.rate),
          amount: moneyStr(amount),
          tax_rate: moneyStr(l.tax_rate ?? 0),
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
      lines?: { item_id?: string; description?: string; qty: number; unit?: string; rate: number; mrp?: number | null; discount_percent?: number | null; gst_treatment?: string }[];
      requirement_given_by?: string;
      requirement_channel?: string;
      requirement_proof_ref?: string;
    },
    ctx: TenantContext,
  ): Promise<SalesOrder> {
    const tenantId = this.assertTenantId(ctx);
    const tenant = await this.tenantRepo.findOne({where:{id:tenantId}});
    if (tenant && (tenant.settings?.business_type==='ice_crest'||tenant.features?.includes('ice_crest'))) return this.createIceCrestSalesOrderTransactional(dto,ctx);
    const company = await this.companyRepo.findOne({ where: { id: dto.company_id, tenant_id: tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    const number = dto.number ?? `SO-${Date.now()}`;
    let total = 0;
    if (dto.lines?.length) {
      for (const l of dto.lines) total = round2(total + round2(l.qty ?? 0) * round2(l.rate ?? 0));
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
      total: moneyStr(total),
      tax_amount: '0',
      created_by: ctx.userId,
      requirement_given_by: dto.requirement_given_by ?? null,
      requirement_channel: dto.requirement_channel ?? null,
      requirement_proof_ref: dto.requirement_proof_ref ?? null,
    });
    const saved = await this.salesOrderRepo.save(order);
    if (dto.lines?.length) {
      for (let i = 0; i < dto.lines.length; i++) {
        const row = dto.lines[i];
        const line = this.salesOrderLineRepo.create({
          sales_order_id: saved.id,
          item_id: row.item_id ?? null,
          description: row.description ?? null,
          quantity: moneyStr(row.qty ?? 0),
          unit: row.unit ?? 'pcs',
          rate: moneyStr(row.rate ?? 0),
          mrp: row.mrp != null ? moneyStr(row.mrp) : null,
          discount_percent: row.discount_percent != null ? moneyStr(row.discount_percent) : null,
          gst_treatment: row.gst_treatment === 'inclusive' ? 'inclusive' : 'extra',
          sort_order: i,
        });
        await this.salesOrderLineRepo.save(line);
      }
    }
    return this.findOneSalesOrder(saved.id, ctx);
  }

  private async createIceCrestSalesOrderTransactional(dto: Parameters<SalesService['createSalesOrder']>[0],ctx:TenantContext):Promise<SalesOrder>{
    const tenantId=this.assertTenantId(ctx);
    if(!dto.lines?.length)throw new ForbiddenException('Ice Crest sales orders require at least one SKU line');
    const lines=dto.lines;
    return this.dataSource.transaction('SERIALIZABLE',async manager=>{
      if(!(await manager.findOne(Company,{where:{id:dto.company_id,tenant_id:tenantId}})))throw new NotFoundException('Company not found');
      if(dto.customer_id&&!(await manager.findOne(Customer,{where:{id:dto.customer_id,tenant_id:tenantId}})))throw new NotFoundException('Customer not found');
      const warehouse=await manager.findOne(Warehouse,{where:{tenant_id:tenantId,is_default:true}})??await manager.findOne(Warehouse,{where:{tenant_id:tenantId},order:{created_at:'ASC'}});
      if(!warehouse)throw new ForbiddenException('Create a warehouse before creating a sales order');
      const required=new Map<string,number>();let total=0;
      for(const l of lines){if(!l.item_id)throw new ForbiddenException('Every Ice Crest order line must select an SKU');if(!Number.isFinite(l.qty)||l.qty<=0)throw new ForbiddenException('Every order quantity must be greater than zero');required.set(l.item_id,(required.get(l.item_id)??0)+l.qty);total+=l.qty*l.rate;}
      const locked=new Map<string,Stock>();
      for(const [itemId,qty] of required){const stock=await manager.getRepository(Stock).createQueryBuilder('s').setLock('pessimistic_write').where('s.tenant_id=:tenantId AND s.warehouse_id=:warehouseId AND s.item_id=:itemId',{tenantId,warehouseId:warehouse.id,itemId}).getOne();if(!stock)throw new ForbiddenException(`No stock record for item ${itemId}`);const available=Number(stock.quantity)-Number(stock.reserved);if(available<qty)throw new ForbiddenException(`Insufficient available stock: have ${available}, need ${qty}`);locked.set(itemId,stock);}
      const order=await manager.save(SalesOrder,manager.create(SalesOrder,{tenant_id:tenantId,company_id:dto.company_id,branch_id:dto.branch_id??null,customer_id:dto.customer_id??null,quotation_id:dto.quotation_id??null,number:dto.number?.trim()||`SO-${Date.now()}`,order_date:new Date(dto.order_date),status:'confirmed',total:total.toFixed(2),tax_amount:'0',created_by:ctx.userId,requirement_given_by:dto.requirement_given_by??null,requirement_channel:dto.requirement_channel??null,requirement_proof_ref:dto.requirement_proof_ref??null,stock_reserved_at:new Date(),reservation_released_at:null}));
      for(let i=0;i<lines.length;i++){const l=lines[i];await manager.save(SalesOrderLine,manager.create(SalesOrderLine,{sales_order_id:order.id,item_id:l.item_id!,description:l.description??null,quantity:String(l.qty),unit:l.unit??'pcs',rate:String(l.rate),mrp:l.mrp!=null?String(l.mrp):null,discount_percent:l.discount_percent!=null?String(l.discount_percent):null,gst_treatment:l.gst_treatment==='inclusive'?'inclusive':'extra',sort_order:i}));}
      for(const[itemId,qty]of required){const stock=locked.get(itemId)!;stock.reserved=String(Number(stock.reserved)+qty);await manager.save(stock);await manager.save(StockReservation,manager.create(StockReservation,{tenant_id:tenantId,sales_order_id:order.id,warehouse_id:warehouse.id,item_id:itemId,quantity:String(qty),consumed_quantity:'0',status:'active'}));}
      return manager.findOneOrFail(SalesOrder,{where:{id:order.id},relations:['customer','company','quotation','lines','lines.item']});
    });
  }

  async updateSalesOrder(
    id: string,
    dto: {
      status?: string;
      lines?: Array<{ item_id?: string | null; description?: string; qty: number; unit?: string; rate: number; sort_order?: number; mrp?: number | null; discount_percent?: number | null; gst_treatment?: string }>;
    },
    ctx: TenantContext,
  ): Promise<SalesOrder> {
    const tenantId = this.assertTenantId(ctx);
    const order = await this.salesOrderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!order) throw new NotFoundException('Sales order not found');
    const activeReservations=await this.dataSource.getRepository(StockReservation).find({where:{sales_order_id:id,status:'active'}});
    if(dto.lines&&activeReservations.length)throw new ForbiddenException('Release/cancel the existing reservation before editing Ice Crest order lines');
    if(dto.status&&['cancelled','rejected'].includes(dto.status)&&activeReservations.length){
      await this.dataSource.transaction(async manager=>{for(const r of activeReservations){const stock=await manager.getRepository(Stock).createQueryBuilder('s').setLock('pessimistic_write').where('s.tenant_id=:tenantId AND s.warehouse_id=:warehouseId AND s.item_id=:itemId',{tenantId,warehouseId:r.warehouse_id,itemId:r.item_id}).getOne();if(stock){stock.reserved=String(Math.max(0,Number(stock.reserved)-(Number(r.quantity)-Number(r.consumed_quantity))));await manager.save(stock);}r.status='released';await manager.save(r);}order.status=dto.status!;order.reservation_released_at=new Date();await manager.save(order);});return this.findOneSalesOrder(id,ctx);
    }
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
          quantity: moneyStr(row.qty ?? 0),
          unit: row.unit ?? 'pcs',
          rate: moneyStr(row.rate ?? 0),
          mrp: row.mrp != null ? moneyStr(row.mrp) : null,
          discount_percent: row.discount_percent != null ? moneyStr(row.discount_percent) : null,
          gst_treatment: row.gst_treatment === 'inclusive' ? 'inclusive' : 'extra',
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
      relations: ['customer', 'company', 'lines', 'lines.item', 'createdBy'],
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

  async getQuotationPrintHtml(id: string, ctx: TenantContext): Promise<string> {
    const q = await this.findOneQuotation(id, ctx);
    const tenant = ctx.tenantId ? await this.tenantRepo.findOne({ where: { id: ctx.tenantId } }) : null;
    const branding = parseTenantBranding(tenant?.settings as Record<string, unknown>);
    const terms = tenant?.settings?.terms as string | undefined;
    return this.buildIceCrestQuotationHtml(q, terms, branding);
  }

  async getInvoicePrintHtml(id: string, ctx: TenantContext): Promise<string> {
    const inv = await this.findOneInvoice(id, ctx);
    const tenant = ctx.tenantId ? await this.tenantRepo.findOne({ where: { id: ctx.tenantId } }) : null;
    const branding = parseTenantBranding(tenant?.settings as Record<string, unknown>);
    const terms = tenant?.settings?.terms as string | undefined;
    const pay = await buildInvoicePaySlip(parseTenantRazorpay(tenant?.settings as Record<string, unknown>), inv);
    if (tenant?.slug === 'star-ice') {
      return this.buildStarIceInvoiceHtml(inv, branding, pay);
    }
    const pos = isPosBusinessType(tenant?.settings?.business_type);
    if (!pos) {
      return this.buildIceCrestInvoiceHtml(inv, terms, branding, pay);
    }

    const company = inv.company as { name: string; legal_name?: string; gstin?: string; logo_url?: string | null; address?: Record<string, unknown> };
    const posLogo = this.resolveLogoUrl(company.logo_url || branding.logo_url);
    const billTo = (inv.vendor as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? (inv.customer as { name: string; gstin?: string; address?: Record<string, unknown> } | null)
      ?? { name: 'N/A', gstin: '', address: undefined };
    const addr = (v: Record<string, unknown> | undefined) => (v && typeof v === 'object' && v.line1) ? [v.line1, v.line2, v.city, v.state, v.pincode].filter(Boolean).join(', ') : (v && typeof v === 'object' ? Object.values(v).filter(Boolean).join(', ') : '');
    const lines = inv.lines ?? [];
    const subtotal = parseFloat(inv.subtotal ?? '0');
    const taxAmount = parseFloat(inv.tax_amount ?? '0');
    const shipping = parseFloat(inv.shipping_charges ?? '0');
    const otherCharges = parseFloat(inv.other_charges ?? '0');
    const discount = parseFloat(inv.discount_amount ?? '0');
    const total = parseFloat(inv.total ?? '0');
    const paid = parseFloat(inv.paid_amount ?? '0');
    const due = total - paid;

    const lineRows = lines
      .map(
        (l: SalesInvoiceLine) =>
          `<tr><td>${escapeHtml(l.hsn_sac)}</td><td>${escapeHtml(String(l.description).slice(0, 15))}</td><td>${formatQty(Number(l.qty))}</td><td>${Number(l.rate).toFixed(2)}</td><td>${parseFloat(l.taxable_value).toFixed(2)}</td><td>${Number(l.cgst_rate).toFixed(2)}</td><td>${parseFloat(l.cgst_amount).toFixed(2)}</td><td>${Number(l.sgst_rate).toFixed(2)}</td><td>${parseFloat(l.sgst_amount).toFixed(2)}</td></tr>`,
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
<h1>${inv.gst_applicable ? 'Tax Invoice' : 'Invoice / Receipt'}</h1>
${posLogo ? `<div class="section" style="text-align:center"><img src="${escapeHtml(posLogo)}" alt="Logo" style="max-width:48px;max-height:48px;object-fit:contain"/></div>` : ''}
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
${shipping ? `<tr><td>Shipping charges</td><td class="right">₹${shipping.toFixed(2)}</td></tr>` : ''}
${otherCharges ? `<tr><td>Other charges</td><td class="right">₹${otherCharges.toFixed(2)}</td></tr>` : ''}
${discount ? `<tr><td>Discount</td><td class="right">-₹${discount.toFixed(2)}</td></tr>` : ''}
<tr><td>Total</td><td class="right">₹${total.toFixed(2)}</td></tr>
<tr><td>Paid</td><td class="right">₹${paid.toFixed(2)}</td></tr>
<tr><td>Amount Due</td><td class="right">₹${due.toFixed(2)}</td></tr></table>
</div>
${this.invoicePayBlockHtml(pay, true)}
<p class="footer">Thank you | SMEBUZE</p>
</body></html>`;
  }

  /** STAR ICE tenant: invoice layout matching their printed format (header, Bill To, goods table, itemized rows, tax, bank, certification). */
  private buildStarIceInvoiceHtml(inv: SalesInvoice, branding?: TenantBranding, pay?: InvoicePaySlip): string {
    const company = inv.company as {
      name: string;
      legal_name?: string;
      gstin?: string;
      logo_url?: string | null;
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
    const starLogo = this.resolveLogoUrl(company.logo_url || branding?.logo_url);

    const goodsRows = lines
      .map(
        (l: SalesInvoiceLine) =>
          `<tr><td>${escapeHtml(String(l.description))}</td><td>${Number(l.rate).toFixed(2)}</td><td>${escapeHtml(l.hsn_sac)}</td></tr>`,
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
  <div style="display:flex;gap:12px;align-items:flex-start">
    ${starLogo ? `<img src="${escapeHtml(starLogo)}" alt="Logo" style="width:56px;height:56px;object-fit:contain"/>` : ''}
    <div>
      <h2>${escapeHtml(branding?.display_name || company.name)}</h2>
      <p>${escapeHtml(companyAddr)}</p>
      ${companyEmail ? `<p><strong>Email ID:</strong> ${escapeHtml(companyEmail)}</p>` : ''}
      ${companyPhone ? `<p><strong>Mobile Numbers:</strong> ${escapeHtml(companyPhone)}</p>` : ''}
      <p><strong>GSTIN:</strong> ${escapeHtml(company.gstin ?? 'N/A')}</p>
    </div>
  </div>
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
${this.invoicePayBlockHtml(pay)}

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

  /** GST tax invoice: boxed A4 layout. Logo, name and bank come from the company record. */
  private buildIceCrestInvoiceHtml(inv: SalesInvoice, terms?: string, branding?: TenantBranding, pay?: InvoicePaySlip): string {
    const company = inv.company as {
      name: string; legal_name?: string; gstin?: string; logo_url?: string | null;
      address?: Record<string, unknown> & { email?: string; phone?: string; fssai?: string; msme?: string };
      bank_details?: Record<string, unknown> & { bank_name?: string; branch?: string; account_no?: string; ifsc?: string; account_name?: string };
    };
    const customer = inv.customer as {
      name?: string; gstin?: string; phone?: string; address?: Record<string, unknown>; contacts?: Array<Record<string, unknown>>;
    } | null;
    const vendor = inv.vendor as { name?: string; gstin?: string; phone?: string; address?: Record<string, unknown> } | null;
    const billParty = customer ?? vendor ?? { name: 'N/A', gstin: '', address: undefined as Record<string, unknown> | undefined };
    const addr = (v: Record<string, unknown> | undefined) =>
      v && typeof v === 'object' ? [v.line1, v.line2, v.city, v.state, v.pincode].filter(Boolean).join(', ') : '';
    const str = (v: unknown) => (v == null ? '' : String(v).trim());
    const lines = inv.lines ?? [];
    const invDate = formatInvoiceDate(inv.invoice_date);
    const dueDate = inv.due_date ? formatInvoiceDate(inv.due_date) : '';
    const shipping = round2(parseFloat(inv.shipping_charges ?? '0'));
    const otherCharges = round2(parseFloat(inv.other_charges ?? '0'));
    const discount = round2(parseFloat(inv.discount_amount ?? '0'));
    const total = round2(parseFloat(inv.total ?? '0'));
    const paid = round2(parseFloat(inv.paid_amount ?? '0'));
    const balance = round2(Math.max(0, total - paid));
    const paymentMode = paid <= 0 ? 'Credit' : paid >= total ? 'Paid' : 'Partial';
    const companyAddr = company.address ?? {};
    const logo = this.resolveLogoUrl(company.logo_url || branding?.logo_url);
    const heading = company.name || branding?.display_name || 'Company';
    const initials = heading.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'IC';
    const logoBlock = logo
      ? `<img src="${escapeHtml(logo)}" alt="Logo"/>`
      : `<div class="pi-logo-fallback">${escapeHtml(initials)}</div>`;
    const contacts = Array.isArray(customer?.contacts) ? customer.contacts : [];
    const ordered = contacts.find((c) => str(c.name)) ?? {};
    const orderedBy = str(ordered.name) || str(billParty.name);
    const orderedPhone = str(ordered.phone) || str(customer?.phone) || str(vendor?.phone);
    const place = gstPlaceOfSupply(billParty.gstin, billParty.address as Record<string, unknown> | undefined)
      || gstPlaceOfSupply(company.gstin, company.address as Record<string, unknown> | undefined);
    const companyState = gstPlaceOfSupply(company.gstin, company.address as Record<string, unknown> | undefined);
    const billAddr = billParty.address as Record<string, unknown> | undefined;
    const shipName = str(billAddr?.ship_name) || orderedBy;
    const shipAddr = str(billAddr?.ship_line1)
      ? addr({ line1: billAddr?.ship_line1, line2: billAddr?.ship_line2, city: billAddr?.ship_city, state: billAddr?.ship_state, pincode: billAddr?.ship_pincode })
      : addr(billAddr);
    const brandName = str(customer?.name) || str(vendor?.name) || '';

    let qtyTotal = 0;
    let taxableTotal = 0;
    let gstTotal = 0;
    let amountTotal = 0;
    const itemRows = lines.map((l, i) => {
      const qty = roundQty(Number(l.qty || 0));
      const rate = round2(Number(l.rate || 0));
      const taxable = round2(Number(l.taxable_value || 0));
      const gstAmt = round2(Number(l.cgst_amount || 0) + Number(l.sgst_amount || 0) + Number(l.igst_amount || 0));
      const gstPct = round2(Number(l.cgst_rate || 0) + Number(l.sgst_rate || 0) + Number(l.igst_rate || 0));
      const amount = round2(taxable + gstAmt);
      qtyTotal = roundQty(qtyTotal + qty);
      taxableTotal = round2(taxableTotal + taxable);
      gstTotal = round2(gstTotal + gstAmt);
      amountTotal = round2(amountTotal + amount);
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${escapeHtml(String(l.description || ''))}</td>
        <td class="c">${escapeHtml(l.hsn_sac || '')}</td>
        <td class="r">${formatQty(qty)}</td>
        <td class="c">${escapeHtml((l.unit || 'PCS').toUpperCase())}</td>
        <td class="r">${formatInr(rate)}</td>
        <td class="r">${formatInr(taxable)}</td>
        <td class="r">${formatInr(gstAmt)}${gstPct ? ` (${gstPct}%)` : ''}</td>
        <td class="r">${formatInr(amount)}</td>
      </tr>`;
    }).join('');

    const hsnMap = new Map<string, { hsn: string; taxable: number; cgstRate: number; cgst: number; sgstRate: number; sgst: number }>();
    for (const l of lines) {
      const hsn = l.hsn_sac || '—';
      const cgstRate = round2(Number(l.cgst_rate || 0));
      const sgstRate = round2(Number(l.sgst_rate || 0));
      const key = `${hsn}|${cgstRate}|${sgstRate}`;
      const cur = hsnMap.get(key) ?? { hsn, taxable: 0, cgstRate, cgst: 0, sgstRate, sgst: 0 };
      cur.taxable = round2(cur.taxable + Number(l.taxable_value || 0));
      cur.cgst = round2(cur.cgst + Number(l.cgst_amount || 0));
      cur.sgst = round2(cur.sgst + Number(l.sgst_amount || 0));
      hsnMap.set(key, cur);
    }
    const hsnRows = [...hsnMap.values()];
    const hsnTaxable = round2(hsnRows.reduce((s, r) => s + r.taxable, 0));
    const hsnCgst = round2(hsnRows.reduce((s, r) => s + r.cgst, 0));
    const hsnSgst = round2(hsnRows.reduce((s, r) => s + r.sgst, 0));
    const hsnTable = hsnRows.map((r) => `<tr>
      <td>${escapeHtml(r.hsn)}</td>
      <td class="r">${formatInr(r.taxable)}</td>
      <td class="c">${formatInr(r.cgstRate)}%</td>
      <td class="r">${formatInr(r.cgst)}</td>
      <td class="c">${formatInr(r.sgstRate)}%</td>
      <td class="r">${formatInr(r.sgst)}</td>
      <td class="r">${formatInr(r.cgst + r.sgst)}</td>
    </tr>`).join('');

    const bank = company.bank_details ?? {};
    const bankName = [str(bank.bank_name), str(bank.branch)].filter(Boolean).join(', ');
    const defaultTerms = dueDate
      ? 'Payment due by the date shown. Quality must be checked at delivery.'
      : 'Quality must be checked at delivery.';
    const docTitle = inv.gst_applicable ? 'Tax Invoice' : 'Invoice';
    const metaRow = (label: string, value: string) => (value ? `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>` : '');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(docTitle)} ${escapeHtml(inv.number)}</title>
<style>
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:0;padding:10px;background:#fff}
.sheet{border:1px solid #111;max-width:210mm;margin:0 auto}
.topbar{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-bottom:1px solid #111}
.topbar h1{margin:0;font-size:18px;letter-spacing:.04em;text-transform:uppercase}
.copy{font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.head{display:flex;border-bottom:1px solid #111}
.head-left{flex:1.4;display:flex;gap:10px;padding:10px;border-right:1px solid #111}
.head-left img,.pi-logo-fallback{width:72px;height:72px;object-fit:contain;border:1px solid #ccc;flex-shrink:0}
.pi-logo-fallback{display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;background:#111;color:#fff}
.co h2{margin:0 0 4px;font-size:16px}
.co p{margin:0 0 2px;line-height:1.35}
.head-right{flex:1;padding:0}
.head-right table{width:100%;border-collapse:collapse}
.head-right th,.head-right td{border-bottom:1px solid #111;padding:5px 8px;text-align:left;vertical-align:top}
.head-right tr:last-child th,.head-right tr:last-child td{border-bottom:none}
.head-right th{width:38%;background:#f3f3f3;font-weight:700}
.parties{display:flex;border-bottom:1px solid #111}
.parties>div{flex:1;padding:8px 10px}
.parties>div:first-child{border-right:1px solid #111}
.parties h3{margin:0 0 4px;font-size:11px;text-transform:uppercase}
.parties p{margin:0 0 2px}
table.grid{width:100%;border-collapse:collapse}
table.grid th,table.grid td{border:1px solid #111;padding:4px 5px}
table.grid th{background:#eee;font-size:10px}
.c{text-align:center}.r{text-align:right}
.mid{display:flex;border-bottom:1px solid #111}
.mid-left{flex:1.4;padding:8px 10px;border-right:1px solid #111}
.mid-right{flex:1}
.mid-right table{width:100%;border-collapse:collapse}
.mid-right th,.mid-right td{border-bottom:1px solid #111;border-left:1px solid #111;padding:5px 8px}
.mid-right th{text-align:left;background:#f3f3f3;width:45%}
.mid-right td{text-align:right}
.mid-right tr:last-child th,.mid-right tr:last-child td{font-weight:700}
.foot{display:flex;border-top:1px solid #111;min-height:110px}
.foot>div{padding:8px 10px}
.foot-bank{flex:1.1;border-right:1px solid #111}
.foot-terms{flex:1;border-right:1px solid #111}
.foot-sign{flex:.9;text-align:right}
.foot h3{margin:0 0 4px;font-size:11px;text-transform:uppercase}
.sign-space{height:56px}
.ic-pay{margin:12px auto;max-width:210mm;padding:10px;border:1px dashed #111;display:flex;gap:14px;align-items:center}
@page{size:A4;margin:8mm}
@media print{body{padding:0}.sheet{border-width:1px}}
</style></head><body>
<div class="sheet">
  <div class="topbar"><h1>${escapeHtml(docTitle)}</h1><span class="copy">Original for recipient</span></div>
  <div class="head">
    <div class="head-left">
      ${logoBlock}
      <div class="co">
        <h2>${escapeHtml(heading)}</h2>
        ${company.legal_name && company.legal_name !== heading ? `<p>${escapeHtml(company.legal_name)}</p>` : ''}
        <p>${escapeHtml(addr(company.address as Record<string, unknown>))}</p>
        ${str(companyAddr.phone) ? `<p>Phone: ${escapeHtml(str(companyAddr.phone))}</p>` : ''}
        ${str(companyAddr.email) ? `<p>Email: ${escapeHtml(str(companyAddr.email))}</p>` : ''}
        <p><strong>GSTIN:</strong> ${escapeHtml(company.gstin || '—')}${companyState ? ` &nbsp; <strong>State:</strong> ${escapeHtml(companyState)}` : ''}</p>
        ${str(companyAddr.fssai) ? `<p><strong>FSSAI NO:</strong> ${escapeHtml(str(companyAddr.fssai))}</p>` : ''}
        ${str(companyAddr.msme) ? `<p><strong>MSME NO:</strong> ${escapeHtml(str(companyAddr.msme))}</p>` : ''}
      </div>
    </div>
    <div class="head-right">
      <table>
        ${metaRow('Invoice No.', inv.number)}
        ${metaRow('Date', invDate)}
        ${dueDate ? metaRow('Due Date', dueDate) : ''}
        ${place ? metaRow('Place of supply', place) : ''}
        ${metaRow('Ordered By', [orderedBy, orderedPhone].filter(Boolean).join(' / '))}
        ${brandName ? metaRow('Brand Name', brandName) : ''}
      </table>
    </div>
  </div>
  <div class="parties">
    <div>
      <h3>Bill To</h3>
      <p><strong>${escapeHtml(str(billParty.name) || '—')}</strong></p>
      <p>${escapeHtml(addr(billAddr))}</p>
      ${billParty.gstin ? `<p><strong>GSTIN:</strong> ${escapeHtml(billParty.gstin)}</p>` : ''}
      ${place ? `<p><strong>State:</strong> ${escapeHtml(place)}</p>` : ''}
    </div>
    <div>
      <h3>Ship To</h3>
      <p><strong>${escapeHtml(shipName || str(billParty.name) || '—')}</strong></p>
      <p>${escapeHtml(shipAddr)}</p>
    </div>
  </div>
  <table class="grid">
    <thead>
      <tr>
        <th>#</th><th>Item name</th><th>HSN/SAC</th><th>Quantity</th><th>Unit</th>
        <th>Price/Unit (₹)</th><th>Taxable amount</th><th>GST</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || `<tr><td colspan="9" class="c">No items</td></tr>`}
      <tr>
        <td colspan="3" class="r"><strong>Total</strong></td>
        <td class="r"><strong>${formatQty(qtyTotal)}</strong></td>
        <td></td><td></td>
        <td class="r"><strong>${formatInr(taxableTotal)}</strong></td>
        <td class="r"><strong>${formatInr(gstTotal)}</strong></td>
        <td class="r"><strong>${formatInr(amountTotal)}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="mid">
    <div class="mid-left">
      <p><strong>Invoice Amount in Words</strong></p>
      <p>${escapeHtml(amountInInrWords(total))}</p>
      <p style="margin-top:10px"><strong>Payment mode:</strong> ${escapeHtml(paymentMode)}</p>
    </div>
    <div class="mid-right">
      <table>
        <tr><th>Sub Total</th><td>₹ ${formatInr(amountTotal)}</td></tr>
        ${shipping ? `<tr><th>Shipping</th><td>₹ ${formatInr(shipping)}</td></tr>` : ''}
        ${otherCharges ? `<tr><th>Other charges</th><td>₹ ${formatInr(otherCharges)}</td></tr>` : ''}
        ${discount ? `<tr><th>Discount</th><td>- ₹ ${formatInr(discount)}</td></tr>` : ''}
        <tr><th>Total</th><td>₹ ${formatInr(total)}</td></tr>
        <tr><th>Received</th><td>₹ ${formatInr(paid)}</td></tr>
        <tr><th>Balance</th><td>₹ ${formatInr(balance)}</td></tr>
      </table>
    </div>
  </div>
  ${inv.gst_applicable ? `<table class="grid">
      <thead>
        <tr>
          <th rowspan="2">HSN/SAC</th>
          <th rowspan="2">Taxable amount</th>
          <th colspan="2">CGST</th>
          <th colspan="2">SGST</th>
          <th rowspan="2">Total Tax Amount</th>
        </tr>
        <tr><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></tr>
      </thead>
      <tbody>
        ${hsnTable || `<tr><td colspan="7" class="c">—</td></tr>`}
        <tr>
          <td class="r"><strong>Total</strong></td>
          <td class="r"><strong>${formatInr(hsnTaxable)}</strong></td>
          <td></td>
          <td class="r"><strong>${formatInr(hsnCgst)}</strong></td>
          <td></td>
          <td class="r"><strong>${formatInr(hsnSgst)}</strong></td>
          <td class="r"><strong>${formatInr(hsnCgst + hsnSgst)}</strong></td>
        </tr>
      </tbody>
    </table>` : ''}
  <div class="foot">
    <div class="foot-bank">
      <h3>Bank Details</h3>
      ${bankName ? `<p><strong>Name:</strong> ${escapeHtml(bankName)}</p>` : '<p>Add bank details under Organization → Companies.</p>'}
      ${str(bank.account_no) ? `<p><strong>Account No:</strong> ${escapeHtml(str(bank.account_no))}</p>` : ''}
      ${str(bank.ifsc) ? `<p><strong>IFSC code:</strong> ${escapeHtml(str(bank.ifsc))}</p>` : ''}
      ${str(bank.account_name) ? `<p><strong>Account holder's name:</strong> ${escapeHtml(str(bank.account_name))}</p>` : ''}
    </div>
    <div class="foot-terms">
      <h3>Terms and conditions</h3>
      <p>${escapeHtml(terms || defaultTerms)}</p>
    </div>
    <div class="foot-sign">
      <p>For: <strong>${escapeHtml(heading)}</strong></p>
      <div class="sign-space"></div>
      <p>Authorized Signatory</p>
    </div>
  </div>
</div>
${this.invoicePayBlockHtml(pay)}
</body></html>`;
  }

  private buildIceCrestQuotationHtml(q: Quotation, terms?: string, branding?: TenantBranding): string {
    const company = q.company as {
      name: string; legal_name?: string; gstin?: string; logo_url?: string | null;
      address?: Record<string, unknown> & { email?: string; phone?: string };
      bank_details?: Record<string, unknown>;
    };
    const party = (q.customer as { name: string; gstin?: string } | null) ?? (q.lead as { name: string } | null) ?? { name: '—' };
    const addr = (v: Record<string, unknown> | undefined) =>
      v && typeof v === 'object' && v.line1
        ? [v.line1, v.line2, v.city, v.state, v.pincode].filter(Boolean).join(', ')
        : '';
    const issueDate = new Date(q.issue_date as Date | string).toISOString().slice(0, 10);
    const validUntil = q.valid_until ? new Date(q.valid_until as Date | string).toISOString().slice(0, 10) : '—';
    const items = q.items ?? [];
    const lineRows = items.map((l, i) =>
      `<tr><td>${i + 1}</td><td>${escapeHtml(String(l.description ?? 'Ice product'))}</td><td class="right">${formatQty(Number(l.qty))}</td><td>${l.unit ?? 'pcs'}</td><td class="right">${Number(l.rate).toFixed(2)}</td><td class="right">${Number(l.amount).toFixed(2)}</td><td class="right">${Number(l.tax_rate ?? 0).toFixed(2)}%</td></tr>`,
    ).join('');
    const defaultTerms = 'Quotation valid for 7 days. Prices exclude delivery unless stated. GST as applicable.';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quotation ${escapeHtml(q.number)}</title><style>${this.iceCrestPrintStyles(branding)}</style></head><body>
${this.iceCrestLetterhead(company, addr, 'Quotation', branding)}
<p><strong>Quotation No.:</strong> ${escapeHtml(q.number)} &nbsp; <strong>Date:</strong> ${issueDate} &nbsp; <strong>Valid until:</strong> ${validUntil}</p>
<div class="ic-section"><h3>Prepared For</h3><p><strong>${escapeHtml(party.name)}</strong></p></div>
<table><thead><tr><th>#</th><th>Product / SKU</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th><th>GST</th></tr></thead><tbody>${lineRows}</tbody>
<tfoot><tr><td colspan="5" class="right"><strong>Total</strong></td><td class="right"><strong>₹${Number(q.total).toFixed(2)}</strong></td><td></td></tr></tfoot></table>
<div class="ic-terms"><p><strong>Terms &amp; Conditions</strong></p><p>${escapeHtml(terms || defaultTerms)}</p></div>
<div class="ic-sign"><p>For <strong>${escapeHtml(company?.name ?? branding?.display_name ?? 'Company')}</strong></p><p>Authorised Signatory</p></div>
</body></html>`;
  }

  private iceCrestPrintStyles(branding?: TenantBranding): string {
    const primary = branding?.primary_color || '#0891b2';
    const accent = branding?.accent_color || '#0e7490';
    return `*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;line-height:1.4;max-width:210mm;margin:0 auto;padding:14px;color:#0f172a}
.ic-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${primary};padding-bottom:10px;margin-bottom:12px}
.ic-logo{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,${primary},${accent});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:22px}
.ic-brand h1{margin:0;font-size:20px;color:${accent};text-transform:uppercase;letter-spacing:.04em}
.ic-brand p{margin:2px 0;font-size:11px;color:#475569}
.ic-doc-title{font-size:14px;font-weight:bold;color:${primary};text-transform:uppercase;text-align:right}
.ic-section{margin:10px 0}.ic-section h3{margin:0 0 4px;font-size:11px;color:${primary};text-transform:uppercase}
table{border-collapse:collapse;width:100%;font-size:10px;margin:8px 0}th,td{border:1px solid #cbd5e1;padding:5px 6px;text-align:left}th{background:#f1f5f9;color:${accent}}
.right{text-align:right}.ic-totals table{width:280px;margin-left:auto;border:none}.ic-totals td{border:none;padding:3px 0}
.ic-bank{margin-top:12px;padding:8px;background:#f8fafc;border:1px solid ${primary};border-radius:6px;font-size:11px}
.ic-pay{margin-top:12px;padding:10px;border:1px dashed ${primary};border-radius:8px;display:flex;gap:14px;align-items:center}
.ic-terms{margin-top:14px;font-size:10px;color:#475569}.ic-sign{margin-top:20px;font-size:11px}`;
  }

  private resolveLogoUrl(logoUrl?: string | null): string | null {
    if (!logoUrl?.trim()) return null;
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) return logoUrl;
    const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
    return `${base}${logoUrl.startsWith('/') ? '' : '/'}${logoUrl}`;
  }

  private iceCrestLetterhead(
    company: { name: string; legal_name?: string; gstin?: string; logo_url?: string | null; address?: Record<string, unknown> & { email?: string; phone?: string } },
    addr: (v: Record<string, unknown> | undefined) => string,
    docTitle: string,
    branding?: TenantBranding,
  ): string {
    const email = company.address?.email ? String(company.address.email) : '';
    const phone = company.address?.phone ? String(company.address.phone) : '';
    const logo = this.resolveLogoUrl(company.logo_url || branding?.logo_url);
    const heading = branding?.display_name || company.name;
    const initials = heading.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'SB';
    const logoBlock = logo
      ? `<img src="${escapeHtml(logo)}" alt="Logo" style="width:56px;height:56px;object-fit:contain;border-radius:12px"/>`
      : `<div class="ic-logo">${escapeHtml(initials)}</div>`;
    return `<div class="ic-header"><div style="display:flex;gap:12px;align-items:center">${logoBlock}<div class="ic-brand"><h1>${escapeHtml(heading)}</h1>
${company.legal_name && company.legal_name !== heading ? `<p>${escapeHtml(company.legal_name)}</p>` : ''}
<p>${escapeHtml(addr(company.address))}</p>
${email ? `<p>Email: ${escapeHtml(email)}</p>` : ''}${phone ? `<p>Phone: ${escapeHtml(phone)}</p>` : ''}
<p><strong>GSTIN:</strong> ${escapeHtml(company.gstin ?? '—')}</p></div></div><div class="ic-doc-title">${escapeHtml(docTitle)}</div></div>`;
  }

  private iceCrestBankBlock(bank: Record<string, unknown>): string {
    const name = bank.bank_name ? String(bank.bank_name) : '';
    const account = bank.account_no ? String(bank.account_no) : '';
    const ifsc = bank.ifsc ? String(bank.ifsc) : '';
    const branch = bank.branch ? String(bank.branch) : '';
    if (!name && !account) return '';
    return `<div class="ic-bank"><p><strong>Bank details for payment</strong></p>
${name ? `<p>Bank: ${escapeHtml(name)}${branch ? `, ${escapeHtml(branch)}` : ''}</p>` : ''}
${account ? `<p>A/C No.: ${escapeHtml(account)}</p>` : ''}
${ifsc ? `<p>IFSC: ${escapeHtml(ifsc)}</p>` : ''}</div>`;
  }

  private invoicePayBlockHtml(pay?: InvoicePaySlip, compact = false): string {
    if (!pay?.enabled || !pay.url) return '';
    const due = Number(pay.outstanding ?? 0).toFixed(2);
    const note = pay.accept_partial ? 'Partial or full payment accepted.' : 'Pay the full balance due.';
    const qr = pay.qr_image
      ? `<img src="${escapeHtml(pay.qr_image)}" alt="Scan to pay" style="width:${compact ? 88 : 112}px;height:${compact ? 88 : 112}px;object-fit:contain;background:#fff"/>`
      : '';
    if (compact) {
      return `<div class="section" style="text-align:center;margin-top:8px;border-top:1px dashed #000;padding-top:6px">${qr}<p><strong>Scan to pay ₹${due}</strong></p><p>${escapeHtml(note)}</p><p style="font-size:8px;word-break:break-all">${escapeHtml(pay.url)}</p></div>`;
    }
    return `<div class="ic-pay">${qr}<div><p><strong>Scan to pay</strong></p><p>Balance due ₹${due}</p><p>${escapeHtml(note)}</p><p style="font-size:9px;word-break:break-all">${escapeHtml(pay.url)}</p></div></div>`;
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
