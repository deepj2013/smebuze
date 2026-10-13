import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import { isFloorBusinessType } from '../common/tenant-client-types';
import { moneyStr, round2 } from '../common/money';
import { Company } from '../tenant/entities/company.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesService } from './sales.service';

export const DINE_CHANNEL = 'dine_in';
export const DELIVERY_CHANNEL = 'counter_delivery';
export const DEFAULT_TABLES = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
export const OPEN_KITCHEN = ['sent', 'preparing', 'ready', 'served'] as const;
export type KitchenStatus = 'sent' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled';

type FloorLineIn = { item_id: string; qty: number; note?: string };

export type FloorTicket = {
  id: string;
  number: string;
  table_no: string;
  covers: number;
  kitchen_status: KitchenStatus;
  waiter_name: string;
  guest_name: string;
  guest_phone: string;
  note: string;
  status: string;
  total: number;
  created_at: string;
  billed_invoice_id: string | null;
  company_id: string;
  customer_id: string | null;
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  lines: Array<{ id: string; item_id: string | null; name: string; qty: number; unit: string; rate: number; note?: string }>;
};

@Injectable()
export class FloorService {
  constructor(
    @InjectRepository(SalesOrder) private readonly orders: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine) private readonly lines: Repository<SalesOrderLine>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Item) private readonly items: Repository<Item>,
    private readonly sales: SalesService,
  ) {}

  private assertTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  tablesFromSettings(settings?: Record<string, unknown> | null): string[] {
    const floor = settings?.floor as { tables?: unknown } | undefined;
    if (Array.isArray(floor?.tables) && floor.tables.length) {
      return floor.tables.map((t) => String(t).trim()).filter(Boolean);
    }
    return DEFAULT_TABLES;
  }

  private shipping(order: SalesOrder): Record<string, unknown> {
    return order.shipping_json && typeof order.shipping_json === 'object' ? { ...order.shipping_json } : {};
  }

  toTicket(order: SalesOrder, tenant?: { name?: string; slug?: string } | null): FloorTicket {
    const ship = this.shipping(order);
    const kitchen = String(ship.kitchen_status || 'sent') as KitchenStatus;
    return {
      id: order.id,
      number: order.number,
      table_no: String(ship.table_no || 'T1'),
      covers: Number(ship.covers || 1),
      kitchen_status: kitchen,
      waiter_name: String(ship.waiter_name || order.requirement_given_by || ''),
      guest_name: String(ship.guest_name || ''),
      guest_phone: String(ship.guest_phone || ''),
      note: String(ship.note || order.buyer_note || ''),
      status: order.status,
      total: ship.bill_total != null ? Number(ship.bill_total) : Number(order.total || 0),
      created_at: (order.created_at || new Date()).toISOString(),
      billed_invoice_id: ship.billed_invoice_id ? String(ship.billed_invoice_id) : null,
      company_id: order.company_id,
      customer_id: order.customer_id,
      tenant_id: order.tenant_id,
      tenant_name: tenant?.name,
      tenant_slug: tenant?.slug,
      lines: (order.lines || []).map((l) => ({
        id: l.id,
        item_id: l.item_id,
        name: l.item?.name || l.description || 'Item',
        qty: Number(l.quantity || 0),
        unit: l.unit || 'pcs',
        rate: Number(l.rate || 0),
        note: l.description && l.item?.name && l.description !== l.item.name ? l.description : undefined,
      })),
    };
  }

  async saveTables(ctx: TenantContext, tablesIn: string[]) {
    const tenantId = this.assertTenant(ctx);
    const can =
      ctx.isSuperAdmin ||
      ctx.permissions.includes('*') ||
      ctx.permissions.includes('org.company.update') ||
      ctx.permissions.includes('sales.order.create');
    if (!can) throw new ForbiddenException('Ask an admin to change tables.');
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const cleaned = [...new Set((tablesIn || []).map((t) => String(t).trim()).filter(Boolean))];
    if (!cleaned.length) throw new ForbiddenException('Add at least one table');
    if (cleaned.length > 80) throw new ForbiddenException('Too many tables (max 80)');
    const floor = {
      ...((tenant.settings?.floor as Record<string, unknown>) || {}),
      tables: cleaned,
    };
    tenant.settings = { ...(tenant.settings ?? {}), floor };
    await this.tenants.save(tenant);
    return this.snapshot(ctx);
  }

  async snapshot(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    const tables = this.tablesFromSettings(tenant?.settings);
    const orders = await this.orders.find({
      where: { tenant_id: tenantId, channel: DINE_CHANNEL },
      relations: ['lines', 'lines.item', 'company'],
      order: { created_at: 'DESC' },
      take: 200,
    });
    const tickets = orders.map((o) => this.toTicket(o, tenant));
    const open = tickets.filter((t) => OPEN_KITCHEN.includes(t.kitchen_status as (typeof OPEN_KITCHEN)[number]));
    const byTable: Record<string, FloorTicket | null> = {};
    for (const name of tables) byTable[name] = open.find((t) => t.table_no === name) ?? null;
    return {
      business_type: tenant?.settings?.business_type ?? null,
      is_floor: isFloorBusinessType(tenant?.settings?.business_type),
      tables,
      tickets,
      open,
      by_table: byTable,
    };
  }

  async listKitchen(ctx: TenantContext) {
    const snap = await this.snapshot(ctx);
    return {
      ...snap,
      tickets: snap.tickets.filter((t) => ['sent', 'preparing', 'ready'].includes(t.kitchen_status)),
    };
  }

  private async walkIn(tenantId: string, companyId: string): Promise<Customer> {
    const existing = await this.customers
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere(`(c.tags @> CAST(:tag AS jsonb) OR c.name ILIKE '%walk%')`, { tag: JSON.stringify(['walk_in']) })
      .getOne();
    if (existing) return existing;
    const created = this.customers.create({
      tenant_id: tenantId,
      company_id: companyId,
      name: 'Walk-in / Table',
      entity_type: 'individual',
      tags: ['walk_in'],
      segment: 'dine_in',
      is_active: true,
      address: {},
      contacts: [],
    });
    return this.customers.save(created);
  }

  async sendTicket(
    ctx: TenantContext,
    body: {
      company_id?: string;
      table_no: string;
      covers?: number;
      waiter_name?: string;
      note?: string;
      lines: FloorLineIn[];
    },
  ) {
    const tenantId = this.assertTenant(ctx);
    if (!body.table_no?.trim()) throw new ForbiddenException('Choose a table');
    if (!body.lines?.length) throw new ForbiddenException('Add at least one dish');
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    let companyId = body.company_id;
    if (!companyId) {
      const co = await this.companies.findOne({ where: { tenant_id: tenantId, is_default: true } })
        ?? await this.companies.findOne({ where: { tenant_id: tenantId } });
      if (!co) throw new NotFoundException('Company not found');
      companyId = co.id;
    }
    const customer = await this.walkIn(tenantId, companyId);
    const open = await this.orders.find({
      where: { tenant_id: tenantId, channel: DINE_CHANNEL, status: Not(In(['completed', 'invoiced', 'cancelled'])) },
      relations: ['lines', 'lines.item'],
      order: { created_at: 'DESC' },
    });
    const existing = open.find((o) => {
      const st = String(this.shipping(o).kitchen_status || 'sent');
      return String(this.shipping(o).table_no) === body.table_no.trim() && OPEN_KITCHEN.includes(st as (typeof OPEN_KITCHEN)[number]);
    });

    const itemIds = [...new Set(body.lines.map((l) => l.item_id))];
    const catalog = await this.items.find({ where: { id: In(itemIds), tenant_id: tenantId } });
    const byId = new Map(catalog.map((i) => [i.id, i]));

    if (existing) {
      const nextLines = [...(existing.lines || [])];
      for (const row of body.lines) {
        const item = byId.get(row.item_id);
        if (!item) throw new NotFoundException('Menu item not found');
        const qty = Math.max(0.01, Number(row.qty) || 1);
        const match = nextLines.find((l) => l.item_id === item.id);
        if (match) {
          match.quantity = moneyStr(Number(match.quantity) + qty);
        } else {
          nextLines.push(
            this.lines.create({
              sales_order_id: existing.id,
              item_id: item.id,
              description: item.name,
              quantity: moneyStr(qty),
              unit: item.unit || 'plate',
              rate: moneyStr(Number(item.sale_price ?? item.mrp ?? 0)),
              sort_order: nextLines.length,
            }),
          );
        }
      }
      await this.lines.delete({ sales_order_id: existing.id });
      let total = 0;
      for (let i = 0; i < nextLines.length; i++) {
        const l = nextLines[i];
        const saved = await this.lines.save(
          this.lines.create({
            sales_order_id: existing.id,
            item_id: l.item_id,
            description: l.description,
            quantity: moneyStr(l.quantity),
            unit: l.unit,
            rate: moneyStr(l.rate),
            sort_order: i,
          }),
        );
        total = round2(total + Number(saved.quantity) * Number(saved.rate));
      }
      const ship = this.shipping(existing);
      const prev = String(ship.kitchen_status || 'sent');
      ship.kitchen_status = prev === 'preparing' ? 'preparing' : 'sent';
      ship.table_no = body.table_no.trim();
      if (body.covers) ship.covers = body.covers;
      if (body.waiter_name) ship.waiter_name = body.waiter_name;
      if (body.note != null) ship.note = body.note;
      existing.shipping_json = ship;
      existing.total = moneyStr(total);
      existing.status = 'confirmed';
      existing.buyer_note = body.note ?? existing.buyer_note;
      await this.orders.save(existing);
      return this.toTicket(await this.load(existing.id, tenantId), tenant);
    }

    let total = 0;
    const built: Array<{ item: Item; qty: number }> = [];
    for (const row of body.lines) {
      const item = byId.get(row.item_id);
      if (!item) throw new NotFoundException('Menu item not found');
      const qty = Math.max(0.01, Number(row.qty) || 1);
      total = round2(total + qty * Number(item.sale_price ?? item.mrp ?? 0));
      built.push({ item, qty });
    }
    const order = this.orders.create({
      tenant_id: tenantId,
      company_id: companyId,
      customer_id: customer.id,
      number: `KOT-${body.table_no.trim()}-${Date.now().toString().slice(-5)}`,
      order_date: new Date(),
      status: 'confirmed',
      total: moneyStr(total),
      tax_amount: '0',
      created_by: ctx.userId,
      channel: DINE_CHANNEL,
      requirement_given_by: body.waiter_name || ctx.name || ctx.email,
      requirement_channel: 'in_person',
      buyer_note: body.note ?? null,
      shipping_json: {
        table_no: body.table_no.trim(),
        covers: body.covers || 2,
        kitchen_status: 'sent',
        waiter_name: body.waiter_name || ctx.name || 'Waiter',
        note: body.note || '',
      },
    });
    const saved = await this.orders.save(order);
    for (let i = 0; i < built.length; i++) {
      const { item, qty } = built[i];
      await this.lines.save(
        this.lines.create({
          sales_order_id: saved.id,
          item_id: item.id,
          description: item.name,
          quantity: moneyStr(qty),
          unit: item.unit || 'plate',
          rate: moneyStr(Number(item.sale_price ?? item.mrp ?? 0)),
          sort_order: i,
        }),
      );
    }
    return this.toTicket(await this.load(saved.id, tenantId), tenant);
  }

  async setKitchenStatus(ctx: TenantContext, id: string, kitchen_status: KitchenStatus) {
    const tenantId = this.assertTenant(ctx);
    const allowed: KitchenStatus[] = ['sent', 'preparing', 'ready', 'served', 'cancelled'];
    if (!allowed.includes(kitchen_status)) throw new ForbiddenException('Invalid kitchen status');
    const order = await this.load(id, tenantId);
    const ship = this.shipping(order);
    if (String(ship.kitchen_status) === 'billed') throw new ForbiddenException('Ticket already billed');
    ship.kitchen_status = kitchen_status;
    order.shipping_json = ship;
    if (kitchen_status === 'cancelled') order.status = 'cancelled';
    else if (kitchen_status === 'preparing') order.status = 'processing';
    else if (kitchen_status === 'ready' || kitchen_status === 'served') order.status = 'confirmed';
    await this.orders.save(order);
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    return this.toTicket(await this.load(id, tenantId), tenant);
  }

  async billTicket(ctx: TenantContext, id: string, body: { mode?: 'cash' | 'upi' | 'card' }) {
    const tenantId = this.assertTenant(ctx);
    const order = await this.load(id, tenantId);
    const ship = this.shipping(order);
    if (String(ship.kitchen_status) === 'billed') throw new ForbiddenException('Already billed');
    if (String(ship.kitchen_status) === 'cancelled') throw new ForbiddenException('Cancelled ticket');
    if (!order.lines?.length) throw new ForbiddenException('Ticket has no items');
    if (!order.customer_id) throw new ForbiddenException('Walk-in customer missing');
    const today = new Date().toISOString().slice(0, 10);
    const invoice = await this.sales.createInvoice(
      {
        company_id: order.company_id,
        customer_id: order.customer_id,
        invoice_date: today,
        due_date: today,
        gst_applicable: true,
        lines: order.lines.map((l) => {
          const tax = Number(l.item?.tax_rate ?? 0);
          const half = tax / 2;
          return {
            item_id: l.item_id ?? undefined,
            hsn_sac: l.item?.hsn_sac || '996331',
            description: l.item?.name || l.description || 'Item',
            qty: Number(l.quantity),
            unit: l.unit,
            rate: Number(l.rate),
            cgst_rate: half,
            sgst_rate: half,
          };
        }),
      },
      ctx,
    );
    const total = Number(invoice.total);
    await this.sales.recordPayment(
      invoice.id,
      {
        amount: total,
        payment_date: today,
        mode: body.mode || 'upi',
        reference: `Table ${String(ship.table_no || '')} ${order.number}`,
      },
      ctx,
    );
    ship.kitchen_status = 'billed';
    ship.billed_invoice_id = invoice.id;
    order.shipping_json = ship;
    order.status = 'completed';
    await this.orders.save(order);
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    return { ticket: this.toTicket(await this.load(id, tenantId), tenant), invoice };
  }

  async adminList(ctx: TenantContext, q?: { status?: string; tenant?: string }) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    const where: { channel: string; tenant_id?: string } = { channel: DINE_CHANNEL };
    if (q?.tenant) {
      const t =
        (await this.tenants.findOne({ where: { slug: q.tenant } })) ||
        (await this.tenants.findOne({ where: { id: q.tenant } }).catch(() => null));
      if (t) where.tenant_id = t.id;
    }
    const orders = await this.orders.find({
      where,
      relations: ['lines', 'lines.item', 'company'],
      order: { created_at: 'DESC' },
      take: 300,
    });
    const ids = [...new Set(orders.map((o) => o.tenant_id))];
    const tenants = ids.length ? await this.tenants.find({ where: { id: In(ids) } }) : [];
    const tmap = new Map(tenants.map((t) => [t.id, t]));
    let tickets = orders.map((o) => this.toTicket(o, tmap.get(o.tenant_id)));
    if (q?.status) tickets = tickets.filter((t) => t.kitchen_status === q.status);
    return {
      tickets,
      counts: {
        sent: tickets.filter((t) => t.kitchen_status === 'sent').length,
        preparing: tickets.filter((t) => t.kitchen_status === 'preparing').length,
        ready: tickets.filter((t) => t.kitchen_status === 'ready').length,
        served: tickets.filter((t) => t.kitchen_status === 'served').length,
        billed: tickets.filter((t) => t.kitchen_status === 'billed').length,
        open: tickets.filter((t) => OPEN_KITCHEN.includes(t.kitchen_status as (typeof OPEN_KITCHEN)[number])).length,
      },
    };
  }

  async counterBoard(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    const floorSettings = tenant?.settings?.floor as { tables?: unknown } | undefined;
    const saved = Array.isArray(floorSettings?.tables)
      ? floorSettings.tables.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const isFloor = isFloorBusinessType(tenant?.settings?.business_type);
    const tables = saved.length ? saved : isFloor ? DEFAULT_TABLES : [];
    const dine = await this.orders.find({
      where: { tenant_id: tenantId, channel: DINE_CHANNEL },
      relations: ['lines', 'lines.item'],
      order: { created_at: 'DESC' },
      take: 200,
    });
    const tickets = dine.map((o) => this.toTicket(o, tenant));
    const open = tickets.filter((t) => OPEN_KITCHEN.includes(t.kitchen_status as (typeof OPEN_KITCHEN)[number]));
    const byTable: Record<string, FloorTicket | null> = {};
    for (const name of tables) byTable[name] = open.find((t) => t.table_no === name) ?? null;
    const deliveryOrders = await this.orders.find({
      where: { tenant_id: tenantId, channel: DELIVERY_CHANNEL },
      relations: ['lines', 'lines.item'],
      order: { created_at: 'DESC' },
      take: 80,
    });
    const deliveries = deliveryOrders.map((o) => this.toDelivery(o)).filter((d) => d.status === 'open');
    return { tables, open, by_table: byTable, deliveries };
  }

  async saveTableTab(
    ctx: TenantContext,
    body: {
      company_id?: string;
      table_no: string;
      customer_id?: string;
      guest_name?: string;
      guest_phone?: string;
      bill_total?: number;
      release?: boolean;
      lines: Array<{ item_id: string; qty: number; rate?: number }>;
    },
  ) {
    const tenantId = this.assertTenant(ctx);
    const table = body.table_no?.trim();
    if (!table) throw new ForbiddenException('Choose a table');
    const companyId = await this.companyId(tenantId, body.company_id);
    const existing = await this.openTable(tenantId, table);
    if (!body.lines?.length) {
      if (existing && body.release) {
        const ship = this.shipping(existing);
        ship.kitchen_status = 'cancelled';
        existing.shipping_json = ship;
        existing.status = 'cancelled';
        await this.orders.save(existing);
      } else if (!existing) {
        const walkIn = await this.walkIn(tenantId, companyId);
        const order = this.orders.create({
          tenant_id: tenantId,
          company_id: companyId,
          customer_id: body.customer_id || walkIn.id,
          number: `TBL-${table}-${Date.now().toString().slice(-5)}`,
          order_date: new Date(),
          status: 'confirmed',
          total: '0.00',
          tax_amount: '0',
          created_by: ctx.userId,
          channel: DINE_CHANNEL,
          requirement_given_by: ctx.name || ctx.email,
          requirement_channel: 'in_person',
          buyer_note: null,
          shipping_json: {
            table_no: table,
            covers: 1,
            kitchen_status: 'served',
            waiter_name: ctx.name || 'Counter',
            guest_name: (body.guest_name || '').trim(),
            guest_phone: (body.guest_phone || '').trim(),
            bill_total: 0,
            note: '',
          },
        });
        await this.orders.save(order);
      }
      return { ...(await this.counterBoard(ctx)), saved_id: existing?.id ?? null };
    }
    const { built, total } = await this.buildPricedLines(tenantId, body.lines);
    const billTotal = body.bill_total != null ? round2(Number(body.bill_total)) : total;
    if (existing) {
      await this.replaceLines(existing.id, built);
      const ship = this.shipping(existing);
      ship.table_no = table;
      ship.kitchen_status = 'served';
      ship.guest_name = (body.guest_name || '').trim();
      ship.guest_phone = (body.guest_phone || '').trim();
      ship.bill_total = billTotal;
      existing.shipping_json = ship;
      existing.total = moneyStr(total);
      existing.status = 'confirmed';
      if (body.customer_id) existing.customer_id = body.customer_id;
      await this.orders.save(existing);
      return { ...(await this.counterBoard(ctx)), saved_id: existing.id };
    }
    const customer = body.customer_id
      ? await this.customers.findOne({ where: { id: body.customer_id, tenant_id: tenantId } })
      : null;
    const walkIn = customer || (await this.walkIn(tenantId, companyId));
    const order = this.orders.create({
      tenant_id: tenantId,
      company_id: companyId,
      customer_id: walkIn.id,
      number: `TBL-${table}-${Date.now().toString().slice(-5)}`,
      order_date: new Date(),
      status: 'confirmed',
      total: moneyStr(total),
      tax_amount: '0',
      created_by: ctx.userId,
      channel: DINE_CHANNEL,
      requirement_given_by: ctx.name || ctx.email,
      requirement_channel: 'in_person',
      buyer_note: null,
      shipping_json: {
        table_no: table,
        covers: 1,
        kitchen_status: 'served',
        waiter_name: ctx.name || 'Counter',
        guest_name: (body.guest_name || '').trim(),
        guest_phone: (body.guest_phone || '').trim(),
        bill_total: billTotal,
        note: '',
      },
    });
    const saved = await this.orders.save(order);
    await this.replaceLines(saved.id, built);
    return { ...(await this.counterBoard(ctx)), saved_id: saved.id };
  }

  async saveDelivery(
    ctx: TenantContext,
    body: {
      id?: string;
      company_id?: string;
      customer_id?: string;
      name?: string;
      phone?: string;
      address?: string;
      bill_total?: number;
      lines: Array<{ item_id: string; qty: number; rate?: number }>;
    },
  ) {
    const tenantId = this.assertTenant(ctx);
    const address = (body.address || '').trim();
    if (address.length < 3) throw new ForbiddenException('Add the delivery address');
    if (!body.lines?.length) throw new ForbiddenException('Add at least one item');
    const companyId = await this.companyId(tenantId, body.company_id);
    const { built, total } = await this.buildPricedLines(tenantId, body.lines);
    const billTotal = body.bill_total != null ? round2(Number(body.bill_total)) : total;
    const shipBase = {
      name: (body.name || '').trim(),
      phone: (body.phone || '').trim(),
      address,
      status: 'open',
      bill_total: billTotal,
    };
    let order: SalesOrder | null = null;
    if (body.id) {
      order = await this.orders.findOne({ where: { id: body.id, tenant_id: tenantId, channel: DELIVERY_CHANNEL } });
      if (order && String(this.shipping(order).status || 'open') !== 'open') order = null;
    }
    if (order) {
      await this.replaceLines(order.id, built);
      order.shipping_json = { ...this.shipping(order), ...shipBase };
      order.total = moneyStr(total);
      order.status = 'confirmed';
      if (body.customer_id) order.customer_id = body.customer_id;
      await this.orders.save(order);
      return { ...(await this.counterBoard(ctx)), saved_id: order.id };
    }
    const customer = body.customer_id
      ? await this.customers.findOne({ where: { id: body.customer_id, tenant_id: tenantId } })
      : null;
    const walkIn = customer || (await this.walkIn(tenantId, companyId));
    const created = this.orders.create({
      tenant_id: tenantId,
      company_id: companyId,
      customer_id: walkIn.id,
      number: `DEL-${Date.now().toString().slice(-6)}`,
      order_date: new Date(),
      status: 'confirmed',
      total: moneyStr(total),
      tax_amount: '0',
      created_by: ctx.userId,
      channel: DELIVERY_CHANNEL,
      requirement_given_by: ctx.name || ctx.email,
      requirement_channel: 'phone',
      buyer_note: address,
      shipping_json: shipBase,
    });
    const saved = await this.orders.save(created);
    await this.replaceLines(saved.id, built);
    return { ...(await this.counterBoard(ctx)), saved_id: saved.id };
  }

  async closeCounter(
    ctx: TenantContext,
    body: { kind?: 'table' | 'delivery'; id?: string; table_no?: string; invoice_id?: string },
  ) {
    const tenantId = this.assertTenant(ctx);
    if (body.kind === 'delivery' && body.id) {
      const order = await this.orders.findOne({ where: { id: body.id, tenant_id: tenantId, channel: DELIVERY_CHANNEL } });
      if (order) await this.finishOrder(order, 'delivery', body.invoice_id);
    } else if (body.table_no?.trim()) {
      const order = await this.openTable(tenantId, body.table_no.trim());
      if (order) await this.finishOrder(order, 'table', body.invoice_id);
    }
    return this.counterBoard(ctx);
  }

  private toDelivery(order: SalesOrder) {
    const ship = this.shipping(order);
    const status = String(ship.status || 'open');
    return {
      id: order.id,
      number: order.number,
      name: String(ship.name || ''),
      phone: String(ship.phone || ''),
      address: String(ship.address || ''),
      status: status === 'done' || status === 'cancelled' ? status : 'open',
      total: ship.bill_total != null ? Number(ship.bill_total) : Number(order.total || 0),
      created_at: (order.created_at || new Date()).toISOString(),
      company_id: order.company_id,
      customer_id: order.customer_id,
      lines: (order.lines || []).map((l) => ({
        id: l.id,
        item_id: l.item_id,
        name: l.item?.name || l.description || 'Item',
        qty: Number(l.quantity || 0),
        unit: l.unit || 'pcs',
        rate: Number(l.rate || 0),
      })),
    };
  }

  private async companyId(tenantId: string, requested?: string): Promise<string> {
    if (requested) return requested;
    const co =
      (await this.companies.findOne({ where: { tenant_id: tenantId, is_default: true } })) ??
      (await this.companies.findOne({ where: { tenant_id: tenantId } }));
    if (!co) throw new NotFoundException('Company not found');
    return co.id;
  }

  private async openTable(tenantId: string, table: string): Promise<SalesOrder | null> {
    const open = await this.orders.find({
      where: { tenant_id: tenantId, channel: DINE_CHANNEL, status: Not(In(['completed', 'invoiced', 'cancelled'])) },
      order: { created_at: 'DESC' },
    });
    return (
      open.find((o) => {
        const st = String(this.shipping(o).kitchen_status || 'sent');
        return String(this.shipping(o).table_no) === table && OPEN_KITCHEN.includes(st as (typeof OPEN_KITCHEN)[number]);
      }) ?? null
    );
  }

  private async buildPricedLines(tenantId: string, rows: Array<{ item_id: string; qty: number; rate?: number }>) {
    const itemIds = [...new Set(rows.map((r) => r.item_id).filter(Boolean))];
    const catalog = await this.items.find({ where: { id: In(itemIds), tenant_id: tenantId } });
    const byId = new Map(catalog.map((i) => [i.id, i]));
    const built: Array<{ item: Item; qty: number; rate: number }> = [];
    let total = 0;
    for (const row of rows) {
      const item = byId.get(row.item_id);
      if (!item) throw new NotFoundException('Item not found');
      const qty = Math.max(0.0001, Math.round((Number(row.qty) || 0) * 10000) / 10000);
      const rate =
        row.rate != null && Number.isFinite(Number(row.rate))
          ? round2(Number(row.rate))
          : round2(Number(item.sale_price ?? item.mrp ?? 0));
      total = round2(total + round2(qty * rate));
      built.push({ item, qty, rate });
    }
    return { built, total };
  }

  private async replaceLines(orderId: string, built: Array<{ item: Item; qty: number; rate: number }>) {
    await this.lines.delete({ sales_order_id: orderId });
    for (let i = 0; i < built.length; i++) {
      const { item, qty, rate } = built[i];
      await this.lines.save(
        this.lines.create({
          sales_order_id: orderId,
          item_id: item.id,
          description: item.name,
          quantity: qty.toFixed(4),
          unit: item.unit || 'pcs',
          rate: moneyStr(rate),
          sort_order: i,
        }),
      );
    }
  }

  private async finishOrder(order: SalesOrder, kind: 'table' | 'delivery', invoiceId?: string) {
    const ship = this.shipping(order);
    if (kind === 'table') ship.kitchen_status = 'billed';
    else ship.status = 'done';
    if (invoiceId) ship.billed_invoice_id = invoiceId;
    order.shipping_json = ship;
    order.status = 'completed';
    await this.orders.save(order);
  }

  private async load(id: string, tenantId: string): Promise<SalesOrder> {
    const order = await this.orders.findOne({
      where: { id, tenant_id: tenantId, channel: DINE_CHANNEL },
      relations: ['lines', 'lines.item', 'company'],
    });
    if (!order) throw new NotFoundException('Ticket not found');
    return order;
  }
}
