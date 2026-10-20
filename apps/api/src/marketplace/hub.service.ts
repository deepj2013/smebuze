import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Item } from '../inventory/entities/item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { HubCatalogItem } from './entities/hub-catalog-item.entity';
import { HubItemLink } from './entities/hub-item-link.entity';
import { HubOrder } from './entities/hub-order.entity';
import { HubOrderLine } from './entities/hub-order-line.entity';
import { DeliveryJob } from './entities/delivery-job.entity';
import { CommerceService } from './commerce.service';

function money(n: number): string {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function num(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? 0)) || 0;
}

@Injectable()
export class HubService {
  constructor(
    @InjectRepository(HubCatalogItem) private readonly catalogRepo: Repository<HubCatalogItem>,
    @InjectRepository(HubItemLink) private readonly linkRepo: Repository<HubItemLink>,
    @InjectRepository(HubOrder) private readonly orderRepo: Repository<HubOrder>,
    @InjectRepository(HubOrderLine) private readonly lineRepo: Repository<HubOrderLine>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(DeliveryJob) private readonly jobRepo: Repository<DeliveryJob>,
    private readonly commerce: CommerceService,
    private readonly inventory: InventoryService,
  ) {}

  private assertPlatform(ctx: TenantContext) {
    const ok =
      ctx.isSuperAdmin ||
      ctx.permissions.includes('*') ||
      ctx.permissions.includes('admin.tenant.view') ||
      ctx.permissions.includes('admin.tenant.create') ||
      ctx.permissions.includes('admin.hub.manage');
    if (!ok) throw new ForbiddenException('Platform hub admin only');
  }

  private async tenantBusinessType(tenantId: string): Promise<string> {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const bt = t?.settings?.business_type;
    return typeof bt === 'string' && bt ? bt : 'standard';
  }

  private async assertHubEnabled(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const settings = await this.commerce.getOrCreate(ctx.tenantId);
    if (!settings.restock_hub_enabled) {
      throw new ForbiddenException('Restock Hub is not enabled for this workspace');
    }
  }

  private card(item: HubCatalogItem, extras?: Record<string, unknown>) {
    const wholesale = num(item.wholesale_price);
    const mrp = item.mrp != null ? num(item.mrp) : null;
    const suggested =
      mrp != null && mrp > 0 ? Math.round(((mrp - wholesale) / mrp) * 1000) / 10 : null;
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      pack_label: item.pack_label,
      barcode: item.barcode,
      sku: item.sku,
      wholesale_price: wholesale,
      mrp,
      eta_days: item.eta_days,
      delivery_charge: num(item.delivery_charge),
      business_types: item.business_types ?? [],
      image_url: item.image_url,
      unit: item.unit,
      active: item.active,
      suggested_margin_pct: suggested,
      ...extras,
    };
  }

  // ── Admin catalog ──────────────────────────────────────────────────────────

  async adminListCatalog(ctx: TenantContext) {
    this.assertPlatform(ctx);
    const rows = await this.catalogRepo.find({ order: { sort_order: 'ASC', name: 'ASC' } });
    return rows.map((r) => this.card(r));
  }

  async adminCreateCatalog(
    ctx: TenantContext,
    body: {
      name: string;
      brand?: string;
      category?: string;
      description?: string;
      pack_label?: string;
      barcode?: string;
      sku?: string;
      wholesale_price: number;
      mrp?: number;
      cost_price?: number;
      eta_days?: number;
      delivery_charge?: number;
      business_types: string[];
      image_url?: string;
      unit?: string;
      active?: boolean;
      sort_order?: number;
    },
  ) {
    this.assertPlatform(ctx);
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Name is required');
    const types = Array.isArray(body.business_types) ? body.business_types.filter(Boolean) : [];
    if (!types.length) throw new BadRequestException('At least one business_type is required');
    const row = await this.catalogRepo.save(
      this.catalogRepo.create({
        name,
        brand: body.brand?.trim() || null,
        category: body.category?.trim() || null,
        description: body.description?.trim() || null,
        pack_label: body.pack_label?.trim() || null,
        barcode: body.barcode?.trim() || null,
        sku: body.sku?.trim() || null,
        wholesale_price: money(body.wholesale_price),
        mrp: body.mrp != null ? money(body.mrp) : null,
        cost_price: body.cost_price != null ? money(body.cost_price) : null,
        eta_days: body.eta_days ?? 2,
        delivery_charge: money(body.delivery_charge ?? 0),
        business_types: types,
        image_url: body.image_url?.trim() || null,
        unit: body.unit?.trim() || 'pcs',
        active: body.active !== false,
        sort_order: body.sort_order ?? 0,
      }),
    );
    return this.card(row);
  }

  async adminPatchCatalog(
    ctx: TenantContext,
    id: string,
    body: Partial<{
      name: string;
      brand: string | null;
      category: string | null;
      description: string | null;
      pack_label: string | null;
      barcode: string | null;
      sku: string | null;
      wholesale_price: number;
      mrp: number | null;
      cost_price: number | null;
      eta_days: number;
      delivery_charge: number;
      business_types: string[];
      image_url: string | null;
      unit: string;
      active: boolean;
      sort_order: number;
    }>,
  ) {
    this.assertPlatform(ctx);
    const row = await this.catalogRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Hub item not found');
    if (body.name != null) row.name = String(body.name).trim() || row.name;
    if (body.brand !== undefined) row.brand = body.brand?.trim() || null;
    if (body.category !== undefined) row.category = body.category?.trim() || null;
    if (body.description !== undefined) row.description = body.description?.trim() || null;
    if (body.pack_label !== undefined) row.pack_label = body.pack_label?.trim() || null;
    if (body.barcode !== undefined) row.barcode = body.barcode?.trim() || null;
    if (body.sku !== undefined) row.sku = body.sku?.trim() || null;
    if (body.wholesale_price != null) row.wholesale_price = money(body.wholesale_price);
    if (body.mrp !== undefined) row.mrp = body.mrp != null ? money(body.mrp) : null;
    if (body.cost_price !== undefined) row.cost_price = body.cost_price != null ? money(body.cost_price) : null;
    if (body.eta_days != null) row.eta_days = body.eta_days;
    if (body.delivery_charge != null) row.delivery_charge = money(body.delivery_charge);
    if (body.business_types) row.business_types = body.business_types.filter(Boolean);
    if (body.image_url !== undefined) row.image_url = body.image_url?.trim() || null;
    if (body.unit != null) row.unit = body.unit.trim() || 'pcs';
    if (body.active != null) row.active = body.active;
    if (body.sort_order != null) row.sort_order = body.sort_order;
    await this.catalogRepo.save(row);
    return this.card(row);
  }

  async adminListOrders(ctx: TenantContext, status?: string) {
    this.assertPlatform(ctx);
    const where: { status?: string } = {};
    if (status) where.status = status;
    const orders = await this.orderRepo.find({
      where,
      relations: ['lines', 'tenant'],
      order: { created_at: 'DESC' },
      take: 200,
    });
    return orders.map((o) => this.serializeOrder(o, true));
  }

  async adminPatchOrder(
    ctx: TenantContext,
    id: string,
    body: { status: string; delivery_date?: string; notes?: string },
  ) {
    this.assertPlatform(ctx);
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['lines', 'tenant'] });
    if (!order) throw new NotFoundException('Hub order not found');
    const allowed = ['placed', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
    if (!allowed.includes(body.status)) throw new BadRequestException('Invalid status');
    order.status = body.status;
    if (body.delivery_date) order.delivery_date = body.delivery_date;
    if (body.notes != null) order.admin_notes = body.notes.trim() || null;
    await this.orderRepo.save(order);

    if (body.status === 'dispatched' || body.status === 'delivered') {
      const existing = await this.jobRepo.findOne({ where: { hub_order_id: order.id } });
      if (!existing) {
        await this.jobRepo.save(
          this.jobRepo.create({
            hub_order_id: order.id,
            seller_tenant_id: order.tenant_id,
            pickup_label: 'SMEBUZE Hub warehouse',
            drop_address: { tenant_id: order.tenant_id, tenant_name: order.tenant?.name },
            fee: order.delivery_charge,
            status: body.status === 'delivered' ? 'delivered' : 'out_for_delivery',
          }),
        );
      } else if (body.status === 'delivered' && existing.status !== 'delivered') {
        existing.status = 'delivered';
        await this.jobRepo.save(existing);
      }
    }

    return this.serializeOrder(order, true);
  }

  // ── Tenant catalog / orders ────────────────────────────────────────────────

  async listCatalog(ctx: TenantContext, q?: string, category?: string) {
    await this.assertHubEnabled(ctx);
    const bt = await this.tenantBusinessType(ctx.tenantId!);
    const qb = this.catalogRepo
      .createQueryBuilder('h')
      .where('h.active = true')
      .andWhere(`(h.business_types @> :bt OR h.business_types @> :all)`, {
        bt: JSON.stringify([bt]),
        all: JSON.stringify(['*']),
      })
      .orderBy('h.sort_order', 'ASC')
      .addOrderBy('h.name', 'ASC')
      .take(200);
    if (category?.trim()) qb.andWhere('h.category ILIKE :cat', { cat: category.trim() });
    if (q?.trim()) {
      qb.andWhere('(h.name ILIKE :q OR h.brand ILIKE :q OR h.barcode ILIKE :q OR h.sku ILIKE :q)', {
        q: `%${q.trim()}%`,
      });
    }
    const rows = await qb.getMany();
    const links = await this.linkRepo.find({ where: { tenant_id: ctx.tenantId! } });
    const linkByHub = new Map(links.map((l) => [l.hub_item_id, l.item_id]));
    return rows.map((r) => this.card(r, { linked_item_id: linkByHub.get(r.id) ?? null }));
  }

  async getCatalogDetail(ctx: TenantContext, id: string) {
    await this.assertHubEnabled(ctx);
    const item = await this.catalogRepo.findOne({ where: { id, active: true } });
    if (!item) throw new NotFoundException('Hub item not found');
    const bt = await this.tenantBusinessType(ctx.tenantId!);
    const types = item.business_types ?? [];
    if (types.length && !types.includes('*') && !types.includes(bt)) {
      throw new ForbiddenException('This SKU is not available for your shop type');
    }
    const link = await this.linkRepo.findOne({ where: { tenant_id: ctx.tenantId!, hub_item_id: id } });
    let local_cost: number | null = null;
    let local_mrp: number | null = null;
    let local_margin_if_buy_hub: number | null = null;
    if (link) {
      const local = await this.itemRepo.findOne({ where: { id: link.item_id, tenant_id: ctx.tenantId! } });
      if (local) {
        local_cost = local.cost_price != null ? num(local.cost_price) : null;
        local_mrp = local.mrp != null ? num(local.mrp) : local.sale_price != null ? num(local.sale_price) : null;
        const wholesale = num(item.wholesale_price);
        const sellAt = local_mrp ?? (local.sale_price != null ? num(local.sale_price) : null);
        if (sellAt != null && sellAt > 0) {
          local_margin_if_buy_hub = Math.round(((sellAt - wholesale) / sellAt) * 1000) / 10;
        }
      }
    }
    return this.card(item, {
      description: item.description,
      linked_item_id: link?.item_id ?? null,
      local_cost,
      local_mrp,
      local_margin_if_buy_hub,
    });
  }

  async linkItem(ctx: TenantContext, hubItemId: string, itemId: string) {
    await this.assertHubEnabled(ctx);
    const hub = await this.catalogRepo.findOne({ where: { id: hubItemId, active: true } });
    if (!hub) throw new NotFoundException('Hub item not found');
    const item = await this.itemRepo.findOne({ where: { id: itemId, tenant_id: ctx.tenantId! } });
    if (!item) throw new NotFoundException('Item not found');
    let link = await this.linkRepo.findOne({ where: { tenant_id: ctx.tenantId!, hub_item_id: hubItemId } });
    if (link) {
      link.item_id = itemId;
      await this.linkRepo.save(link);
    } else {
      link = await this.linkRepo.save(
        this.linkRepo.create({ tenant_id: ctx.tenantId!, hub_item_id: hubItemId, item_id: itemId }),
      );
    }
    return { id: link.id, hub_item_id: hubItemId, item_id: itemId };
  }

  async listOrders(ctx: TenantContext) {
    await this.assertHubEnabled(ctx);
    const orders = await this.orderRepo.find({
      where: { tenant_id: ctx.tenantId! },
      relations: ['lines'],
      order: { created_at: 'DESC' },
      take: 100,
    });
    return orders.map((o) => this.serializeOrder(o, false));
  }

  async createOrder(
    ctx: TenantContext,
    body: {
      delivery_date?: string;
      notes?: string;
      warehouse_id?: string;
      lines: Array<{ hub_item_id: string; qty: number }>;
    },
    source = 'manual',
  ) {
    await this.assertHubEnabled(ctx);
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) throw new BadRequestException('Add at least one line');
    const hubIds = [...new Set(linesIn.map((l) => l.hub_item_id))];
    const hubs = await this.catalogRepo.find({ where: { id: In(hubIds), active: true } });
    const byId = new Map(hubs.map((h) => [h.id, h]));
    const bt = await this.tenantBusinessType(ctx.tenantId!);
    const links = await this.linkRepo.find({
      where: { tenant_id: ctx.tenantId!, hub_item_id: In(hubIds) },
    });
    const linkByHub = new Map(links.map((l) => [l.hub_item_id, l.item_id]));

    let subtotal = 0;
    let maxDelivery = 0;
    let maxEta = 0;
    const resolved: Array<{
      hub: HubCatalogItem;
      qty: number;
      lineTotal: number;
      itemId: string | null;
    }> = [];

    for (const line of linesIn) {
      const hub = byId.get(line.hub_item_id);
      if (!hub) throw new BadRequestException('One or more hub items are not available');
      const types = hub.business_types ?? [];
      if (types.length && !types.includes('*') && !types.includes(bt)) {
        throw new BadRequestException(`${hub.name} is not available for your shop type`);
      }
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('Quantity must be greater than zero');
      const price = num(hub.wholesale_price);
      const lineTotal = Math.round(qty * price * 100) / 100;
      subtotal += lineTotal;
      maxDelivery = Math.max(maxDelivery, num(hub.delivery_charge));
      maxEta = Math.max(maxEta, hub.eta_days || 0);
      resolved.push({ hub, qty, lineTotal, itemId: linkByHub.get(hub.id) ?? null });
    }

    let deliveryDate = body.delivery_date || null;
    if (!deliveryDate && maxEta > 0) {
      const d = new Date();
      d.setDate(d.getDate() + maxEta);
      deliveryDate = d.toISOString().slice(0, 10);
    }

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        tenant_id: ctx.tenantId!,
        number: `HUB-${Date.now().toString().slice(-8)}`,
        status: 'placed',
        source,
        delivery_date: deliveryDate,
        delivery_charge: money(maxDelivery),
        subtotal: money(subtotal),
        total: money(subtotal + maxDelivery),
        notes: body.notes?.trim() || null,
        warehouse_id: body.warehouse_id || null,
        created_by: ctx.userId ?? null,
      }),
    );

    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      await this.lineRepo.save(
        this.lineRepo.create({
          hub_order_id: order.id,
          hub_item_id: r.hub.id,
          item_id: r.itemId,
          description: r.hub.name,
          qty: String(r.qty),
          unit: r.hub.unit || 'pcs',
          wholesale_price: r.hub.wholesale_price,
          line_total: money(r.lineTotal),
          sort_order: i,
        }),
      );
    }

    const full = await this.orderRepo.findOne({ where: { id: order.id }, relations: ['lines'] });
    return this.serializeOrder(full!, false);
  }

  async orderFromShortage(
    ctx: TenantContext,
    body: { warehouse_id?: string; only_linked?: boolean; place?: boolean },
  ) {
    await this.assertHubEnabled(ctx);
    const low = await this.inventory.findLowStock(ctx);
    if (!low.length) throw new BadRequestException('No shortage items found');

    const links = await this.linkRepo.find({ where: { tenant_id: ctx.tenantId! } });
    const byItem = new Map(links.map((l) => [l.item_id, l.hub_item_id]));
    const onlyLinked = body.only_linked !== false;

    const lines: Array<{ hub_item_id: string; qty: number }> = [];
    const unmatched: Array<{ item_id: string; name: string; short_by: number }> = [];

    for (const row of low) {
      const hubId = byItem.get(row.item_id);
      const need = Math.max(1, Math.ceil((row.reorder_level || 1) - row.current_stock));
      if (hubId) {
        const existing = lines.find((l) => l.hub_item_id === hubId);
        if (existing) existing.qty += need;
        else lines.push({ hub_item_id: hubId, qty: need });
      } else {
        unmatched.push({ item_id: row.item_id, name: row.name, short_by: need });
      }
    }

    if (onlyLinked && !lines.length) {
      return {
        placed: false,
        message: 'No shortage items are linked to hub SKUs. Link items first, or set only_linked=false after adding hub matches.',
        unmatched,
        suggested_lines: [],
      };
    }

    if (!lines.length) {
      return { placed: false, message: 'Nothing to order', unmatched, suggested_lines: [] };
    }

    if (body.place === false) {
      return { placed: false, suggested_lines: lines, unmatched };
    }

    const order = await this.createOrder(
      ctx,
      {
        warehouse_id: body.warehouse_id,
        notes: 'Auto from shortage',
        lines,
      },
      'shortage',
    );
    return { placed: true, order, unmatched };
  }

  async receiveOrder(ctx: TenantContext, orderId: string, warehouseId: string) {
    await this.assertHubEnabled(ctx);
    const order = await this.orderRepo.findOne({
      where: { id: orderId, tenant_id: ctx.tenantId! },
      relations: ['lines'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['dispatched', 'delivered', 'confirmed', 'packed'].includes(order.status)) {
      throw new BadRequestException('Order is not ready to receive yet');
    }
    if (order.stock_received) throw new BadRequestException('Stock already received for this order');
    if (!warehouseId) throw new BadRequestException('warehouse_id is required');

    for (const line of order.lines ?? []) {
      let itemId = line.item_id;
      if (!itemId) {
        const hub = await this.catalogRepo.findOne({ where: { id: line.hub_item_id } });
        if (!hub) continue;
        const created = await this.inventory.createItem(
          {
            name: hub.name,
            brand: hub.brand ?? undefined,
            sku: hub.sku ?? undefined,
            barcode: hub.barcode ?? undefined,
            category: hub.category ?? undefined,
            unit: hub.unit || 'pcs',
            cost_price: num(hub.wholesale_price),
            mrp: hub.mrp != null ? num(hub.mrp) : undefined,
            sale_price: hub.mrp != null ? num(hub.mrp) : num(hub.wholesale_price),
            for_sale: true,
          },
          ctx,
        );
        itemId = created.id;
        line.item_id = itemId;
        await this.lineRepo.save(line);
        await this.linkRepo.save(
          this.linkRepo.create({
            tenant_id: ctx.tenantId!,
            hub_item_id: hub.id,
            item_id: itemId,
          }),
        ).catch(() => undefined);
      }
      await this.inventory.receiveStock(ctx, warehouseId, itemId, num(line.qty));
    }

    order.stock_received = true;
    order.warehouse_id = warehouseId;
    if (order.status !== 'delivered') order.status = 'delivered';
    await this.orderRepo.save(order);
    return this.serializeOrder(order, false);
  }

  private serializeOrder(o: HubOrder, includeTenant: boolean) {
    return {
      id: o.id,
      number: o.number,
      status: o.status,
      source: o.source,
      delivery_date: o.delivery_date,
      delivery_charge: num(o.delivery_charge),
      subtotal: num(o.subtotal),
      total: num(o.total),
      notes: o.notes,
      admin_notes: includeTenant ? o.admin_notes : undefined,
      stock_received: o.stock_received,
      warehouse_id: o.warehouse_id,
      created_at: o.created_at,
      tenant_id: includeTenant ? o.tenant_id : undefined,
      tenant_name: includeTenant ? o.tenant?.name : undefined,
      lines: (o.lines ?? []).map((l) => ({
        id: l.id,
        hub_item_id: l.hub_item_id,
        item_id: l.item_id,
        description: l.description,
        qty: num(l.qty),
        unit: l.unit,
        wholesale_price: num(l.wholesale_price),
        line_total: num(l.line_total),
      })),
    };
  }
}
