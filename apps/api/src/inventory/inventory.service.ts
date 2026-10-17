import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Stock } from './entities/stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { TenantContext } from '../common/tenant-context';
import { moneyStr, optionalMoneyStr, round2, roundQty } from '../common/money';

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

  async createCategory(dto: { name: string; sort_order?: number; parent_id?: string | null }, ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const name = dto.name.trim();
    if (!name) throw new ForbiddenException('Category name is required');
    const parentId = dto.parent_id || null;
    if (parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: parentId, tenant_id: tenantId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parent_id) throw new BadRequestException('A subcategory cannot contain another subcategory');
    }
    // Case-insensitive match under the same parent (avoids "Grocery" + "grocery").
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name });
    if (parentId) qb.andWhere('c.parent_id = :parentId', { parentId });
    else qb.andWhere('c.parent_id IS NULL');
    const existing = await qb.getOne();
    if (existing) {
      if (!existing.is_active) {
        existing.is_active = true;
        existing.name = name;
        existing.sort_order = dto.sort_order ?? existing.sort_order;
        return this.categoryRepo.save(existing);
      }
      throw new ConflictException('That category already exists (same name under this department)');
    }
    return this.categoryRepo.save(
      this.categoryRepo.create({
        tenant_id: tenantId,
        name,
        parent_id: parentId,
        sort_order: dto.sort_order ?? 0,
        is_active: true,
      }),
    );
  }

  /**
   * Same product name + brand + pack size in one category is a duplicate
   * ("Turmeric powder" MDH 50g twice). Different brands/sizes are allowed.
   */
  private async assertNameNotDuplicate(
    tenantId: string,
    name: string,
    category: string,
    opts?: { brand?: string | null; size?: string | null; excludeId?: string },
  ) {
    const key = this.normalizeComparableName(name);
    if (!key) return;
    const catKey = this.normalizeComparableName(category);
    const brandKey = this.normalizeComparableName(opts?.brand || '');
    const sizeKey = this.normalizeComparableName(opts?.size || '');
    const qb = this.itemRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true');
    if (opts?.excludeId) qb.andWhere('i.id <> :excludeId', { excludeId: opts.excludeId });
    const candidates = await qb.getMany();
    const hit = candidates.find((i) => {
      if (this.normalizeComparableName(i.name) !== key) return false;
      if (this.normalizeComparableName(i.category || '') !== catKey) return false;
      if (this.normalizeComparableName(i.brand || '') !== brandKey) return false;
      return this.normalizeComparableName(i.variant_size || '') === sizeKey;
    });
    if (hit) {
      const brandBit = hit.brand ? ` · ${hit.brand}` : '';
      const sizeBit = hit.variant_size ? ` · ${hit.variant_size}` : '';
      throw new ConflictException(
        `“${hit.name}${brandBit}${sizeBit}” already exists in this category. Edit that product, or change brand/size.`,
      );
    }
  }

  /** Reject duplicate SKU / barcode for this tenant (active items). */
  private async assertItemCodesUnique(
    tenantId: string,
    opts: { sku?: string | null; barcode?: string | null; excludeId?: string },
  ) {
    const sku = opts.sku?.trim() || null;
    const barcode = opts.barcode?.trim() || null;
    if (sku) {
      const qb = this.itemRepo
        .createQueryBuilder('i')
        .where('i.tenant_id = :tenantId', { tenantId })
        .andWhere('i.is_active = true')
        .andWhere('LOWER(COALESCE(i.sku, \'\')) = LOWER(:sku)', { sku });
      if (opts.excludeId) qb.andWhere('i.id <> :excludeId', { excludeId: opts.excludeId });
      const hit = await qb.getOne();
      if (hit) throw new ConflictException(`SKU "${sku}" is already used by "${hit.name}"`);
    }
    if (barcode) {
      const qb = this.itemRepo
        .createQueryBuilder('i')
        .where('i.tenant_id = :tenantId', { tenantId })
        .andWhere('i.is_active = true')
        .andWhere('LOWER(COALESCE(i.barcode, \'\')) = LOWER(:barcode)', { barcode });
      if (opts.excludeId) qb.andWhere('i.id <> :excludeId', { excludeId: opts.excludeId });
      const hit = await qb.getOne();
      if (hit) throw new ConflictException(`Barcode "${barcode}" is already used by "${hit.name}"`);
    }
  }

  async updateCategory(id: string, dto: { name?: string; sort_order?: number; is_active?: boolean; parent_id?: string | null }, ctx: TenantContext) {
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
    if (dto.parent_id !== undefined) {
      const parentId = dto.parent_id || null;
      if (parentId === id) throw new BadRequestException('A category cannot sit under itself');
      if (parentId) {
        const parent = await this.categoryRepo.findOne({ where: { id: parentId, tenant_id: tenantId } });
        if (!parent) throw new NotFoundException('Parent category not found');
        if (parent.parent_id) throw new BadRequestException('A subcategory cannot contain another subcategory');
      }
      row.parent_id = parentId;
    }
    // Block rename/move into a sibling that already has the same name (case-insensitive).
    {
      const checkName = row.name;
      const parentId = row.parent_id;
      const qb = this.categoryRepo
        .createQueryBuilder('c')
        .where('c.tenant_id = :tenantId', { tenantId })
        .andWhere('c.id <> :id', { id })
        .andWhere('LOWER(c.name) = LOWER(:name)', { name: checkName });
      if (parentId) qb.andWhere('c.parent_id = :parentId', { parentId });
      else qb.andWhere('c.parent_id IS NULL');
      const clash = await qb.getOne();
      if (clash) throw new ConflictException('That category already exists (same name under this department)');
    }
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

  private packQtyStr(n: number): string | null {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return null;
    return (Math.round(v * 10000) / 10000).toFixed(4);
  }

  private async assertPackLink(sourceId: string | null, packQty: string | null, selfId: string | null, ctx: TenantContext) {
    if (!sourceId) return;
    if (selfId && sourceId === selfId) throw new BadRequestException('A pack cannot be filled from itself');
    const source = await this.findOneItem(sourceId, ctx);
    if (!source.for_consume && source.for_sale) {
      throw new BadRequestException('The bulk item should be the stock you buy, not another sale pack');
    }
    const qty = Number(packQty ?? 0);
    if (!(qty > 0)) throw new BadRequestException('Enter how much of the bulk unit one pack uses. Example: 0.05 kg for a 50g pack.');
  }

  private async ensureSubcategory(parentName: string, childName: string, ctx: TenantContext) {
    const parent = parentName.trim();
    const child = childName.trim();
    if (!parent || !child) return;
    await this.ensureCategory(parent, ctx);
    const tenantId = this.assertTenantId(ctx);
    const parentRow = await this.categoryRepo.findOne({
      where: { tenant_id: tenantId, name: parent, parent_id: IsNull() },
    });
    if (!parentRow) return;
    try {
      await this.createCategory({ name: child, parent_id: parentRow.id }, ctx);
    } catch (e) {
      if (!(e instanceof ConflictException)) throw e;
    }
  }

  async importMenuRow(category: string, subcategory: string | null | undefined, ctx: TenantContext) {
    const parent = category.trim();
    if (!parent) return;
    await this.ensureCategory(parent, ctx);
    if (subcategory?.trim()) await this.ensureSubcategory(parent, subcategory, ctx);
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

  /** "Taka tak" / "full cream" → "takatak" / "fullcream" for duplicate checks. */
  private normalizeComparableName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private sanitizeLocaleNames(raw: unknown): Record<string, string> | null {
    if (!raw || typeof raw !== 'object') return null;
    const allowed = new Set(['hi', 'mr', 'gu', 'pa', 'bn', 'ta', 'te', 'kn', 'ml']);
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!allowed.has(k) || typeof v !== 'string') continue;
      const t = v.trim();
      if (t) out[k] = t.slice(0, 255);
    }
    return Object.keys(out).length ? out : null;
  }

  /** Accept uploaded /uploads/... paths (or https URLs). Reject huge data: URLs that blow the API body. */
  private sanitizeImageUrls(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string') continue;
      const url = entry.trim();
      if (!url) continue;
      if (url.startsWith('data:')) {
        throw new BadRequestException(
          'Picture must be uploaded first. Tap the picture again after it finishes uploading, then Save.',
        );
      }
      if (url.startsWith('/uploads/') || url.startsWith('http://') || url.startsWith('https://')) {
        out.push(url);
      }
    }
    return out.slice(0, 10);
  }

  async generateNextSku(ctx: TenantContext): Promise<{ sku: string }> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenantId },
      select: ['sku'],
      order: { created_at: 'DESC' },
      take: 2000,
    });
    let maxNum = 0;
    const skuPrefix = 'ITM-';
    for (const i of items) {
      if (i.sku?.startsWith(skuPrefix)) {
        const num = parseInt(i.sku.slice(skuPrefix.length), 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return { sku: `${skuPrefix}${String(maxNum + 1).padStart(5, '0')}` };
  }

  /** Code-39-safe shop barcode (BC00001) for stickers when the pack has no manufacturer code. */
  async generateNextBarcode(ctx: TenantContext): Promise<{ barcode: string }> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenantId },
      select: ['barcode'],
      order: { created_at: 'DESC' },
      take: 2000,
    });
    let maxNum = 0;
    const prefix = 'BC';
    for (const i of items) {
      const b = (i.barcode || '').trim().toUpperCase();
      if (b.startsWith(prefix) && /^BC\d+$/.test(b)) {
        const num = parseInt(b.slice(prefix.length), 10);
        if (!Number.isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return { barcode: `${prefix}${String(maxNum + 1).padStart(5, '0')}` };
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
      portal_listed: boolean;
      opening_qty: number;
      brand: string;
      subcategory: string;
      variant_size: string;
      variant_shape: string;
      pack_source_id: string | null;
      pack_qty: number | null;
      sale_mode: string;
      /** Local-script product names: { hi: 'हल्दी', mr: '...' } */
      names?: Record<string, string>;
    }>,
    ctx: TenantContext,
  ) {
    const tenantId = this.assertTenantId(ctx);
    let sku = dto.sku?.trim() || null;
    if (!sku) sku = (await this.generateNextSku(ctx)).sku;
    const barcode = dto.barcode?.trim() || null;
    const brand = dto.brand?.trim() || null;
    const variantSize = dto.variant_size?.trim() || null;
    await this.assertItemCodesUnique(tenantId, { sku, barcode });
    const nameTrim = (dto.name ?? '').trim();
    if (nameTrim) {
      await this.assertNameNotDuplicate(tenantId, nameTrim, (dto.category ?? '').trim(), {
        brand,
        size: variantSize,
      });
    }
    const gst = await this.resolveItemGst(dto, tenantId);
    const forSale = dto.for_sale !== undefined ? Boolean(dto.for_sale) : true;
    const forConsume = dto.for_consume !== undefined ? Boolean(dto.for_consume) : true;
    this.assertSaleOrConsume(forSale, forConsume);
    const imageUrls = this.sanitizeImageUrls(dto.image_urls);
    const item = this.itemRepo.create({
      tenant_id: tenantId,
      company_id: dto.company_id ?? null,
      name: dto.name ?? '',
      brand,
      sku,
      barcode,
      image_urls: imageUrls,
      description: dto.description ?? null,
      unit: dto.unit ?? 'pcs',
      category: dto.category ?? null,
      subcategory: dto.subcategory?.trim() || null,
      variant_size: variantSize,
      variant_shape: dto.variant_shape?.trim() || null,
      pack_source_id: dto.pack_source_id || null,
      pack_qty: dto.pack_qty != null ? this.packQtyStr(dto.pack_qty) : null,
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
      portal_listed: dto.portal_listed === true,
      metadata: {
        sale_mode: dto.sale_mode === 'loose' ? 'loose' : 'fixed',
        ...(this.sanitizeLocaleNames(dto.names) ? { names: this.sanitizeLocaleNames(dto.names) } : {}),
      },
    });
    await this.assertPackLink(item.pack_source_id, item.pack_qty, null, ctx);
    const saved = await this.itemRepo.save(item);
    if (dto.category?.trim()) await this.ensureCategory(dto.category, ctx);
    if (dto.subcategory?.trim() && dto.category?.trim()) await this.ensureSubcategory(dto.category, dto.subcategory, ctx);
    if (dto.opening_qty && dto.opening_qty > 0) {
      const warehouseId = await this.getDefaultWarehouse(ctx);
      if (warehouseId) await this.receiveStock(ctx, warehouseId, saved.id, dto.opening_qty);
    }
    return saved;
  }

  async findItems(ctx: TenantContext, purpose?: 'sale' | 'consume') {
    const tenantId = this.assertTenantId(ctx);
    const where: { tenant_id: string; is_active?: boolean; for_sale?: boolean; for_consume?: boolean } = {
      tenant_id: tenantId,
      is_active: true,
    };
    if (purpose === 'sale') where.for_sale = true;
    if (purpose === 'consume') where.for_consume = true;
    return this.itemRepo.find({ where, order: { name: 'ASC', created_at: 'DESC' } });
  }

  /** Lookup by barcode or SKU (USB scanner / camera). */
  async findItemsByCode(code: string, ctx: TenantContext, withStock = false) {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
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
    return items.map((item) => ({
      ...item,
      current_stock: byItem[item.id] ?? 0,
      source_stock: item.pack_source_id ? (byItem[item.pack_source_id] ?? 0) : null,
    }));
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
    return items.map((item) => ({
      ...item,
      current_stock: byItem[item.id] ?? 0,
      source_stock: item.pack_source_id ? (byItem[item.pack_source_id] ?? 0) : null,
    }));
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
      portal_listed: boolean;
      is_active: boolean;
      brand: string | null;
      subcategory: string | null;
      variant_size: string | null;
      variant_shape: string | null;
      pack_source_id: string | null;
      pack_qty: number | null;
      sale_mode: string;
      names?: Record<string, string> | null;
    }>,
    ctx: TenantContext,
  ) {
    const item = await this.findOneItem(id, ctx);
    const nextSku = dto.sku != null ? dto.sku.trim() || null : item.sku;
    const nextBarcode = dto.barcode !== undefined ? dto.barcode?.trim() || null : item.barcode;
    const nextBrand = dto.brand !== undefined ? dto.brand?.trim() || null : item.brand;
    const nextSize = dto.variant_size !== undefined ? dto.variant_size?.trim() || null : item.variant_size;
    await this.assertItemCodesUnique(item.tenant_id, {
      sku: nextSku,
      barcode: nextBarcode,
      excludeId: item.id,
    });
    if (dto.name != null || dto.category != null || dto.brand !== undefined || dto.variant_size !== undefined) {
      const nextName = dto.name != null ? dto.name.trim() : item.name;
      const nextCat = dto.category != null ? dto.category.trim() : (item.category || '');
      if (nextName) {
        await this.assertNameNotDuplicate(item.tenant_id, nextName, nextCat, {
          brand: nextBrand,
          size: nextSize,
          excludeId: item.id,
        });
      }
    }
    if (dto.name != null) item.name = dto.name;
    if (dto.brand !== undefined) item.brand = nextBrand;
    if (dto.sku != null) item.sku = nextSku;
    if (dto.barcode !== undefined) item.barcode = nextBarcode;
    if (dto.image_urls !== undefined) item.image_urls = this.sanitizeImageUrls(dto.image_urls);
    if (dto.description != null) item.description = dto.description;
    if (dto.unit != null) item.unit = dto.unit;
    if (dto.category != null) {
      item.category = dto.category;
      if (dto.category.trim()) await this.ensureCategory(dto.category, ctx);
    }
    if (dto.subcategory !== undefined) item.subcategory = dto.subcategory?.trim() || null;
    if (dto.variant_size !== undefined) item.variant_size = nextSize;
    if (dto.variant_shape !== undefined) item.variant_shape = dto.variant_shape?.trim() || null;
    if (dto.pack_source_id !== undefined) item.pack_source_id = dto.pack_source_id || null;
    if (dto.pack_qty !== undefined) item.pack_qty = dto.pack_qty == null ? null : this.packQtyStr(dto.pack_qty);
    if (dto.subcategory?.trim() && (dto.category?.trim() || item.category)) {
      await this.ensureSubcategory(dto.category?.trim() || item.category || '', dto.subcategory, ctx);
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
    if (dto.sale_mode === 'loose' || dto.sale_mode === 'fixed') {
      item.metadata = { ...(item.metadata || {}), sale_mode: dto.sale_mode };
    }
    if (dto.names !== undefined) {
      const names = this.sanitizeLocaleNames(dto.names);
      const meta = { ...(item.metadata || {}) };
      if (names) meta.names = names;
      else delete meta.names;
      item.metadata = meta;
    }
    if (dto.portal_listed !== undefined) item.portal_listed = Boolean(dto.portal_listed);
    if (dto.is_active !== undefined) item.is_active = Boolean(dto.is_active);
    await this.assertPackLink(item.pack_source_id, item.pack_qty, item.id, ctx);
    return this.itemRepo.save(item);
  }

  /** Soft-delete: hide from sales/POS lists. Prefer this over hard delete when stock history exists. */
  async deactivateItem(id: string, ctx: TenantContext) {
    const item = await this.findOneItem(id, ctx);
    item.is_active = false;
    item.portal_listed = false;
    return this.itemRepo.save(item);
  }

  /**
   * Deactivate duplicate SKUs for this tenant.
   * Groups by lower(sku) when sku present, else by lower(name).
   * Keeps the oldest row (or the one with most stock if stock differs).
   */
  async deactivateDuplicateItems(ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { created_at: 'ASC' },
    });
    const stockList = await this.stockRepo.find({ where: { tenant_id: tenantId }, select: ['item_id', 'quantity'] });
    const stockByItem: Record<string, number> = {};
    for (const s of stockList) {
      stockByItem[s.item_id] = (stockByItem[s.item_id] ?? 0) + Number(s.quantity || 0);
    }
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.sku?.trim()
        ? `sku:${item.sku.trim().toLowerCase()}`
        : `name:${item.name.trim().toLowerCase()}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    const deactivated: Array<{ id: string; sku: string | null; name: string; kept_id: string }> = [];
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const ranked = [...group].sort((a, b) => {
        const stockDiff = (stockByItem[b.id] ?? 0) - (stockByItem[a.id] ?? 0);
        if (stockDiff !== 0) return stockDiff;
        return a.created_at.getTime() - b.created_at.getTime();
      });
      const keep = ranked[0];
      for (const dup of ranked.slice(1)) {
        dup.is_active = false;
        dup.portal_listed = false;
        await this.itemRepo.save(dup);
        deactivated.push({ id: dup.id, sku: dup.sku, name: dup.name, kept_id: keep.id });
      }
    }
    return { deactivated_count: deactivated.length, deactivated };
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

  private parseExpiryDate(raw?: string | null): Date | null {
    if (!raw || !String(raw).trim()) return null;
    const d = new Date(`${String(raw).trim().slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private async findReceiveRow(
    tenantId: string,
    warehouseId: string,
    itemId: string,
    batchCode: string | null,
  ): Promise<Stock | null> {
    if (batchCode) {
      return this.stockRepo.findOne({
        where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId, batch_code: batchCode },
      });
    }
    return this.stockRepo.findOne({
      where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId, batch_code: IsNull() },
    });
  }

  /** Add stock (receive). Creates or updates stock row. Optional batch + expiry for FEFO awareness. */
  async receiveStock(
    ctx: TenantContext,
    warehouseId: string,
    itemId: string,
    quantity: number,
    opts?: { batch_code?: string | null; expiry_date?: string | null },
  ): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    await this.findOneWarehouse(warehouseId, ctx);
    const batch = opts?.batch_code?.trim() || null;
    const expiry = this.parseExpiryDate(opts?.expiry_date);
    let row = await this.findReceiveRow(tenantId, warehouseId, itemId, batch);
    const qty = Math.max(0, roundQty(quantity));
    if (row) {
      row.quantity = String(parseFloat(row.quantity) + qty);
      if (expiry) {
        // Keep the earlier expiry when merging into the same batch.
        if (!row.expiry_date || expiry < new Date(row.expiry_date)) row.expiry_date = expiry;
      }
      await this.stockRepo.save(row);
    } else {
      row = this.stockRepo.create({
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        item_id: itemId,
        quantity: String(qty),
        reserved: '0',
        batch_code: batch,
        expiry_date: expiry,
      });
      await this.stockRepo.save(row);
    }
  }

  /** Add stock in measured units (kg, grams) without rounding to a whole number. */
  async receiveMeasured(
    ctx: TenantContext,
    warehouseId: string,
    itemId: string,
    quantity: number,
    opts?: { batch_code?: string | null; expiry_date?: string | null },
  ): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    await this.findOneWarehouse(warehouseId, ctx);
    await this.findOneItem(itemId, ctx);
    const batch = opts?.batch_code?.trim() || null;
    const expiry = this.parseExpiryDate(opts?.expiry_date);
    const qty = Math.round(Math.max(0, Number(quantity) || 0) * 10000) / 10000;
    let row = await this.findReceiveRow(tenantId, warehouseId, itemId, batch);
    if (row) {
      row.quantity = (Math.round((parseFloat(row.quantity) + qty) * 10000) / 10000).toFixed(4);
      if (expiry) {
        if (!row.expiry_date || expiry < new Date(row.expiry_date)) row.expiry_date = expiry;
      }
      await this.stockRepo.save(row);
    } else {
      row = this.stockRepo.create({
        tenant_id: tenantId,
        warehouse_id: warehouseId,
        item_id: itemId,
        quantity: qty.toFixed(4),
        reserved: '0',
        batch_code: batch,
        expiry_date: expiry,
      });
      await this.stockRepo.save(row);
    }
  }

  async setItemCost(ctx: TenantContext, itemId: string, cost: number): Promise<void> {
    if (!Number.isFinite(cost) || cost < 0) return;
    const item = await this.findOneItem(itemId, ctx);
    item.cost_price = cost.toFixed(2);
    await this.itemRepo.save(item);
  }

  /**
   * Counter sale. A packed item reduces the bulk stock (50g pack uses 0.05 kg).
   * Items with no pack link keep the existing whole-unit deduction.
   */
  async deductForSale(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const item = await this.findOneItem(itemId, ctx);
    const perPack = Number(item.pack_qty ?? 0);
    if (item.pack_source_id && perPack > 0) {
      const need = Math.round(Math.max(0, quantity) * perPack * 10000) / 10000;
      await this.deductMeasured(ctx, warehouseId, item.pack_source_id, need);
      return;
    }
    const loose = item.metadata?.sale_mode === 'loose' || Math.abs(quantity - Math.round(quantity)) > 0.00005;
    if (loose) {
      await this.deductMeasured(ctx, warehouseId, itemId, quantity);
      return;
    }
    await this.deductStock(ctx, warehouseId, itemId, quantity);
  }

  /** Put stock back after a counter return. Packed items return quantity to the bulk item. */
  async restoreForSale(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const item = await this.findOneItem(itemId, ctx);
    const perPack = Number(item.pack_qty ?? 0);
    if (item.pack_source_id && Number.isFinite(perPack) && perPack > 0) {
      await this.receiveMeasured(ctx, warehouseId, item.pack_source_id, quantity * perPack);
      return;
    }
    const loose = item.metadata?.sale_mode === 'loose' || Math.abs(quantity - Math.round(quantity)) > 0.00005;
    if (loose) {
      await this.receiveMeasured(ctx, warehouseId, itemId, quantity);
      return;
    }
    await this.receiveStock(ctx, warehouseId, itemId, quantity);
  }

  /** Deduct a measured quantity (kg, litre) without rounding it to a whole number. */
  private async deductMeasured(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    const row = await this.stockRepo.findOne({ where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId } });
    const qty = Math.round(Math.max(0, quantity) * 10000) / 10000;
    const source = await this.findOneItem(itemId, ctx);
    if (!row) throw new ForbiddenException(`No stock of ${source.name}. Receive the bulk quantity before selling packs.`);
    const current = parseFloat(row.quantity);
    if (current + 0.00001 < qty) {
      throw new ForbiddenException(`Not enough ${source.name}: have ${current} ${source.unit}, need ${qty} ${source.unit}.`);
    }
    row.quantity = (Math.round((current - qty) * 10000) / 10000).toFixed(4);
    await this.stockRepo.save(row);
  }

  /** Deduct stock (e.g. on delivery). Throws if insufficient. */
  async deductStock(ctx: TenantContext, warehouseId: string, itemId: string, quantity: number): Promise<void> {
    const tenantId = this.assertTenantId(ctx);
    const row = await this.stockRepo.findOne({ where: { tenant_id: tenantId, warehouse_id: warehouseId, item_id: itemId } });
    const qty = Math.max(0, roundQty(quantity));
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

  /**
   * Stock lots with an expiry date that is already past or within the next `withinDays` days.
   * Helps shops push soon-to-expire packs (grocery, pharma, dairy).
   */
  async findExpiringStock(
    ctx: TenantContext,
    withinDays = 30,
    warehouseId?: string,
  ): Promise<
    {
      id: string;
      item_id: string;
      name: string;
      sku: string | null;
      brand: string | null;
      batch_code: string | null;
      expiry_date: string;
      days_left: number;
      quantity: number;
      warehouse: string | null;
      warehouse_id: string;
      status: 'expired' | 'this_week' | 'this_month' | 'upcoming';
    }[]
  > {
    const tenantId = this.assertTenantId(ctx);
    const days = Math.min(365, Math.max(1, Math.floor(Number(withinDays) || 30)));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const until = new Date(today);
    until.setDate(until.getDate() + days);

    const qb = this.stockRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.item', 'item')
      .leftJoinAndSelect('s.warehouse', 'warehouse')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.expiry_date IS NOT NULL')
      .andWhere('CAST(s.quantity AS DECIMAL) > 0')
      .andWhere('s.expiry_date <= :until', { until: until.toISOString().slice(0, 10) })
      .orderBy('s.expiry_date', 'ASC');
    if (warehouseId) qb.andWhere('s.warehouse_id = :warehouseId', { warehouseId });

    const rows = await qb.getMany();
    return rows.map((s) => {
      const exp = new Date(`${String(s.expiry_date).slice(0, 10)}T00:00:00`);
      const daysLeft = Math.round((exp.getTime() - today.getTime()) / 86400000);
      let status: 'expired' | 'this_week' | 'this_month' | 'upcoming' = 'upcoming';
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 7) status = 'this_week';
      else if (daysLeft <= 30) status = 'this_month';
      return {
        id: s.id,
        item_id: s.item_id,
        name: s.item?.name ?? 'Item',
        sku: s.item?.sku ?? null,
        brand: s.item?.brand ?? null,
        batch_code: s.batch_code,
        expiry_date: String(s.expiry_date).slice(0, 10),
        days_left: daysLeft,
        quantity: parseFloat(String(s.quantity)) || 0,
        warehouse: s.warehouse?.name ?? null,
        warehouse_id: s.warehouse_id,
        status,
      };
    });
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
