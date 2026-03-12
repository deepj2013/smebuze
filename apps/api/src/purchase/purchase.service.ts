import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { VendorPayment } from './entities/vendor-payment.entity';
import { Grn } from './entities/grn.entity';
import { GrnLine } from './entities/grn-line.entity';
import { DebitNote } from './entities/debit-note.entity';
import { TenantContext } from '../common/tenant-context';
import { RecordVendorPaymentDto } from './dto/record-vendor-payment.dto';

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(PurchaseOrder)
    private readonly orderRepo: Repository<PurchaseOrder>,
    @InjectRepository(VendorPayment)
    private readonly vendorPaymentRepo: Repository<VendorPayment>,
    @InjectRepository(Grn)
    private readonly grnRepo: Repository<Grn>,
    @InjectRepository(GrnLine)
    private readonly grnLineRepo: Repository<GrnLine>,
    @InjectRepository(DebitNote)
    private readonly debitNoteRepo: Repository<DebitNote>,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createVendor(
    dto: Partial<{ name: string; email: string; phone: string; gstin: string; address: Record<string, unknown>; company_id: string }>,
    ctx: TenantContext,
  ): Promise<Vendor> {
    const tenantId = this.assertTenantId(ctx);
    const vendor = this.vendorRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      name: dto.name ?? '',
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      gstin: dto.gstin ?? null,
      address: dto.address ?? {},
    });
    return this.vendorRepo.save(vendor);
  }

  async findVendors(ctx: TenantContext): Promise<Vendor[]> {
    const tenantId = this.assertTenantId(ctx);
    return this.vendorRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
  }

  async findOneVendor(id: string, ctx: TenantContext): Promise<Vendor> {
    const tenantId = this.assertTenantId(ctx);
    const v = await this.vendorRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  async updateVendor(
    id: string,
    dto: Partial<{ name: string; email: string; phone: string; gstin: string; address: Record<string, unknown> }>,
    ctx: TenantContext,
  ): Promise<Vendor> {
    const vendor = await this.findOneVendor(id, ctx);
    if (dto.name != null) vendor.name = dto.name;
    if (dto.email != null) vendor.email = dto.email;
    if (dto.phone != null) vendor.phone = dto.phone;
    if (dto.gstin != null) vendor.gstin = dto.gstin;
    if (dto.address != null) vendor.address = dto.address;
    return this.vendorRepo.save(vendor);
  }

  async createPurchaseOrder(
    dto: Partial<{ company_id: string; branch_id: string; vendor_id: string; number: string; order_date: string; total: number; tax_amount: number }>,
    ctx: TenantContext,
  ): Promise<PurchaseOrder> {
    const tenantId = this.assertTenantId(ctx);
    const order = this.orderRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id!,
      branch_id: dto.branch_id ?? null,
      vendor_id: dto.vendor_id!,
      number: dto.number ?? `PO-${Date.now()}`,
      order_date: dto.order_date ? new Date(dto.order_date) : new Date(),
      total: String(dto.total ?? 0),
      tax_amount: String(dto.tax_amount ?? 0),
      paid_amount: '0',
      created_by: ctx.userId,
    });
    return this.orderRepo.save(order);
  }

  async findPurchaseOrders(ctx: TenantContext, status?: string): Promise<PurchaseOrder[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.orderRepo.find({ where, relations: ['vendor'], order: { created_at: 'DESC' } });
  }

  async findOnePurchaseOrder(id: string, ctx: TenantContext): Promise<PurchaseOrder> {
    const tenantId = this.assertTenantId(ctx);
    const o = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId }, relations: ['vendor', 'company'] });
    if (!o) throw new NotFoundException('Purchase order not found');
    return o;
  }

  async updatePurchaseOrder(
    id: string,
    dto: { sent_at?: string | null; status?: string },
    ctx: TenantContext,
  ): Promise<PurchaseOrder> {
    const tenantId = this.assertTenantId(ctx);
    const o = await this.orderRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!o) throw new NotFoundException('Purchase order not found');
    if (dto.sent_at !== undefined) o.sent_at = dto.sent_at ? new Date(dto.sent_at) : null;
    if (dto.status !== undefined) o.status = dto.status;
    await this.orderRepo.save(o);
    return this.findOnePurchaseOrder(id, ctx);
  }

  async recordVendorPayment(vendorId: string, dto: RecordVendorPaymentDto, ctx: TenantContext): Promise<{ vendor: Vendor; payment: VendorPayment }> {
    const tenantId = this.assertTenantId(ctx);
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, tenant_id: tenantId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (dto.purchase_order_id) {
      const po = await this.orderRepo.findOne({ where: { id: dto.purchase_order_id, vendor_id: vendorId, tenant_id: tenantId } });
      if (!po) throw new NotFoundException('Purchase order not found');
      const total = parseFloat(po.total);
      const paid = parseFloat(po.paid_amount);
      const newPaid = paid + dto.amount;
      if (newPaid > total) throw new ForbiddenException('Payment exceeds order total');
      await this.orderRepo.update(po.id, { paid_amount: newPaid.toFixed(2) });
    }

    const payment = this.vendorPaymentRepo.create({
      tenant_id: tenantId,
      vendor_id: vendorId,
      purchase_order_id: dto.purchase_order_id ?? null,
      amount: String(dto.amount),
      payment_date: new Date(dto.payment_date),
      mode: dto.mode ?? 'cash',
      reference: dto.reference ?? null,
    });
    await this.vendorPaymentRepo.save(payment);
    return { vendor, payment };
  }

  async getPayables(ctx: TenantContext): Promise<{ orders: { id: string; number: string; vendor_id: string; vendor: string; total: number; paid: number; due: number; due_date?: string | null }[]; totalPayable: number }> {
    const tenantId = this.assertTenantId(ctx);
    const orders = await this.orderRepo.find({
      where: { tenant_id: tenantId },
      relations: ['vendor'],
      order: { order_date: 'ASC' },
    });
    const withBalance = orders
      .map((po) => ({
        id: po.id,
        number: po.number,
        vendor_id: po.vendor_id,
        vendor: (po.vendor as Vendor).name,
        total: parseFloat(po.total),
        paid: parseFloat(po.paid_amount),
        due: parseFloat(po.total) - parseFloat(po.paid_amount),
        due_date: (po as { due_date?: Date | null }).due_date ? new Date((po as { due_date: Date }).due_date).toISOString().slice(0, 10) : null,
      }))
      .filter((o) => o.due > 0);
    const totalPayable = withBalance.reduce((sum, o) => sum + o.due, 0);
    return { orders: withBalance, totalPayable };
  }

  async findVendorPayments(ctx: TenantContext, vendorId?: string): Promise<VendorPayment[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; vendor_id?: string } = { tenant_id: tenantId };
    if (vendorId) where.vendor_id = vendorId;
    return this.vendorPaymentRepo.find({
      where,
      relations: ['purchaseOrder'],
      order: { payment_date: 'DESC' },
      take: 500,
    });
  }

  async createGrn(
    dto: {
      company_id: string;
      branch_id?: string;
      purchase_order_id: string;
      number?: string;
      grn_date: string;
      lines: { item_id?: string; description?: string; ordered_qty: number; received_qty: number }[];
    },
    ctx: TenantContext,
  ): Promise<Grn> {
    const tenantId = this.assertTenantId(ctx);
    const po = await this.orderRepo.findOne({ where: { id: dto.purchase_order_id, tenant_id: tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const number = dto.number ?? `GRN-${Date.now()}`;
    const grn = this.grnRepo.create({
      tenant_id: tenantId,
      company_id: po.company_id,
      branch_id: dto.branch_id ?? po.branch_id ?? null,
      purchase_order_id: dto.purchase_order_id,
      number,
      grn_date: new Date(dto.grn_date),
      status: 'draft',
      created_by: ctx.userId,
    });
    const saved = await this.grnRepo.save(grn);
    for (let i = 0; i < (dto.lines ?? []).length; i++) {
      const l = dto.lines[i];
      await this.grnLineRepo.save(
        this.grnLineRepo.create({
          grn_id: saved.id,
          item_id: l.item_id ?? null,
          description: l.description ?? null,
          ordered_qty: String(l.ordered_qty ?? 0),
          received_qty: String(l.received_qty ?? 0),
          sort_order: i,
        }),
      );
    }
    return this.findOneGrn(saved.id, ctx);
  }

  async findGrns(ctx: TenantContext, status?: string): Promise<Grn[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.grnRepo.find({
      where,
      relations: ['purchase_order', 'company'],
      order: { grn_date: 'DESC' },
    });
  }

  async findOneGrn(id: string, ctx: TenantContext): Promise<Grn> {
    const tenantId = this.assertTenantId(ctx);
    const g = await this.grnRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['purchase_order', 'company', 'lines'],
    });
    if (!g) throw new NotFoundException('GRN not found');
    return g;
  }

  async createDebitNote(
    dto: {
      company_id?: string;
      branch_id?: string;
      purchase_order_id: string;
      number?: string;
      note_date: string;
      amount: number;
      reason?: string;
    },
    ctx: TenantContext,
  ): Promise<DebitNote> {
    const tenantId = this.assertTenantId(ctx);
    const po = await this.orderRepo.findOne({ where: { id: dto.purchase_order_id, tenant_id: tenantId } });
    if (!po) throw new NotFoundException('Purchase order not found');
    const number = dto.number ?? `DN-${Date.now()}`;
    const note = this.debitNoteRepo.create({
      tenant_id: tenantId,
      company_id: po.company_id,
      branch_id: dto.branch_id ?? po.branch_id ?? null,
      purchase_order_id: dto.purchase_order_id,
      number,
      note_date: new Date(dto.note_date),
      amount: String(dto.amount),
      reason: dto.reason ?? null,
      status: 'draft',
      created_by: ctx.userId,
    });
    return this.debitNoteRepo.save(note);
  }

  async findDebitNotes(ctx: TenantContext, status?: string): Promise<DebitNote[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.debitNoteRepo.find({
      where,
      relations: ['purchase_order', 'company'],
      order: { note_date: 'DESC' },
    });
  }

  async findOneDebitNote(id: string, ctx: TenantContext): Promise<DebitNote> {
    const tenantId = this.assertTenantId(ctx);
    const dn = await this.debitNoteRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['purchase_order', 'company'],
    });
    if (!dn) throw new NotFoundException('Debit note not found');
    return dn;
  }
}
