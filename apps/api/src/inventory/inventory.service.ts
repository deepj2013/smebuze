import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { Stock } from './entities/stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { TenantContext } from '../common/tenant-context';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
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
      tax_rate: number;
    }>,
    ctx: TenantContext,
  ) {
    const tenantId = this.assertTenantId(ctx);
    let sku = dto.sku?.trim() || null;
    if (!sku) sku = await this.generateNextSku(ctx);
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
      reorder_level: dto.reorder_level != null ? String(dto.reorder_level) : '0',
      mrp: dto.mrp != null ? String(dto.mrp) : null,
      tax_rate: dto.tax_rate != null ? String(dto.tax_rate) : '0',
    });
    return this.itemRepo.save(item);
  }

  async findItems(ctx: TenantContext) {
    const tenantId = this.assertTenantId(ctx);
    return this.itemRepo.find({ where: { tenant_id: tenantId }, order: { created_at: 'DESC' } });
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
      tax_rate: number;
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
    if (dto.category != null) item.category = dto.category;
    if (dto.hsn_sac != null) item.hsn_sac = dto.hsn_sac;
    if (dto.reorder_level != null) item.reorder_level = String(dto.reorder_level);
    if (dto.mrp !== undefined) item.mrp = dto.mrp != null ? String(dto.mrp) : null;
    if (dto.tax_rate !== undefined) item.tax_rate = dto.tax_rate != null ? String(dto.tax_rate) : '0';
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

  async findLowStock(ctx: TenantContext): Promise<{ item_id: string; name: string; sku: string | null; reorder_level: number; current_stock: number }[]> {
    const tenantId = this.assertTenantId(ctx);
    const items = await this.itemRepo.find({ where: { tenant_id: tenantId } });
    const stockList = await this.stockRepo.find({ where: { tenant_id: tenantId } });
    const byItem: Record<string, number> = {};
    for (const s of stockList) {
      byItem[s.item_id] = (byItem[s.item_id] ?? 0) + parseFloat(s.quantity);
    }
    const result: { item_id: string; name: string; sku: string | null; reorder_level: number; current_stock: number }[] = [];
    for (const item of items) {
      const reorder = parseFloat(item.reorder_level ?? '0');
      const current = byItem[item.id] ?? 0;
      if (reorder > 0 && current < reorder) {
        result.push({
          item_id: item.id,
          name: item.name,
          sku: item.sku,
          reorder_level: reorder,
          current_stock: current,
        });
      }
    }
    return result;
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
