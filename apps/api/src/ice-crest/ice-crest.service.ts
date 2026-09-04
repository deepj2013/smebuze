import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, LessThan, Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TenantContext } from '../common/tenant-context';
import { InventoryService } from '../inventory/inventory.service';
import { BusinessExpense } from './entities/business-expense.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { SalesInvoice } from '../sales/entities/sales-invoice.entity';
import { Item } from '../inventory/entities/item.entity';
import { Stock } from '../inventory/entities/stock.entity';
import { Lead } from '../crm/entities/lead.entity';
import { Vendor } from '../purchase/entities/vendor.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { Company } from '../tenant/entities/company.entity';
import { AccountingService } from '../accounting/accounting.service';
import { defaultExpenseNature, EXPENSE_NATURES, isValidExpenseNature } from '../common/gst-returns';
import { moneyStr, round2 } from '../common/money';

export { EXPENSE_NATURES };
export const ICE_CREST_EXPENSE_CATEGORIES = ['Purchase / raw material', 'Salary', 'Daily wages', 'Contract labour', 'Transport', 'Fuel', 'Electricity', 'Water', 'Rent', 'Repairs & maintenance', 'Plastic/packaging charges', 'Machinery / equipment', 'Marketing', 'Professional fees', 'Bank charges', 'Taxes & licences', 'Miscellaneous', 'Other operational expenses'];
export const ICE_CREST_ENTRY_TYPES = ['purchase','wage','salary','operating_expense','asset_purchase','statutory_payment'];

@Injectable()
export class IceCrestService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(BusinessExpense) private readonly expenseRepo: Repository<BusinessExpense>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(SalesInvoice) private readonly invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Vendor) private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(SalesOrder) private readonly orderRepo: Repository<SalesOrder>,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly dataSource:DataSource,
  ) {}

  private tenantId(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  private async assertIceCrest(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const settings = tenant?.settings ?? {};
    if (!tenant || (settings.business_type !== 'ice_crest' && !tenant.features?.includes('ice_crest'))) {
      throw new ForbiddenException('This custom feature is available only for the Ice Crest tenant');
    }
    return tenant;
  }

  async createExpense(body: { company_id?: string; entry_type?: string; expense_number?: string; vendor_id?: string; employee_name?: string; category: string; nature?: string; hsn_sac?: string; itc_eligible?: boolean; taxable_amount?: number; gst_rate?: number; tds_amount?: number; amount?: number; paid_amount?: number; expense_date: string; due_date?: string; description?: string; payment_mode?: string; reference?: string; invoice_number?: string; attachment_url?: string }, ctx: TenantContext) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    if (!ICE_CREST_EXPENSE_CATEGORIES.includes(body.category)) throw new ForbiddenException('Invalid expense category');
    const entryType=body.entry_type??'operating_expense';if(!ICE_CREST_ENTRY_TYPES.includes(entryType))throw new ForbiddenException('Invalid expense entry type');
    const nature = body.nature && isValidExpenseNature(body.nature) ? body.nature : defaultExpenseNature(body.category);
    const taxable=round2(Number(body.taxable_amount??body.amount??0)),gstRate=Number(body.gst_rate??0),tds=round2(Number(body.tds_amount??0));
    if(!Number.isFinite(taxable)||taxable<=0)throw new ForbiddenException('Taxable/base amount must be greater than zero');
    if(![0,5,12,18,28].includes(gstRate))throw new ForbiddenException('GST rate must be 0, 5, 12, 18 or 28 percent');
    const gst=round2(taxable*gstRate/100),total=round2(taxable+gst),paid=round2(Number(body.paid_amount??0));
    if(!Number.isFinite(paid)||paid<0||paid+tds>total)throw new ForbiddenException('Paid amount plus TDS cannot exceed total amount');
    if(['wage','salary'].includes(entryType)&&!body.employee_name?.trim())throw new ForbiddenException('Employee/worker name is required for wage and salary entries');
    if(entryType==='purchase'&&!body.vendor_id)throw new ForbiddenException('Vendor is required for purchase entries');
    if(body.vendor_id&&!(await this.vendorRepo.findOne({where:{id:body.vendor_id,tenant_id:tenantId}})))throw new NotFoundException('Vendor not found');
    const expenseDate=new Date(body.expense_date);if(Number.isNaN(expenseDate.getTime()))throw new ForbiddenException('Valid expense date is required');
    const dueDate=body.due_date?new Date(body.due_date):null;if(dueDate&&Number.isNaN(dueDate.getTime()))throw new ForbiddenException('Invalid due date');if(dueDate&&dueDate<expenseDate)throw new ForbiddenException('Due date cannot be before expense date');
    if(body.vendor_id&&body.invoice_number?.trim()){const duplicate=await this.expenseRepo.findOne({where:{tenant_id:tenantId,vendor_id:body.vendor_id,invoice_number:body.invoice_number.trim()}});if(duplicate)throw new ForbiddenException('This vendor invoice number is already recorded');}
    if(tds<0||tds>total)throw new ForbiddenException('TDS cannot be negative or exceed total');
    const settled=paid+tds,status=settled<=0?'unpaid':settled>=total?'paid':'partial';
    const itcEligible = body.itc_eligible === true || (body.itc_eligible !== false && gstRate > 0 && Boolean(body.vendor_id) && !['wage', 'salary', 'statutory_payment'].includes(entryType));
    const companyId = body.company_id ?? ctx.companyId ?? (await this.dataSource.getRepository(Company).findOne({ where: { tenant_id: tenantId } }))?.id ?? null;
    const saved = await this.expenseRepo.save(this.expenseRepo.create({
      tenant_id: tenantId, company_id: companyId, entry_type:entryType,expense_number:body.expense_number?.trim()||`EXP-${Date.now()}`,
      vendor_id:body.vendor_id??null,employee_name:body.employee_name?.trim()||null,category: body.category, nature, hsn_sac: body.hsn_sac?.trim() || null, itc_eligible: itcEligible,
      taxable_amount:moneyStr(taxable),gst_rate:moneyStr(gstRate),gst_amount:moneyStr(gst),tds_amount:moneyStr(tds),
      amount: moneyStr(total),paid_amount:moneyStr(paid),status,due_date:dueDate, expense_date: expenseDate,
      description: body.description ?? null, payment_mode: body.payment_mode ?? null,
      reference: body.reference ?? null,invoice_number:body.invoice_number??null,attachment_url:body.attachment_url??null, created_by: ctx.userId,
    }));
    if (saved.company_id) {
      try {
        const je = await this.postExpenseJournal(saved, ctx);
        saved.journal_entry_id = je.id;
        await this.expenseRepo.save(saved);
      } catch {
        // Expense is booked even if books posting is skipped (missing company accounts).
      }
    }
    return saved;
  }

  async listExpenses(from: string | undefined, to: string | undefined, category: string | undefined, ctx: TenantContext, nature?: string) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    const qb = this.expenseRepo.createQueryBuilder('e').where('e.tenant_id = :tenantId', { tenantId });
    if (from) qb.andWhere('e.expense_date >= :from', { from });
    if (to) qb.andWhere('e.expense_date <= :to', { to });
    if (category) qb.andWhere('e.category = :category', { category });
    if (nature) qb.andWhere('e.nature = :nature', { nature });
    return qb.orderBy('e.expense_date', 'DESC').addOrderBy('e.created_at', 'DESC').getMany();
  }

  async recordExpensePayment(id:string,body:{amount:number;payment_mode?:string;reference?:string},ctx:TenantContext){
    const tenantId=this.tenantId(ctx);await this.assertIceCrest(tenantId);const amount=round2(Number(body.amount));if(!Number.isFinite(amount)||amount<=0)throw new ForbiddenException('Payment amount must be greater than zero');
    return this.dataSource.transaction(async manager=>{const row=await manager.getRepository(BusinessExpense).createQueryBuilder('e').setLock('pessimistic_write').where('e.id=:id AND e.tenant_id=:tenantId',{id,tenantId}).getOne();if(!row)throw new NotFoundException('Expense entry not found');
      const total=Number(row.amount),paid=Number(row.paid_amount),tds=Number(row.tds_amount),outstanding=round2(total-paid-tds);if(amount>outstanding)throw new ForbiddenException(`Payment exceeds outstanding amount ${outstanding.toFixed(2)}`);
      row.paid_amount=moneyStr(paid+amount);row.status=round2(paid+amount+tds)>=total?'paid':'partial';if(body.payment_mode)row.payment_mode=body.payment_mode;if(body.reference)row.reference=body.reference;
      const saved=await manager.save(row);
      if (saved.company_id) {
        try {
          await this.accountingService.postBalancedEntry(ctx, {
            company_id: saved.company_id,
            entry_date: new Date().toISOString().slice(0, 10),
            number: `EXP-PAY-${saved.expense_number || saved.id.slice(0, 8)}-${Date.now().toString().slice(-4)}`,
            reference: saved.id,
            lines: [
              { code: 'SB-AP', debit: amount, narration: `Pay ${saved.expense_number}` },
              { code: this.accountingService.cashBankCode(body.payment_mode || saved.payment_mode), credit: amount, narration: `Pay ${saved.expense_number}` },
            ],
          });
        } catch { /* payment is recorded even if journal is skipped */ }
      }
      return saved;});
  }

  async recordMovement(body: { warehouse_id: string; item_id: string; movement_type: 'opening'|'inward'|'outward'|'adjustment'; quantity: number; movement_date?: string; notes?: string; reference_number?: string }, ctx: TenantContext) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    const qty = Number(body.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new ForbiddenException('Quantity must be greater than zero');
    if (body.movement_type === 'outward') await this.inventoryService.deductStock(ctx, body.warehouse_id, body.item_id, qty);
    else await this.inventoryService.receiveStock(ctx, body.warehouse_id, body.item_id, qty);
    return this.movementRepo.save(this.movementRepo.create({ tenant_id: tenantId, warehouse_id: body.warehouse_id,
      item_id: body.item_id, movement_type: body.movement_type, quantity: String(qty),
      movement_date: new Date(body.movement_date ?? new Date().toISOString().slice(0, 10)), reference_type: 'manual',
      reference_id: null, reference_number: body.reference_number ?? null, notes: body.notes ?? null, created_by: ctx.userId }));
  }

  async listMovements(from: string | undefined, to: string | undefined, itemId: string | undefined, ctx: TenantContext) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    const qb = this.movementRepo.createQueryBuilder('m').leftJoinAndSelect(Item, 'item', 'item.id = m.item_id')
      .where('m.tenant_id = :tenantId', { tenantId });
    if (from) qb.andWhere('m.movement_date >= :from', { from });
    if (to) qb.andWhere('m.movement_date <= :to', { to });
    if (itemId) qb.andWhere('m.item_id = :itemId', { itemId });
    return qb.select(['m', 'item.name', 'item.sku']).orderBy('m.movement_date', 'DESC').getRawAndEntities();
  }

  async dashboard(from: string, to: string, ctx: TenantContext) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    const invoices = await this.invoiceRepo.find({ where: { tenant_id: tenantId, invoice_date: Between(new Date(from), new Date(to)) } });
    const expenses = await this.expenseRepo.find({ where: { tenant_id: tenantId, expense_date: Between(new Date(from), new Date(to)) } });
    const movements = await this.movementRepo.find({ where: { tenant_id: tenantId, movement_date: Between(new Date(from), new Date(to)) } });
    const priorMovements = await this.movementRepo.find({ where: { tenant_id: tenantId, movement_date: LessThan(new Date(from)) } });
    const items = await this.itemRepo.find({ where: { tenant_id: tenantId } });
    const stock = await this.stockRepo.find({ where: { tenant_id: tenantId } });
    const sales = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const expenseBreakdown = ICE_CREST_EXPENSE_CATEGORIES.map(category => ({ category, amount: expenses.filter(e => e.category === category).reduce((s,e) => s + Number(e.amount), 0) })).filter(x => x.amount > 0);
    const expenseByNature = EXPENSE_NATURES.map(n => ({ nature: n.id, label: n.label, amount: expenses.filter(e => (e.nature || defaultExpenseNature(e.category)) === n.id).reduce((s,e) => s + Number(e.amount), 0) })).filter(x => x.amount > 0);
    const skuStock = items.map(item => ({ item_id: item.id, sku: item.sku, name: item.name,
      opening: priorMovements.filter(m=>m.item_id===item.id).reduce((s,m)=>s+(m.movement_type==='outward'?-Number(m.quantity):Number(m.quantity)),0),
      inward: movements.filter(m => m.item_id === item.id && ['opening','inward','adjustment'].includes(m.movement_type)).reduce((s,m)=>s+Number(m.quantity),0),
      outward: movements.filter(m => m.item_id === item.id && m.movement_type === 'outward').reduce((s,m)=>s+Number(m.quantity),0),
      reserved: stock.filter(s=>s.item_id===item.id).reduce((n,s)=>n+Number(s.reserved),0),
      available: stock.filter(s => s.item_id === item.id).reduce((n,s)=>n+Number(s.quantity)-Number(s.reserved),0) }));
    return { from, to, sales, expenses: totalExpenses, operating_profit: sales-totalExpenses,
      profit_margin: sales ? ((sales-totalExpenses)/sales)*100 : 0, invoice_count: invoices.length,
      expense_breakdown: expenseBreakdown, expense_by_nature: expenseByNature, stock: skuStock,
      sales_trend: this.buildSalesTrend(invoices),
      stock_totals: { opening: skuStock.reduce((s,x)=>s+x.opening,0), inward: skuStock.reduce((s,x)=>s+x.inward,0), outward: skuStock.reduce((s,x)=>s+x.outward,0), available: skuStock.reduce((s,x)=>s+x.available,0) } };
  }

  private buildSalesTrend(invoices: SalesInvoice[]) {
    const map = new Map<string, { sales: number; count: number }>();
    for (const inv of invoices) {
      const d = new Date(inv.invoice_date).toISOString().slice(0, 10);
      const row = map.get(d) ?? { sales: 0, count: 0 };
      row.sales += Number(inv.total);
      row.count += 1;
      map.set(d, row);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, sales: v.sales, invoice_count: v.count }));
  }

  async productionPlan(planDate: string, safetyStock: number, ctx: TenantContext) {
    const tenantId = this.tenantId(ctx); await this.assertIceCrest(tenantId);
    const date = planDate || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const orders = await this.orderRepo.find({ where: { tenant_id: tenantId, order_date: Between(dayStart, dayEnd) }, relations: ['lines', 'lines.item'] });
    const activeOrders = orders.filter(o => !['cancelled', 'rejected', 'closed', 'invoiced'].includes(o.status));
    const required = new Map<string, number>();
    for (const order of activeOrders) {
      for (const line of order.lines ?? []) {
        if (!line.item_id) continue;
        const pending = Number(line.quantity);
        if (pending <= 0) continue;
        required.set(line.item_id, (required.get(line.item_id) ?? 0) + pending);
      }
    }
    const items = await this.itemRepo.find({ where: { tenant_id: tenantId } });
    const stock = await this.stockRepo.find({ where: { tenant_id: tenantId } });
    const safety = Math.max(0, Number(safetyStock) || 0);
    const rows = items.map(item => {
      const orderQty = required.get(item.id) ?? 0;
      const onHand = stock.filter(s => s.item_id === item.id).reduce((n, s) => n + Number(s.quantity) - Number(s.reserved), 0);
      const produce = Math.max(0, orderQty + safety - onHand);
      return { item_id: item.id, sku: item.sku, name: item.name, confirmed_orders: orderQty, available_stock: onHand, safety_stock: safety, produce_tomorrow: produce };
    }).filter(r => r.confirmed_orders > 0);
    return { plan_date: date, order_count: activeOrders.length, safety_stock: safety, rows, totals: { confirmed: rows.reduce((s, r) => s + r.confirmed_orders, 0), to_produce: rows.reduce((s, r) => s + r.produce_tomorrow, 0) } };
  }

  private async postExpenseJournal(row: BusinessExpense, ctx: TenantContext) {
    const taxable = Number(row.taxable_amount);
    const gst = Number(row.gst_amount);
    const tds = Number(row.tds_amount);
    const paid = Number(row.paid_amount);
    const total = Number(row.amount);
    const expenseAmt = row.itc_eligible ? taxable : taxable + gst;
    const itc = row.itc_eligible ? gst : 0;
    const payable = Math.max(0, total - tds - paid);
    return this.accountingService.postBalancedEntry(ctx, {
      company_id: row.company_id!,
      entry_date: row.expense_date,
      number: `EXP-${row.expense_number || row.id.slice(0, 8)}`,
      reference: row.id,
      lines: [
        { code: this.accountingService.expenseAccountCode(row.nature), debit: expenseAmt, narration: row.description || row.category },
        { code: 'SB-ITC', debit: itc, narration: 'Input GST' },
        { code: 'SB-TDS', credit: tds, narration: 'TDS deducted' },
        { code: this.accountingService.cashBankCode(row.payment_mode), credit: paid, narration: 'Amount paid' },
        { code: 'SB-AP', credit: payable, narration: 'Vendor / payable' },
      ],
    });
  }

  async captureWebsiteLead(tenantSlug: string, body: { name: string; phone?: string; email?: string; company?: string; requirement?: string; quantity?: number; product_sku?: string; message?: string }) {
    const tenant = await this.tenantRepo.findOne({ where: { slug: tenantSlug } });
    if (!tenant) throw new NotFoundException('Tenant not found'); await this.assertIceCrest(tenant.id);
    return this.leadRepo.save(this.leadRepo.create({ tenant_id: tenant.id, company_id: null, source: 'website', name: body.name,
      phone: body.phone ?? null, email: body.email ?? null, stage: 'new', deal_stage: 'lead', deal_value: null,
      expected_close_date: null, score: 0, assigned_to: null, category_id: null, tags: ['website'],
      metadata: { company: body.company, requirement: body.requirement, quantity: body.quantity, product_sku: body.product_sku, message: body.message } }));
  }
}
