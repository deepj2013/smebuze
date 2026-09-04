import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Stock } from './entities/stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { TenantContext } from '../common/tenant-context';
import { moneyStr, optionalMoneyStr, round2 } from '../common/money';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    @InjectRepository(ItemCategory)
    private readonly categoryRepo: Repository<ItemCategory>,
    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,
    @InjectRepository(StockTransfer)
    private readonly stockTransferRepo: Repository<StockTransfer>,
    @InjectRepository(StockTransferLine)
    private readonly stockTransferLineRepo: Repository<StockTransferLine>,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  async createWarehouse(
    dto: Partial<{ name: string; code: string; company_id: string; branch_id: string; address: Record<string, unknown> }>,
    ctx: TenantContext,
  ) {
    const tenantId = this.assertTenantId(ctx);
    const wh = this.warehouseRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id!,
      branch_id: dto.branch_id ?? null,
      name: dto.name ?? '',
      code: dto.code ?? null,
      address: dto.address ?? {},
    });
    return this.warehouseRepo.save(wh);
  }

  async findWarehouses(ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    return this.warehouseRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'ASC' } });
  }

  async findOneWarehouse(id: string, ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const wh = await this.warehouseRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async updateWarehouse(
    id: string,
    dto: Partial<{ name: string; code: string; address: Record<string, unknown> }>,
    ctx: TenantContext,
  ) {
    const wh = await this.findOneWarehouse(id, ctx);
    if (dto.name != null) wh.name = dto.name;
    if (dto.code != null) wh.code = dto.code;
    if (dto.address != null) wh.address = dto.address;
    return this.warehouseRepo.save(wh);
  }

  async findCategories(ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    return this.categoryRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(dto: { name: string; sort_order?: number }, ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const name = dto.name.trim();
    if (!name) throw new ForbiddenException('Category name is required');
    const existing = await this.categoryRepo.findOne({ where: { tenant_id: tenantId, name } });
    if (existing) {
      if (!existing.is_active) {
        existing.is_active = true;
        existing.sort_order = dto.sort_order ?? existing.sort_order;
        return this.categoryRepo.save(existing);
      }
      throw new ConflictException('That category already exists');
    }
    return this.categoryRepo.save(
      this.categoryRepo.create({
        tenant_id: tenantId,
        name,
        sort_order: dto.sort_order ?? 0,
        is_active: true,
      }),
    );
  }

  async updateCategory(id: string, dto: { name?: string; sort_order?: number; is_active?: boolean }, ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const row = await this.categoryRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!row) throw new NotFoundException('Category not found');
    const oldName = row.name;
    if (dto.name != null) {
      const name = dto.name.trim();
      if (!name) throw new ForbiddenException('Category name is required');
      row.name = name;
    }
    if (dto.sort_order != null) row.sort_order = dto.sort_order;
    if (dto.is_active != null) row.is_active = dto.is_active;
    const saved = await this.categoryRepo.save(row);
    if (dto.name && dto.name.trim() !== oldName) {
      await this.itemRepo
        .createQueryBuilder()
        .update(Item)
        .set({ category: saved.name })
        .where('tenant_id = :tenantId AND category = :old', { tenantId, old: oldName })
        .execute();
    }
    return saved;
  }

  async archiveCategory(id: string, ctx: TenantContext) {
    return this.updateCategory(id, { is_active: false }, ctx);
  }

  async ensureCategory(name: string, ctx: TenantContext) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await this.createCategory({ name: trimmed }, ctx);
    } catch (e) {
      if (!(e instanceof ConflictException)) throw e;
    }
  }

  async generateNextSku(ctx: TenantContext): Promise<string> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenantId },
      select: ['sku'],
      order: { created_at: 'DESC' },
      take: 500,
    });
    let maxNum = 0;
    const skuPrefix = 'ITM-';
    for (const i of items) {
      if (i.sku?.startsWith(skuPrefix)) {
        const num = parseInt(i.sku.slice(skuPrefix.length), 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${skuPrefix}${String(maxNum + 1).padStart(5, '0')}`;
  }

  private async iceCrestGstDefaults(tenantId: string): Promise<{ cgst: number; sgst: number } | null> {
    const rows = (await this.itemRepo.manager.query(
      `SELECT slug, settings FROM tenants WHERE id = $1 LIMIT 1`,
      [tenantId],
    )) as Array<{ slug?: string; settings?: Record<string, unknown> | string }>;
    const t = rows?.[0];
    if (!t) return null;
    const settings = typeof t.settings === 'string' ? (JSON.parse(t.settings) as Record<string, unknown>) : t.settings;
    if (t.slug === 'ice-crest' || settings?.business_type === 'ice_crest') return { cgst: 2.5, sgst: 2.5 };
    return null;
  }

  private async resolveItemGst(
    dto: { tax_rate?: number; cgst_rate?: number; sgst_rate?: number },
    tenantId: string,
    existing?: { tax_rate: string; cgst_rate: string | null; sgst_rate: string | null },
  ): Promise<{ tax_rate: string; cgst_rate: string; sgst_rate: string }> {
    const hasSplit = dto.cgst_rate !== undefined || dto.sgst_rate !== undefined;
    if (hasSplit) {
      const cgst = round2(dto.cgst_rate !== undefined ? Number(dto.cgst_rate) : Number(existing?.cgst_rate ?? 0));
      const sgst = round2(dto.sgst_rate !== undefined ? Number(dto.sgst_rate) : Number(existing?.sgst_rate ?? 0));
      if (!Number.isFinite(cgst) || cgst < 0 || cgst > 100 || !Number.isFinite(sgst) || sgst < 0 || sgst > 100) {
        throw new BadRequestException('CGST and SGST must be between 0 and 100');
      }
      return { cgst_rate: moneyStr(cgst), sgst_rate: moneyStr(sgst), tax_rate: moneyStr(cgst + sgst) };
    }
    if (dto.tax_rate !== undefined) {
      const tax = round2(Number(dto.tax_rate));
      if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
        throw new BadRequestException('Tax rate must be between 0 and 100');
      }
      const half = round2(tax / 2);
      return { tax_rate: moneyStr(tax), cgst_rate: moneyStr(half), sgst_rate: moneyStr(tax - half) };
    }
    if (existing) {
      const tax = round2(Number(existing.tax_rate ?? 0));
      const half = round2(tax / 2);
      return {
        tax_rate: moneyStr(existing.tax_rate),
        cgst_rate: existing.cgst_rate != null ? moneyStr(existing.cgst_rate) : moneyStr(half),
        sgst_rate: existing.sgst_rate != null ? moneyStr(existing.sgst_rate) : moneyStr(tax - half),
      };
    }
    const ice = await this.iceCrestGstDefaults(tenantId);
    if (ice) return { cgst_rate: moneyStr(ice.cgst), sgst_rate: moneyStr(ice.sgst), tax_rate: moneyStr(ice.cgst + ice.sgst) };
    return { tax_rate: '0.00', cgst_rate: '0.00', sgst_rate: '0.00' };
  }

  private assertSaleOrConsume(forSale: boolean, forConsume: boolean) {
    if (!forSale && !forConsume) {
      throw new BadRequestException('Item must be marked for sale, for consume, or both');
    }
  }

  async createItem(
    dto: Partial<{
      name: string;
      sku: string;
      barcode: string;
      image_urls: string[];
      description: string;
      unit: string;
      category: string;
      company_id: string;
      hsn_sac: string;
      reorder_level: number;
      mrp: number;
      cost_price: number;
      sale_price: number;
      discount_percent: number;
      tax_rate: number;
      cgst_rate: number;
      sgst_rate: number;
      for_sale: boolean;
      for_consume: boolean;
      opening_qty: number;
    }>,
    ctx: TenantContext,
  ) {
    const tenantId = this.assertTenantId(ctx);
    let sku = dto.sku?.trim() || null;
    if (!sku) sku = await this.generateNextSku(ctx);
    const gst = await this.resolveItemGst(dto, tenantId);
    const forSale = dto.for_sale !== undefined ? Boolean(dto.for_sale) : true;
    const forConsume = dto.for_consume !== undefined ? Boolean(dto.for_consume) : true;
    this.assertSaleOrConsume(forSale, forConsume);
    const item = this.itemRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      name: dto.name ?? '',
      sku,
      barcode: dto.barcode?.trim() || null,
      image_urls: Array.isArray(dto.image_urls) ? dto.image_urls : [],
      description: dto.description ?? null,
      unit: dto.unit ?? 'pcs',
      category: dto.category ?? null,
      hsn_sac: dto.hsn_sac ?? null,
      reorder_level: dto.reorder_level != null ? moneyStr(dto.reorder_level) : '0.00',
      mrp: optionalMoneyStr(dto.mrp),
      cost_price: optionalMoneyStr(dto.cost_price),
      sale_price: optionalMoneyStr(dto.sale_price) ?? optionalMoneyStr(dto.mrp),
      discount_percent: optionalMoneyStr(dto.discount_percent),
      tax_rate: gst.tax_rate,
      cgst_rate: gst.cgst_rate,
      sgst_rate: gst.sgst_rate,
      for_sale: forSale,
      for_consume: forConsume,
    });
    const saved = await this.itemRepo.save(item);
    if (dto.category?.trim()) await this.ensureCategory(dto.category, ctx);
    if (dto.opening_qty && dto.opening_qty > 0) {
      const warehouseId = await this.getDefaultWarehouse(ctx);
      if (warehouseId) await this.receiveStock(ctx, warehouseId, saved.id, dto.opening_qty);
    }
    return saved;
  }

  async findItems(ctx: TenantContext, purpose?: 'sale' | 'consume') {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; for_sale?: boolean; for_consume?: boolean } = { tenant_id: tenantId };
    if (purpose === 'sale') where.for_sale = true;
    if (purpose === 'consume') where.for_consume = true;
    return this.itemRepo.find({ where, order: { created_at: 'DESC' } });
  }

  /** Lookup by barcode or SKU (USB scanner / camera). */
  async findItemsByCode(code: string, ctx: TenantContext, withStock = false) {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('(LOWER(COALESCE(i.barcode, \'\')) = LOWER(:code) OR LOWER(COALESCE(i.sku, \'\')) = LOWER(:code))', {
        code: code.trim(),
      })
      .orderBy('i.created_at', 'DESC')
      .getMany();
    if (!withStock) return items;
    const stockList = await this.stockRepo.find({ where: { tenant_id: tenantId }, select: ['item_id', 'quantity'] });
    const byItem: Record<string, number> = {};
    for (const s of stockList) {
      byItem[s.item_id] = (byItem[s.item_id] ?? 0) + parseFloat(s.quantity);
    }
    return items.map((item) => ({ ...item, current_stock: byItem[item.id] ?? 0 }));
  }

  /** Items with current stock (sum of quantity across warehouses) for list/table. */
  async findItemsWithStock(ctx: TenantContext, purpose?: 'sale' | 'consume'): Promise<(Item & { current_stock: number })[]> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.findItems(ctx, purpose);
    const stockList = await this.stockRepo.find({ where: { tenant_id: tenantId }, select: ['item_id', 'quantity'] });
    const byItem: Record<string, number> = {};
    for (const s of stockList) {
      byItem[s.item_id] = (byItem[s.item_id] ?? 0) + parseFloat(s.quantity);
    }
    return items.map((item) => ({ ...item, current_stock: byItem[item.id] ?? 0 }));
  }

  async findOneItem(id: string, ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const item = await this.itemRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async updateItem(
    id: string,
    dto: Partial<{
      name: string;
      sku: string;
      barcode: string;
      image_urls: string[];
      description: string;
      unit: string;
      category: string;
      hsn_sac: string;
      reorder_level: number;
      mrp: number;
      cost_price: number;
      sale_price: number;
      discount_percent: number;
      tax_rate: number;
      cgst_rate: number;
      sgst_rate: number;
      for_sale: boolean;
      for_consume: boolean;
    }>,
    ctx: TenantContext,
  ) {
    const item = await this.findOneItem(id, ctx);
    if (dto.name != null) item.name = dto.name;
    if (dto.sku != null) item.sku = dto.sku;
    if (dto.barcode !== undefined) item.barcode = dto.barcode?.trim() || null;
    if (dto.image_urls !== undefined) item.image_urls = Array.isArray(dto.image_urls) ? dto.image_urls : item.image_urls;
    if (dto.description != null) item.description = dto.description;
    if (dto.unit != null) item.unit = dto.unit;
    if (dto.category != null) {
      item.category = dto.category;
      if (dto.category.trim()) await this.ensureCategory(dto.category, ctx);
    }
    if (dto.hsn_sac != null) item.hsn_sac = dto.hsn_sac;
    if (dto.reorder_level != null) item.reorder_level = moneyStr(dto.reorder_level);
    if (dto.mrp !== undefined) item.mrp = optionalMoneyStr(dto.mrp);
    if (dto.cost_price !== undefined) item.cost_price = optionalMoneyStr(dto.cost_price);
    if (dto.sale_price !== undefined) item.sale_price = optionalMoneyStr(dto.sale_price);
    if (dto.discount_percent !== undefined) item.discount_percent = optionalMoneyStr(dto.discount_percent);
    if (dto.cgst_rate !== undefined || dto.sgst_rate !== undefined || dto.tax_rate !== undefined) {
      const gst = await this.resolveItemGst(dto, item.tenant_id, item);
      item.tax_rate = gst.tax_rate;
      item.cgst_rate = gst.cgst_rate;
      item.sgst_rate = gst.sgst_rate;
    }
    if (dto.for_sale !== undefined || dto.for_consume !== undefined) {
      const forSale = dto.for_sale !== undefined ? Boolean(dto.for_sale) : item.for_sale;
      const forConsume = dto.for_consume !== undefined ? Boolean(dto.for_consume) : item.for_consume;
      this.assertSaleOrConsume(forSale, forConsume);
      item.for_sale = forSale;
      item.for_consume = forConsume;
    }
    return this.itemRepo.save(item);
  }

  async findStock(ctx: TenantContext, warehouseId?: string, batchCode?: string) {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; warehouse_id?: string; batch_code?: string } = { tenant_id: tenantId };
    if (warehouseId) where.warehouse_id = warehouseId;
    if (batchCode) where.batch_code = batchCode;
    return this.stockRepo.find({ where, relations: ['item', 'warehouse'] });
  }

  /** First warehouse for tenant (e.g. for delivery deduction when no warehouse on challan). */
  async getDefaultWarehouse(ctx: TenantContext): Promise<string | null> {
    const tenantId = this.assertTenantId(ctx);
    const wh = await this.warehouseRepo.findOne({ where: { tenant_id: tenantId }, order: { created_at: 'ASC' }, select: ['id'] });
    return wh?.id ?? null;
  }

  /** Add stock (receive). Creates or updates stock row. */
  async receiveStock(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    await this.findOneWarehouse(warehouseId, ctx);
    let row = await this.stockRepo.findOne({ where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId } });
    const qty = Math.max(0, quantity);
    if (row) {
      row.quantity = String(parseFloat(row.quantity) + qty);
      await this.stockRepo.save(row);
    } else {
      row = this.stockRepo.create({ tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId, quantity: String(qty), reserved: '0' });
      await this.stockRepo.save(row);
    }
  }

  /** Deduct stock (e.g. on delivery). Throws if insufficient. */
  async deductStock(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    const row = await this.stockRepo.findOne({ where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId } });
    const qty = Math.max(0, quantity);
    if (!row) throw new ForbiddenException(`No stock record for item ${itemId} in warehouse ${warehouseId}; cannot deduct.`);
    const current = parseFloat(row.quantity);
    if (current < qty) throw new ForbiddenException(`Insufficient stock for item: have ${current}, need ${qty}.`);
    row.quantity = String(current - qty);
    await this.stockRepo.save(row);
  }

  async findLowStock(ctx: TenantContext): Promise<{ item_id: string; name: string; sku: string | null; category: string | null; reorder_level: number; current_stock: number }[]> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({ where: { tenant_id: tenantId, is_active: true } });
    const stockList = await this.stockRepo.find({ where: { tenant_id: tenantId } });
    const byItem: Record<string, number> = {};
    for (const s of stockList) {
      byItem[s.item_id] = (byItem[s.item_id] ?? 0) + parseFloat(s.quantity);
    }
    const result: { item_id: string; name: string; sku: string | null; category: string | null; reorder_level: number; current_stock: number }[] = [];
    for (const item of items) {
      const reorder = parseFloat(item.reorder_level ?? '0') || 0;
      const hasRow = Object.prototype.hasOwnProperty.call(byItem, item.id);
      const current = byItem[item.id] ?? 0;
      const shortByReorder = reorder > 0 && current <= reorder;
      const outOfStock = hasRow && current <= 0;
      if (shortByReorder || outOfStock) {
        result.push({
          item_id: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          reorder_level: reorder,
          current_stock: current,
        });
      }
    }
    return result.sort((a, b) => a.current_stock - b.current_stock);
  }

  async createStockTransfer(
    dto: {
      from_warehouse_id: string;
      to_warehouse_id: string;
      transfer_date: string;
      reference?: string;
      lines: { item_id: string; quantity: number }[];
    },
    ctx: TenantContext,
  ): Promise<StockTransfer> {
    const tenantId = this.assertTenantId(ctx);
    const fromWh = await this.warehouseRepo.findOne({ where: { id: dto.from_warehouse_id, tenant_id: tenantId } });
    if (!fromWh) throw new NotFoundException('From warehouse not found');
    const toWh = await this.warehouseRepo.findOne({ where: { id: dto.to_warehouse_id, tenant_id: tenantId } });
    if (!toWh) throw new NotFoundException('To warehouse not found');
    if (dto.from_warehouse_id === dto.to_warehouse_id) throw new ForbiddenException('From and to warehouse must be different');
    const st = this.stockTransferRepo.create({
      tenant_id: tenantId,
      from_warehouse_id: dto.from_warehouse_id,
      to_warehouse_id: dto.to_warehouse_id,
      transfer_date: new Date(dto.transfer_date),
      status: 'draft',
      reference: dto.reference ?? null,
      created_by: ctx.userId,
    });
    const saved = await this.stockTransferRepo.save(st);
    for (let i = 0; i < (dto.lines ?? []).length; i++) {
      const l = dto.lines[i];
      await this.stockTransferLineRepo.save(
        this.stockTransferLineRepo.create({
          stock_transfer_id: saved.id,
          item_id: l.item_id,
          quantity: String(l.quantity),
          sort_order: i,
        }),
      );
    }
    return this.findOneStockTransfer(saved.id, ctx);
  }

  async findStockTransfers(ctx: TenantContext, status?: string): Promise<StockTransfer[]> {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; status?: string } = { tenant_id: tenantId };
    if (status) where.status = status;
    return this.stockTransferRepo.find({
      where,
      relations: ['from_warehouse', 'to_warehouse'],
      order: { transfer_date: 'DESC' },
    });
  }

  async findOneStockTransfer(id: string, ctx: TenantContext): Promise<StockTransfer> {
    const tenantId = this.assertTenantId(ctx);
    const st = await this.stockTransferRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['from_warehouse', 'to_warehouse', 'lines', 'lines.item'],
    });
    if (!st) throw new NotFoundException('Stock transfer not found');
    return st;
  }
}
