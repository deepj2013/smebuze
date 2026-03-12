import { Injectable } from '@nestjs/common';
import { CrmService } from '../crm/crm.service';
import { PurchaseService } from '../purchase/purchase.service';
import { SalesService } from '../sales/sales.service';
import { InventoryService } from '../inventory/inventory.service';
import { TenantContext } from '../common/tenant-context';

const LIMIT = 8;

@Injectable()
export class SearchService {
  constructor(
    private readonly crmService: CrmService,
    private readonly purchaseService: PurchaseService,
    private readonly salesService: SalesService,
    private readonly inventoryService: InventoryService,
  ) {}

  async search(ctx: TenantContext, q: string): Promise<{
    customers: { id: string; name: string; email: string | null }[];
    vendors: { id: string; name: string; email: string | null }[];
    invoices: { id: string; number: string; total: string }[];
    items: { id: string; name: string; sku: string | null; category: string | null }[];
  }> {
    const term = (q || '').trim().toLowerCase();
    if (!term) {
      return { customers: [], vendors: [], invoices: [], items: [] };
    }

    const [customers, vendors, invoices, items] = await Promise.all([
      this.crmService.findCustomers(ctx),
      this.purchaseService.findVendors(ctx),
      this.salesService.findInvoices(ctx),
      this.inventoryService.findItems(ctx),
    ]);

    const match = (s: string | null | undefined) => (s && String(s).toLowerCase().includes(term));

    return {
      customers: customers
        .filter((c) => match(c.name) || match(c.email) || match(c.phone))
        .slice(0, LIMIT)
        .map((c) => ({ id: c.id, name: c.name, email: c.email })),
      vendors: vendors
        .filter((v) => match(v.name) || match(v.email) || match(v.phone))
        .slice(0, LIMIT)
        .map((v) => ({ id: v.id, name: v.name, email: v.email })),
      invoices: invoices
        .filter((i) => match(i.number))
        .slice(0, LIMIT)
        .map((i) => ({ id: i.id, number: i.number, total: i.total })),
      items: items
        .filter((i) => match(i.name) || match(i.sku))
        .slice(0, LIMIT)
        .map((i) => ({ id: i.id, name: i.name, sku: i.sku, category: i.category ?? null })),
    };
  }
}
