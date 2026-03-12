import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../crm/entities/customer.entity';
import { Item } from '../inventory/entities/item.entity';
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

  async importItems(rows: Record<string, unknown>[], ctx: TenantContext): Promise<BulkResult> {
    const tenantId = this.assertTenantId(ctx);
    const result: BulkResult = { inserted: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const normalized = this.normalizeRow(rows[i], ITEM_COLUMNS);
      const errors = this.validateItemRow(normalized, i);

      if (errors.length > 0) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: errors.join('; ') });
        continue;
      }

      try {
        const item = this.itemRepo.create({
          tenant_id: tenantId,
          name: (normalized.name as string) || '',
          sku: (normalized.sku as string) || null,
          unit: (normalized.unit as string) || 'pcs',
          category: (normalized.category as string) || null,
          hsn_sac: (normalized.hsn_sac as string) || null,
          description: (normalized.description as string) || null,
          reorder_level: String(normalized.reorder_level ?? 0),
        });
        await this.itemRepo.save(item);
        result.inserted++;
      } catch (e) {
        result.failed++;
        result.errors.push({ rowIndex: i + 1, message: e instanceof Error ? e.message : 'Insert failed' });
      }
    }
    return result;
  }
}
