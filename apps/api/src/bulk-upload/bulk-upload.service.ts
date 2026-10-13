import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { TenantContext } from '../common/tenant-context';

const CUSTOMER_COLUMNS: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  gstin: 'gstin',
  address: 'address',
};

const ITEM_COLUMNS: Record<string, string> = {
  name: 'name',
  sku: 'sku',
  unit: 'unit',
  category: 'category',
  hsn_sac: 'hsn_sac',
  description: 'description',
  barcode: 'barcode',
  mrp: 'mrp',
  cost_price: 'cost_price',
  discount_percent: 'discount_percent',
  tax_rate: 'tax_rate',
  subcategory: 'subcategory',
  variant_size: 'variant_size',
  variant_shape: 'variant_shape',
  pack_sku: 'pack_sku',
  pack_qty: 'pack_qty',
  for_sale: 'for_sale',
  opening_qty: 'opening_qty',
  sale_mode: 'sale_mode',
};

const MENU_COLUMNS: Record<string, string> = {
  category: 'category',
  subcategory: 'subcategory',
  name: 'name',
};

export interface BulkPreviewRow {
  index: number;
  data: Record<string, unknown>;
  errors: string[];
}

export interface BulkResult {
  inserted: number;
  failed: number;
  errors: { rowIndex: number; message: string }[];
}

@Injectable()
export class BulkUploadService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly inventory: InventoryService,
  ) {}

  private assertTenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new Error('Tenant context required');
    return ctx.tenantId;
  }

  normalizeRow(row: Record<string, unknown>, columns: Record<string, string>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(columns)) {
      const val = row[key] ?? row[field] ?? row[key.toLowerCase()] ?? row[field.toLowerCase()];
      out[field] = typeof val === 'string' ? val.trim() : val ?? null;
    }
    return out;
  }

  validateCustomerRow(row: Record<string, unknown>, index: number): string[] {
    const errors: string[] = [];
    const name = (row.name as string)?.trim();
    if (!name) errors.push('name is required');
    return errors;
  }

  validateItemRow(row: Record<string, unknown>, index: number): string[] {
    const errors: string[] = [];
    const name = (row.name as string)?.trim();
    if (!name) errors.push('name is required');
    return errors;
  }

  async previewCustomers(rows: Record<string, unknown>[], ctx: TenantContext): Promise<{ preview: BulkPreviewRow[]; validCount: number }> {
    const tenantId = this.assertTenantId(ctx);
    const existingEmails = new Set(
      (await this.customerRepo.find({ where: { tenant_id: tenantId }, select: ['email'] }))
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean),
    );
    const preview: BulkPreviewRow[] = [];
    let validCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeRow(rows[i], CUSTOMER_COLUMNS);
      const errors = this.validateCustomerRow(normalized, i);
      const email = (normalized.email as string)?.toLowerCase?.();
      if (email && existingEmails.has(email)) errors.push('email already exists');
      if (errors.length === 0) validCount++;
      preview.push({ index: i + 1, data: normalized, errors });
    }
    return { preview, validCount };
  }

  async importCustomers(rows: Record<string, unknown>[], ctx: TenantContext): Promise<BulkResult> {
    const tenantId = this.assertTenantId(ctx);
    const result: BulkResult = { inserted: 0, failed: 0, errors: [] };
    const existingEmails = new Set(
      (await this.customerRepo.find({ where: { tenant_id: tenantId }, select: ['email'] }))
        .map((c) => c.email?.toLowerCase())
        .filter(Boolean),
    );

    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeRow(rows[i], CUSTOMER_COLUMNS);
      const errors = this.validateCustomerRow(normalized, i);
      const email = (normalized.email as string)?.toLowerCase?.();
      if (email && existingEmails.has(email)) errors.push('email already exists');

      if (errors.length > 0) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: errors.join('; ') });
        continue;
      }

      try {
        const customer = this.customerRepo.create({
          tenant_id: tenantId,
          name: (normalized.name as string) || '',
          email: (normalized.email as string) || null,
          phone: (normalized.phone as string) || null,
          gstin: (normalized.gstin as string) || null,
          address: typeof normalized.address === 'object' && normalized.address !== null ? (normalized.address as Record<string, unknown>) : {},
        });
        await this.customerRepo.save(customer);
        result.inserted++;
        if (email) existingEmails.add(email);
      } catch (e) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: e instanceof Error ? e.message : 'Insert failed' });
      }
    }
    return result;
  }

  async previewItems(rows: Record<string, unknown>[], ctx: TenantContext): Promise<{ preview: BulkPreviewRow[]; validCount: number }> {
    const preview: BulkPreviewRow[] = [];
    let validCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeRow(rows[i], ITEM_COLUMNS);
      const errors = this.validateItemRow(normalized, i);
      if (errors.length === 0) validCount++;
      preview.push({ index: i + 1, data: normalized, errors });
    }
    return { preview, validCount };
  }

  private numOrUndef(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  private async isIceCrest(tenantId: string): Promise<boolean> {
    const rows = await this.itemRepo.manager.query(
      'SELECT slug, settings FROM tenants WHERE id = $1 LIMIT 1',
      [tenantId],
    ) as { slug?: string; settings?: { business_type?: string } }[];
    const row = rows[0];
    return row?.slug === 'ice-crest' || row?.settings?.business_type === 'ice_crest';
  }

  async importItems(rows: Record<string, unknown>[], ctx: TenantContext): Promise<BulkResult> {
    const tenantId = this.assertTenantId(ctx);
    const result: BulkResult = { inserted: 0, failed: 0, errors: [] };
    const iceCrest = await this.isIceCrest(tenantId);

    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeRow(rows[i], ITEM_COLUMNS);
      const errors = this.validateItemRow(normalized, i);

      if (errors.length > 0) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: errors.join('; ') });
        continue;
      }

      try {
        if (iceCrest) {
          const item = this.itemRepo.create({
            tenant_id: tenantId,
            name: (normalized.name as string) || '',
            sku: (normalized.sku as string) || null,
            unit: (normalized.unit as string) || 'pcs',
            category: (normalized.category as string) || null,
            hsn_sac: (normalized.hsn_sac as string) || null,
            description: (normalized.description as string) || null,
            reorder_level: '0',
          });
          await this.itemRepo.save(item);
        } else {
          const packSku = String(normalized.pack_sku || '').trim();
          let packSourceId: string | null = null;
          if (packSku) {
            const source = await this.itemRepo.findOne({ where: { tenant_id: tenantId, sku: packSku } });
            if (!source) throw new Error(`Bulk item SKU ${packSku} was not found. Upload the loose item first.`);
            packSourceId = source.id;
          }
          const saleFlag = String(normalized.for_sale || '').trim().toLowerCase();
          const forSale = saleFlag === '' ? true : !['no', 'n', '0', 'false', 'bulk'].includes(saleFlag);
          const opening = this.numOrUndef(normalized.opening_qty);
          const wholeOpening = opening != null && Math.abs(opening - Math.round(opening)) < 0.0001;
          const saved = await this.inventory.createItem({
            name: (normalized.name as string) || '',
            sku: (normalized.sku as string) || undefined,
            barcode: (normalized.barcode as string) || undefined,
            unit: (normalized.unit as string) || 'pcs',
            category: (normalized.category as string) || undefined,
            subcategory: (normalized.subcategory as string) || undefined,
            variant_size: (normalized.variant_size as string) || undefined,
            variant_shape: (normalized.variant_shape as string) || undefined,
            hsn_sac: (normalized.hsn_sac as string) || undefined,
            description: (normalized.description as string) || undefined,
            mrp: this.numOrUndef(normalized.mrp),
            cost_price: this.numOrUndef(normalized.cost_price),
            discount_percent: this.numOrUndef(normalized.discount_percent),
            tax_rate: this.numOrUndef(normalized.tax_rate),
            pack_source_id: packSourceId,
            pack_qty: this.numOrUndef(normalized.pack_qty) ?? null,
            for_sale: forSale,
            for_consume: true,
            opening_qty: wholeOpening ? opening : undefined,
            sale_mode: String(normalized.sale_mode || '').trim().toLowerCase() === 'loose' ? 'loose' : 'fixed',
          }, ctx);
          if (opening != null && opening > 0 && !wholeOpening) {
            const warehouseId = await this.inventory.getDefaultWarehouse(ctx);
            if (warehouseId) await this.inventory.receiveMeasured(ctx, warehouseId, saved.id, opening);
          }
        }
        result.inserted++;
      } catch (e) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: e instanceof Error ? e.message : 'Insert failed' });
      }
    }
    return result;
  }

  previewMenu(rows: Record<string, unknown>[]): { preview: BulkPreviewRow[]; validCount: number } {
    const preview: BulkPreviewRow[] = [];
    let validCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeMenuRow(rows[i]);
      const errors = normalized.category ? [] : ['category is required'];
      if (errors.length === 0) validCount++;
      preview.push({ index: i + 1, data: normalized, errors });
    }
    return { preview, validCount };
  }

  private normalizeMenuRow(row: Record<string, unknown>): { category: string; subcategory: string } {
    const normalized = this.normalizeRow(row, MENU_COLUMNS);
    const category = String(normalized.category || normalized.name || '').trim();
    const subcategory = String(normalized.subcategory || '').trim();
    return { category, subcategory };
  }

  async importMenu(rows: Record<string, unknown>[], ctx: TenantContext): Promise<BulkResult> {
    this.assertTenantId(ctx);
    const result: BulkResult = { inserted: 0, failed: 0, errors: [] };
    for (let i = 0; i < rows.length; i++) {
      const row = this.normalizeMenuRow(rows[i]);
      if (!row.category) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: 'category is required' });
        continue;
      }
      try {
        await this.inventory.importMenuRow(row.category, row.subcategory, ctx);
        result.inserted++;
      } catch (e) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: e instanceof Error ? e.message : 'Insert failed' });
      }
    }
    return result;
  }
}
