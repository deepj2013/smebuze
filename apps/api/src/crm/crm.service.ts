import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { Customer } from './entities/customer.entity';
import { FollowUp } from './entities/follow-up.entity';
import { TenantContext } from '../common/tenant-context';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    private readonly salesService: SalesService,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createLead(
    dto: Partial<{ name: string; email: string; phone: string; stage: string; source: string; company_id: string; category_id: string; tags: string[]; deal_value: number | null; metadata: Record<string, unknown> }>,
    ctx: TenantContext,
  ): Promise<Lead> {
    const tenantId = this.assertTenantId(ctx);
    const lead = this.leadRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      category_id: dto.category_id ?? null,
      name: dto.name ?? '',
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      stage: dto.stage ?? 'new',
      source: dto.source ?? null,
      deal_value: dto.deal_value != null ? String(dto.deal_value) : null,
      metadata: dto.metadata && typeof dto.metadata === 'object' ? dto.metadata : {},
      tags: Array.isArray(dto.tags) ? dto.tags : [],
    });
    return this.leadRepo.save(lead);
  }

  async findLeads(ctx: TenantContext, stage?: string, deal_stage?: string, tag?: string): Promise<Lead[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; stage?: string; deal_stage?: string } = { tenant_id: tenantId };
    if (stage) where.stage = stage;
    if (deal_stage) where.deal_stage = deal_stage;
    let list = await this.leadRepo.find({ where, order: { created_at: 'DESC' } });
    if (tag) list = list.filter((l) => Array.isArray(l.tags) && l.tags.includes(tag));
    return list;
  }

  async findOneLead(id: string, ctx: TenantContext): Promise<Lead> {
    const tenantId = this.assertTenantId(ctx);
    const lead = await this.leadRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async createCustomer(
    dto: Partial<{
      name: string;
      email: string;
      phone: string;
      gstin: string;
      address: Record<string, unknown>;
      company_id: string;
      category_id: string;
      credit_limit: number;
      tags: string[];
      segment: string;
      entity_type: string;
      contacts: Record<string, unknown>[];
    }>,
    ctx: TenantContext,
  ): Promise<Customer> {
    const tenantId = this.assertTenantId(ctx);
    const customer = this.customerRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      category_id: dto.category_id ?? null,
      name: dto.name ?? '',
      entity_type: dto.entity_type ?? 'company',
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      gstin: dto.gstin ?? null,
      address: dto.address ?? {},
      credit_limit: dto.credit_limit != null ? String(dto.credit_limit) : '0',
      tags: Array.isArray(dto.tags) ? dto.tags : [],
      contacts: Array.isArray(dto.contacts) ? dto.contacts : [],
      segment: dto.segment ?? null,
    });
    return this.customerRepo.save(customer);
  }

  async findCustomers(ctx: TenantContext, tag?: string): Promise<Customer[]> {
    const tenantId = this.assertTenantId(ctx);
    let list = await this.customerRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
    if (tag) list = list.filter((c) => Array.isArray(c.tags) && c.tags.includes(tag));
    return list;
  }

  async findOneCustomer(id: string, ctx: TenantContext): Promise<Customer> {
    const tenantId = this.assertTenantId(ctx);
    const customer = await this.customerRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateLead(
    id: string,
    dto: Partial<{
      name: string;
      email: string;
      phone: string;
      stage: string;
      deal_stage: string;
      deal_value: number | null;
      expected_close_date: string | null;
      source: string;
      category_id: string | null;
      tags: string[];
      metadata: Record<string, unknown>;
    }>,
    ctx: TenantContext,
  ): Promise<Lead> {
    const lead = await this.findOneLead(id, ctx);
    if (dto.name != null) lead.name = dto.name;
    if (dto.email != null) lead.email = dto.email;
    if (dto.phone != null) lead.phone = dto.phone;
    if (dto.stage != null) lead.stage = dto.stage;
    if (dto.deal_stage != null) lead.deal_stage = dto.deal_stage;
    if (dto.deal_value !== undefined) lead.deal_value = dto.deal_value != null ? String(dto.deal_value) : null;
    if (dto.expected_close_date !== undefined) lead.expected_close_date = dto.expected_close_date ? new Date(dto.expected_close_date) : null;
    if (dto.source != null) lead.source = dto.source;
    if (dto.category_id !== undefined) lead.category_id = dto.category_id;
    if (Array.isArray(dto.tags)) lead.tags = dto.tags;
    if (dto.metadata != null && typeof dto.metadata === 'object') lead.metadata = { ...lead.metadata, ...dto.metadata };
    return this.leadRepo.save(lead);
  }

  async updateCustomer(
    id: string,
    dto: Partial<{
      name: string;
      email: string;
      phone: string;
      gstin: string;
      address: Record<string, unknown>;
      credit_limit: number;
      segment: string;
      category_id: string | null;
      tags: string[];
      entity_type: string;
      contacts: Record<string, unknown>[];
    }>,
    ctx: TenantContext,
  ): Promise<Customer> {
    const customer = await this.findOneCustomer(id, ctx);
    if (dto.name != null) customer.name = dto.name;
    if (dto.entity_type !== undefined) customer.entity_type = dto.entity_type;
    if (dto.email != null) customer.email = dto.email;
    if (dto.phone != null) customer.phone = dto.phone;
    if (dto.gstin != null) customer.gstin = dto.gstin;
    if (dto.address != null) customer.address = dto.address;
    if (dto.credit_limit != null) customer.credit_limit = String(dto.credit_limit);
    if (dto.segment != null) customer.segment = dto.segment;
    if (dto.category_id !== undefined) customer.category_id = dto.category_id;
    if (Array.isArray(dto.tags)) customer.tags = dto.tags;
    if (Array.isArray(dto.contacts)) customer.contacts = dto.contacts;
    return this.customerRepo.save(customer);
  }

  async createFollowUp(
    dto: { lead_id?: string; customer_id?: string; due_at: string; note?: string },
    ctx: TenantContext,
  ): Promise<FollowUp> {
    const tenantId = this.assertTenantId(ctx);
    if (!dto.lead_id && !dto.customer_id) throw new ForbiddenException('Provide lead_id or customer_id');
    const followUp = this.followUpRepo.create({
      tenant_id: tenantId,
      lead_id: dto.lead_id ?? null,
      customer_id: dto.customer_id ?? null,
      due_at: new Date(dto.due_at),
      note: dto.note ?? null,
      status: 'pending',
      created_by: ctx.userId,
    });
    return this.followUpRepo.save(followUp);
  }

  async findFollowUps(ctx: TenantContext, filters?: { lead_id?: string; customer_id?: string }): Promise<FollowUp[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; lead_id?: string; customer_id?: string } = { tenant_id: tenantId };
    if (filters?.lead_id) where.lead_id = filters.lead_id;
    if (filters?.customer_id) where.customer_id = filters.customer_id;
    return this.followUpRepo.find({
      where,
      relations: ['lead', 'customer'],
      order: { due_at: 'ASC' },
      take: 200,
    });
  }

  async findFollowUpsDueToday(ctx: TenantContext): Promise<FollowUp[]> {
    const tenantId = this.assertTenantId(ctx);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.followUpRepo
      .createQueryBuilder('f')
      .where('f.tenant_id = :tenantId', { tenantId })
      .andWhere('f.due_at >= :start', { start })
      .andWhere('f.due_at <= :end', { end })
      .andWhere('f.status = :status', { status: 'pending' })
      .orderBy('f.due_at', 'ASC')
      .getMany();
  }

  async findOneFollowUp(id: string, ctx: TenantContext): Promise<FollowUp> {
    const tenantId = this.assertTenantId(ctx);
    const f = await this.followUpRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!f) throw new NotFoundException('Follow-up not found');
    return f;
  }

  async updateFollowUp(
    id: string,
    dto: Partial<{ due_at: string; note: string; status: string }>,
    ctx: TenantContext,
  ): Promise<FollowUp> {
    const f = await this.findOneFollowUp(id, ctx);
    if (dto.due_at != null) f.due_at = new Date(dto.due_at);
    if (dto.note != null) f.note = dto.note;
    if (dto.status != null) f.status = dto.status;
    return this.followUpRepo.save(f);
  }

  async deleteFollowUp(id: string, ctx: TenantContext): Promise<void> {
    await this.findOneFollowUp(id, ctx);
    await this.followUpRepo.delete(id);
  }

  async getCustomer360(id: string, ctx: TenantContext) {
    const customer = await this.findOneCustomer(id, ctx);
    const [followUps, invoices] = await Promise.all([
      this.findFollowUps(ctx, { customer_id: id }),
      this.salesService.findInvoices(ctx, undefined, id),
    ]);
    const lastInvoices = invoices.slice(0, 10).map((inv) => ({
      id: inv.id,
      number: inv.number,
      date: inv.invoice_date,
      total: parseFloat(inv.total),
      paid: parseFloat(inv.paid_amount),
      status: inv.status,
    }));
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        entity_type: customer.entity_type ?? 'company',
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin,
        address: customer.address,
        credit_limit: customer.credit_limit,
        segment: customer.segment,
        contacts: customer.contacts ?? [],
      },
      last_invoices: lastInvoices,
      follow_ups: followUps.slice(0, 20).map((f) => ({
        id: f.id,
        due_at: f.due_at,
        note: f.note,
        status: f.status,
      })),
    };
  }
}
