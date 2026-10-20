import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { TenantContext } from '../common/tenant-context';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Item } from '../inventory/entities/item.entity';
import { Customer } from '../crm/entities/customer.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { SalesOrderLine } from '../sales/entities/sales-order-line.entity';
import { StorefrontSite } from '../growth/entities/storefront-site.entity';
import { MallListing } from './entities/mall-listing.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { MarketplaceSettlement } from './entities/marketplace-settlement.entity';
import { DeliveryJob } from './entities/delivery-job.entity';
import { TenantCommerceSettings } from './entities/tenant-commerce-settings.entity';
import { CommerceService } from './commerce.service';
import { MarketplacePaymentsService } from './marketplace-payments.service';
import { COMPLIANCE_CHECKLIST } from './payment-modes';
import {
  mallCoverage,
  normalizePincode,
  parseExtraPincodes,
  pincodeFromAddress,
  sellerDeliversToPin,
} from './mall-pincode';

function money(n: number): string {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

function num(v: string | number | null | undefined): number {
  return parseFloat(String(v ?? 0)) || 0;
}

function trackingToken(): string {
  return randomBytes(12).toString('hex');
}

@Injectable()
export class MallService {
  private cache: { at: number; categories?: unknown; itemsKey?: string; items?: unknown } = { at: 0 };

  constructor(
    @InjectRepository(MallListing) private readonly listingRepo: Repository<MallListing>,
    @InjectRepository(MarketplaceOrder) private readonly mpOrderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(MarketplaceSettlement) private readonly settleRepo: Repository<MarketplaceSettlement>,
    @InjectRepository(DeliveryJob) private readonly jobRepo: Repository<DeliveryJob>,
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(SalesOrder) private readonly orderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine) private readonly orderLineRepo: Repository<SalesOrderLine>,
    @InjectRepository(StorefrontSite) private readonly siteRepo: Repository<StorefrontSite>,
    @InjectRepository(TenantCommerceSettings)
    private readonly commerceSettingsRepo: Repository<TenantCommerceSettings>,
    private readonly commerce: CommerceService,
    @Inject(forwardRef(() => MarketplacePaymentsService))
    private readonly payments: MarketplacePaymentsService,
  ) {}

  private assertPlatform(ctx: TenantContext) {
    const ok =
      ctx.isSuperAdmin ||
      ctx.permissions.includes('*') ||
      ctx.permissions.includes('admin.tenant.view') ||
      ctx.permissions.includes('admin.tenant.create') ||
      ctx.permissions.includes('admin.hub.manage');
    if (!ok) throw new ForbiddenException('Platform admin only');
  }

  private mallLiveSql = `cs.mall_enabled = true AND (
    cs.mall_paid_until > NOW()
    OR COALESCE((cs.addons_meta->>'admin_gifted_mall')::boolean, false) = true
  )`;

  private async originPinForTenant(tenantId: string, cs: TenantCommerceSettings): Promise<string | null> {
    const fromSettings = normalizePincode(cs.mall_origin_pincode);
    if (fromSettings) return fromSettings;
    const company = await this.companyRepo.findOne({
      where: { tenant_id: tenantId, is_default: true },
    });
    const addr = company?.address ?? (await this.companyRepo.findOne({ where: { tenant_id: tenantId }, order: { created_at: 'ASC' } }))?.address;
    return pincodeFromAddress(addr);
  }

  /** Which seller tenants may appear for this buyer pincode (empty if none / invalid pin). */
  private async tenantIdsVisibleForPin(buyerPinRaw?: string): Promise<{ pin: string | null; tenantIds: string[] }> {
    const pin = buyerPinRaw?.trim() ? normalizePincode(buyerPinRaw) : null;
    const rows = await this.commerceSettingsRepo
      .createQueryBuilder('cs')
      .where(this.mallLiveSql)
      .getMany();
    const tenantIds: string[] = [];
    for (const cs of rows) {
      const origin = await this.originPinForTenant(cs.tenant_id, cs);
      const coverage = mallCoverage(cs.mall_coverage);
      const extras = parseExtraPincodes(cs.mall_extra_pincodes);
      if (!pin) {
        if (coverage === 'pan_india') tenantIds.push(cs.tenant_id);
        continue;
      }
      if (sellerDeliversToPin(pin, origin, coverage, extras)) tenantIds.push(cs.tenant_id);
    }
    return { pin, tenantIds };
  }

  private applyTenantPinFilter(qb: ReturnType<Repository<MallListing>['createQueryBuilder']>, tenantIds: string[]) {
    if (!tenantIds.length) {
      qb.andWhere('1 = 0');
      return;
    }
    qb.andWhere('l.tenant_id IN (:...mallTenantIds)', { mallTenantIds: tenantIds });
  }

  // ── Public mall browse (cached ~90s) ───────────────────────────────────────

  async publicCategories(buyerPin?: string) {
    const catKey = `cat:${buyerPin ?? ''}`;
    if (this.cache.categories && this.cache.itemsKey === catKey && Date.now() - this.cache.at < 90_000) {
      return this.cache.categories;
    }
    const { tenantIds } = await this.tenantIdsVisibleForPin(buyerPin);
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin('l.item', 'i')
      .innerJoin('tenant_commerce_settings', 'cs', `cs.tenant_id = l.tenant_id AND ${this.mallLiveSql}`)
      .where('l.active = true')
      .andWhere('i.is_active = true')
      .andWhere('i.for_sale = true');
    this.applyTenantPinFilter(qb, tenantIds);
    const raw = await qb
      .select("COALESCE(i.category, 'Uncategorised')", 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy("COALESCE(i.category, 'Uncategorised')")
      .orderBy('category', 'ASC')
      .getRawMany();
    const result = raw.map((r) => ({ category: r.category, count: parseInt(r.count, 10) || 0 }));
    this.cache = { ...this.cache, at: Date.now(), itemsKey: catKey, categories: result };
    return result;
  }

  async publicItems(query: {
    category?: string;
    q?: string;
    seller?: string;
    pincode?: string;
    page?: number;
    page_size?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(48, Math.max(1, Number(query.page_size) || 24));
    const cacheKey = JSON.stringify({ ...query, page, pageSize });
    if (this.cache.itemsKey === cacheKey && this.cache.items && Date.now() - this.cache.at < 90_000) {
      return this.cache.items;
    }

    const { pin, tenantIds: visibleTenantIds } = await this.tenantIdsVisibleForPin(query.pincode);

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoinAndSelect('l.item', 'i')
      .innerJoinAndSelect('l.tenant', 't')
      .innerJoin('tenant_commerce_settings', 'cs', `cs.tenant_id = l.tenant_id AND ${this.mallLiveSql}`)
      .where('l.active = true')
      .andWhere('i.is_active = true')
      .andWhere('i.for_sale = true');
    this.applyTenantPinFilter(qb, visibleTenantIds);

    if (query.category?.trim()) {
      qb.andWhere('i.category ILIKE :cat', { cat: query.category.trim() });
    }
    if (query.q?.trim()) {
      qb.andWhere('(i.name ILIKE :q OR i.brand ILIKE :q OR i.barcode ILIKE :q)', {
        q: `%${query.q.trim()}%`,
      });
    }
    if (query.seller?.trim()) {
      qb.leftJoin(StorefrontSite, 's', 's.tenant_id = l.tenant_id');
      qb.andWhere('s.slug = :slug', { slug: query.seller.trim().toLowerCase() });
    }

    qb.orderBy('CASE WHEN l.boost_until IS NOT NULL AND l.boost_until > NOW() THEN 0 ELSE 1 END', 'ASC')
      .addOrderBy('i.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [rows, total] = await qb.getManyAndCount();

    // Fetch delivery modes + slugs in one pass
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
    const sites = tenantIds.length
      ? await this.siteRepo.find({ where: { tenant_id: In(tenantIds) } })
      : [];
    const siteByTenant = new Map(sites.map((s) => [s.tenant_id, s]));
    const settingsList = await Promise.all(tenantIds.map((id) => this.commerce.getOrCreate(id)));
    const settingsByTenant = new Map(settingsList.map((s) => [s.tenant_id, s]));

    const items = rows.map((l) => {
      const site = siteByTenant.get(l.tenant_id);
      const cs = settingsByTenant.get(l.tenant_id);
      const price = num(l.item.sale_price ?? l.item.mrp);
      return {
        listing_id: l.id,
        item_id: l.item_id,
        name: l.item.name,
        category: l.item.category,
        price,
        mrp: l.item.mrp != null ? num(l.item.mrp) : null,
        image_url: l.item.image_urls?.[0] ?? null,
        seller_slug: site?.slug ?? l.tenant.slug,
        seller_name: l.tenant.name,
        seller_tenant_id: l.tenant_id,
        delivery_mode: cs?.delivery_mode ?? 'own',
        seller_pincode: cs?.mall_origin_pincode ?? null,
      };
    });

    const result = {
      page,
      page_size: pageSize,
      total,
      items,
      mall: {
        buyer_pincode: pin,
        pincode_filter_active: Boolean(query.pincode?.trim()),
        pincode_required: !query.pincode?.trim(),
        sellers_in_area: visibleTenantIds.length,
        hint: !query.pincode?.trim()
          ? 'Enter your 6-digit delivery pincode to see nearby shops only.'
          : !pin
            ? 'Enter a valid 6-digit pincode.'
            : visibleTenantIds.length
              ? `Showing shops that deliver to ${pin}.`
              : `No mall shops deliver to ${pin} yet — try a nearby pincode or ask your local store to join.`,
      },
    };
    this.cache = { at: Date.now(), itemsKey: cacheKey, items: result, categories: this.cache.categories };
    return result;
  }

  async publicItemDetail(listingOrItemId: string) {
    let listing = await this.listingRepo.findOne({
      where: { id: listingOrItemId, active: true },
      relations: ['item', 'tenant'],
    });
    if (!listing) {
      listing = await this.listingRepo.findOne({
        where: { item_id: listingOrItemId, active: true },
        relations: ['item', 'tenant'],
      });
    }
    if (!listing) throw new NotFoundException('Listing not found');
    const cs = await this.commerce.getOrCreate(listing.tenant_id);
    if (!this.commerce.mallIsLive(cs)) throw new NotFoundException('Listing not found');
    const site = await this.siteRepo.findOne({ where: { tenant_id: listing.tenant_id } });
    return {
      listing_id: listing.id,
      item_id: listing.item_id,
      name: listing.item.name,
      description: listing.item.description,
      category: listing.item.category,
      price: num(listing.item.sale_price ?? listing.item.mrp),
      mrp: listing.item.mrp != null ? num(listing.item.mrp) : null,
      image_urls: listing.item.image_urls ?? [],
      unit: listing.item.unit,
      seller_slug: site?.slug ?? listing.tenant.slug,
      seller_name: listing.tenant.name,
      seller_tenant_id: listing.tenant_id,
      delivery_mode: cs.delivery_mode,
    };
  }

  async checkout(body: {
    seller_tenant_id: string;
    buyer: { name: string; phone: string; address?: string | Record<string, unknown> };
    delivery_mode?: string;
    lines: Array<{ item_id: string; qty: number }>;
  }) {
    const sellerId = String(body.seller_tenant_id || '').trim();
    if (!sellerId) throw new BadRequestException('seller_tenant_id is required');
    const cs = await this.commerce.getOrCreate(sellerId);
    if (!this.commerce.mallIsLive(cs)) {
      throw new BadRequestException('This shop is not listed on the mall (add-on inactive or unpaid)');
    }

    const buyerPin =
      typeof body.buyer?.address === 'string'
        ? normalizePincode(body.buyer.address.match(/\b(\d{6})\b/)?.[1])
        : pincodeFromAddress(body.buyer?.address);
    if (!buyerPin) {
      throw new BadRequestException('Add your 6-digit delivery pincode in the address (e.g. Pune 411001)');
    }
    const origin = await this.originPinForTenant(sellerId, cs);
    const coverage = mallCoverage(cs.mall_coverage);
    const extras = parseExtraPincodes(cs.mall_extra_pincodes);
    if (!sellerDeliversToPin(buyerPin, origin, coverage, extras)) {
      throw new BadRequestException(`This shop does not deliver to pincode ${buyerPin}. Choose another seller near you.`);
    }

    const name = String(body.buyer?.name || '').trim();
    const phone = String(body.buyer?.phone || '').replace(/\D/g, '').slice(-10);
    if (!name || phone.length !== 10) throw new BadRequestException('Name and a 10-digit phone are required');
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) throw new BadRequestException('Add at least one item');

    let deliveryMode = body.delivery_mode || 'own';
    if (!['own', 'platform'].includes(deliveryMode)) deliveryMode = 'own';
    if (cs.delivery_mode === 'own') deliveryMode = 'own';
    if (cs.delivery_mode === 'platform') deliveryMode = 'platform';

    const itemIds = [...new Set(linesIn.map((l) => l.item_id))];
    const listings = await this.listingRepo.find({
      where: { tenant_id: sellerId, item_id: In(itemIds), active: true },
      relations: ['item'],
    });
    if (listings.length !== itemIds.length) {
      throw new BadRequestException('One or more items are not available from this seller');
    }
    // Enforce single seller (already filtered by sellerId)
    const byItem = new Map(listings.map((l) => [l.item_id, l]));

    const company = await this.companyRepo.findOne({
      where: { tenant_id: sellerId },
      order: { created_at: 'ASC' },
    });
    if (!company) throw new BadRequestException('Seller is not ready to take orders');

    let customer = await this.customerRepo.findOne({ where: { tenant_id: sellerId, phone } });
    if (!customer) {
      customer = await this.customerRepo.save(
        this.customerRepo.create({
          tenant_id: sellerId,
          company_id: company.id,
          name,
          phone,
          address: typeof body.buyer.address === 'object' ? body.buyer.address ?? {} : { line1: body.buyer.address },
          entity_type: 'individual',
          tags: ['smebuze_mall'],
        }),
      );
    }

    let gross = 0;
    const resolved: Array<{ item: Item; qty: number; rate: number }> = [];
    for (const line of linesIn) {
      const listing = byItem.get(line.item_id)!;
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('Quantity must be greater than zero');
      const rate = num(listing.item.sale_price ?? listing.item.mrp);
      gross += qty * rate;
      resolved.push({ item: listing.item, qty, rate });
    }

    const deliveryFee = deliveryMode === 'platform' ? Math.max(30, Math.round(gross * 0.05)) : 0;
    const commissionPct = num(cs.commission_pct) || 2.5;
    const passFee = cs.pass_fee_to_customer !== false;
    const feeOnBill = Math.round(gross * (commissionPct / 100) * 100) / 100;
    const commissionAmount = feeOnBill;
    const net = passFee
      ? Math.round(gross * 100) / 100
      : Math.round((gross - commissionAmount) * 100) / 100;
    const customerCharge = passFee
      ? Math.round((gross + commissionAmount + deliveryFee) * 100) / 100
      : Math.round((gross + deliveryFee) * 100) / 100;
    const token = trackingToken();

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        tenant_id: sellerId,
        company_id: company.id,
        customer_id: customer.id,
        number: `MALL-${Date.now().toString().slice(-8)}`,
        order_date: new Date(),
        status: 'confirmed',
        total: money(gross + deliveryFee),
        tax_amount: '0',
        channel: 'smebuze_mall',
        tracking_token: token,
        shipping_json: {
          address: body.buyer.address ?? {},
          delivery_mode: deliveryMode,
          delivery_fee: deliveryFee,
          platform_fee_pct: commissionPct,
          platform_fee: commissionAmount,
          pass_fee_to_customer: passFee,
          customer_charge: customerCharge,
          settle_days: cs.settle_days ?? 1,
        },
        buyer_note: null,
        requirement_channel: 'mall',
        requirement_given_by: name,
      }),
    );

    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      await this.orderLineRepo.save(
        this.orderLineRepo.create({
          sales_order_id: order.id,
          item_id: r.item.id,
          description: r.item.name,
          quantity: String(r.qty),
          unit: r.item.unit || 'pcs',
          rate: String(r.rate),
          mrp: r.item.mrp,
          sort_order: i,
        }),
      );
    }

    const mp = await this.mpOrderRepo.save(
      this.mpOrderRepo.create({
        seller_tenant_id: sellerId,
        sales_order_id: order.id,
        channel: 'smebuze_mall',
        tracking_token: token,
        buyer_name: name,
        buyer_phone: phone,
        buyer_address:
          typeof body.buyer.address === 'object'
            ? (body.buyer.address as Record<string, unknown>) ?? {}
            : { line1: body.buyer.address || '' },
        delivery_mode: deliveryMode,
        payment_mode: 'platform_collect',
        payment_status: 'pending',
        gross_amount: money(gross),
        delivery_fee: money(deliveryFee),
        commission_pct: money(commissionPct),
        commission_amount: money(commissionAmount),
        net_to_seller: money(net),
        status: 'placed',
      }),
    );

    if (deliveryMode === 'platform') {
      const tenant = await this.tenantRepo.findOne({ where: { id: sellerId } });
      await this.jobRepo.save(
        this.jobRepo.create({
          marketplace_order_id: mp.id,
          seller_tenant_id: sellerId,
          pickup_label: tenant?.name ?? 'Seller shop',
          drop_address: mp.buyer_address,
          fee: money(deliveryFee),
          status: 'queued',
        }),
      );
    }

    this.cache = { at: 0 };

    let razorpay: Record<string, unknown> | null = null;
    let paymentNote = 'Pay to SMEBUZE (platform collect). Settlement to shop after capture.';
    try {
      razorpay = (await this.payments.createMallRazorpayOrder(mp.id)) as Record<string, unknown>;
    } catch (err) {
      paymentNote =
        err instanceof Error
          ? err.message
          : 'Online pay unavailable — order saved as pending; admin can mark paid.';
    }

    return {
      marketplace_order_id: mp.id,
      number: order.number,
      tracking_token: token,
      status: 'placed',
      payment_status: 'pending',
      payment_mode: 'platform_collect',
      gross: gross,
      delivery_fee: deliveryFee,
      total: gross + deliveryFee,
      track_path: `/mall/orders/${token}`,
      payment_note: paymentNote,
      razorpay,
      payment: razorpay
        ? {
            amount_paise: razorpay.amount,
            currency: 'INR',
            order_id: razorpay.order_id,
            key_id: razorpay.key_id,
          }
        : {
            amount_paise: Math.round((gross + deliveryFee) * 100),
            currency: 'INR',
            notes: { marketplace_order_id: mp.id, tracking_token: token },
          },
    };
  }

  async publicTrack(token: string) {
    const mp = await this.mpOrderRepo.findOne({ where: { tracking_token: token } });
    if (!mp) throw new NotFoundException('Order not found');
    const job = await this.jobRepo.findOne({ where: { marketplace_order_id: mp.id } });
    return {
      tracking_token: token,
      status: mp.status,
      payment_status: mp.payment_status,
      buyer_name: mp.buyer_name,
      gross_amount: num(mp.gross_amount),
      delivery_fee: num(mp.delivery_fee),
      delivery_mode: mp.delivery_mode,
      delivery_job: job
        ? { status: job.status, rider_name: job.rider_name, rider_phone: job.rider_phone }
        : null,
    };
  }

  // ── Tenant mall listings / orders ──────────────────────────────────────────

  async listMyListings(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.listingRepo.find({
      where: { tenant_id: ctx.tenantId },
      relations: ['item'],
      order: { created_at: 'DESC' },
    });
    return rows.map((l) => ({
      id: l.id,
      item_id: l.item_id,
      active: l.active,
      boost_until: l.boost_until,
      name: l.item?.name,
      sale_price: l.item?.sale_price,
      category: l.item?.category,
    }));
  }

  async upsertListing(ctx: TenantContext, body: { item_id: string; active?: boolean }) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const cs = await this.commerce.getOrCreate(ctx.tenantId);
    if (!this.commerce.mallIsLive(cs)) {
      throw new ForbiddenException(
        'Enable Mall and pay the mall listing add-on under Online commerce first',
      );
    }
    const item = await this.itemRepo.findOne({
      where: { id: body.item_id, tenant_id: ctx.tenantId, is_active: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    let listing = await this.listingRepo.findOne({
      where: { tenant_id: ctx.tenantId, item_id: body.item_id },
    });
    if (listing) {
      listing.active = body.active !== false;
      await this.listingRepo.save(listing);
    } else {
      listing = await this.listingRepo.save(
        this.listingRepo.create({
          tenant_id: ctx.tenantId,
          item_id: body.item_id,
          active: body.active !== false,
        }),
      );
    }
    this.cache = { at: 0 };
    return { id: listing.id, item_id: listing.item_id, active: listing.active };
  }

  async tenantMarketplaceOrders(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.mpOrderRepo.find({
      where: { seller_tenant_id: ctx.tenantId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    return rows.map((o) => ({
      id: o.id,
      sales_order_id: o.sales_order_id,
      tracking_token: o.tracking_token,
      buyer_name: o.buyer_name,
      buyer_phone: o.buyer_phone,
      status: o.status,
      payment_status: o.payment_status,
      delivery_mode: o.delivery_mode,
      gross_amount: num(o.gross_amount),
      delivery_fee: num(o.delivery_fee),
      commission_amount: num(o.commission_amount),
      net_to_seller: num(o.net_to_seller),
      created_at: o.created_at,
    }));
  }

  // ── Settlements ────────────────────────────────────────────────────────────

  async listSettlements(ctx: TenantContext, tenantId?: string) {
    this.assertPlatform(ctx);
    const where = tenantId ? { tenant_id: tenantId } : {};
    const rows = await this.settleRepo.find({ where, order: { created_at: 'DESC' }, take: 100 });
    return rows.map((s) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      period_start: s.period_start,
      period_end: s.period_end,
      gross_amount: num(s.gross_amount),
      commission_amount: num(s.commission_amount),
      delivery_fees: num(s.delivery_fees),
      net_amount: num(s.net_amount),
      status: s.status,
      paid_at: s.paid_at,
      payment_reference: s.payment_reference,
    }));
  }

  /**
   * Bundle paid platform_collect orders into open settlements.
   * Respects each tenant's settle_days (default T+1): only orders paid that many
   * calendar days ago (or older) are included.
   */
  async buildOpenSettlements(ctx: TenantContext) {
    this.assertPlatform(ctx);
    const unpaid = await this.mpOrderRepo.find({
      where: { payment_status: 'paid', settlement_id: IsNull() },
    });
    const settingsByTenant = new Map<string, TenantCommerceSettings>();
    const byTenant = new Map<string, MarketplaceOrder[]>();
    const now = Date.now();
    for (const o of unpaid) {
      let cs = settingsByTenant.get(o.seller_tenant_id);
      if (!cs) {
        cs = (await this.commerceSettingsRepo.findOne({ where: { tenant_id: o.seller_tenant_id } })) || undefined;
        if (cs) settingsByTenant.set(o.seller_tenant_id, cs);
      }
      const settleDays = cs?.settle_days ?? 1;
      const paidAt = o.updated_at ? new Date(o.updated_at).getTime() : new Date(o.created_at).getTime();
      const eligibleAt = paidAt + settleDays * 24 * 60 * 60 * 1000;
      if (now < eligibleAt) continue;
      const list = byTenant.get(o.seller_tenant_id) ?? [];
      list.push(o);
      byTenant.set(o.seller_tenant_id, list);
    }
    const created = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const [tenantId, orders] of byTenant) {
      let gross = 0;
      let commission = 0;
      let delivery = 0;
      let net = 0;
      for (const o of orders) {
        gross += num(o.gross_amount);
        commission += num(o.commission_amount);
        delivery += num(o.delivery_fee);
        net += num(o.net_to_seller);
      }
      const settlement = await this.settleRepo.save(
        this.settleRepo.create({
          tenant_id: tenantId,
          period_start: today,
          period_end: today,
          gross_amount: money(gross),
          commission_amount: money(commission),
          delivery_fees: money(delivery),
          net_amount: money(net),
          status: 'open',
          notes: `T+${settingsByTenant.get(tenantId)?.settle_days ?? 1} auto-build`,
        }),
      );
      for (const o of orders) {
        o.settlement_id = settlement.id;
        await this.mpOrderRepo.save(o);
      }
      created.push(settlement);
    }
    return { created: created.length, settlements: created.map((s) => s.id) };
  }

  /** Universal admin: GMV, commission profit, open settlements, compliance checklist. */
  async financeOverview(ctx: TenantContext) {
    this.assertPlatform(ctx);
    const paid = await this.mpOrderRepo.find({ where: { payment_status: 'paid' }, take: 5000 });
    const byTenant = new Map<
      string,
      { gross: number; commission: number; net: number; orders: number; unsettled_net: number }
    >();
    let platformCommission = 0;
    let platformGmv = 0;
    for (const o of paid) {
      const g = num(o.gross_amount);
      const c = num(o.commission_amount);
      const n = num(o.net_to_seller);
      platformGmv += g;
      platformCommission += c;
      const row = byTenant.get(o.seller_tenant_id) ?? {
        gross: 0,
        commission: 0,
        net: 0,
        orders: 0,
        unsettled_net: 0,
      };
      row.gross += g;
      row.commission += c;
      row.net += n;
      row.orders += 1;
      if (!o.settlement_id) row.unsettled_net += n;
      byTenant.set(o.seller_tenant_id, row);
    }
    const ids = [...byTenant.keys()];
    const tenants =
      ids.length === 0
        ? []
        : await this.tenantRepo.find({ where: { id: In(ids) }, select: ['id', 'name', 'slug'] });
    const nameById = new Map(tenants.map((t) => [t.id, t]));
    const openSettlements = await this.settleRepo.find({ where: { status: 'open' }, take: 200 });
    const openNet = openSettlements.reduce((s, r) => s + num(r.net_amount), 0);
    const openCommission = openSettlements.reduce((s, r) => s + num(r.commission_amount), 0);

    return {
      summary: {
        gmv: Math.round(platformGmv * 100) / 100,
        platform_commission: Math.round(platformCommission * 100) / 100,
        open_settlement_net: Math.round(openNet * 100) / 100,
        open_settlement_commission: Math.round(openCommission * 100) / 100,
        default_fee_pct: 2.5,
        settle_default: 'T+1',
      },
      tenants: [...byTenant.entries()].map(([id, row]) => ({
        tenant_id: id,
        name: nameById.get(id)?.name ?? id,
        slug: nameById.get(id)?.slug ?? null,
        ...row,
        gross: Math.round(row.gross * 100) / 100,
        commission: Math.round(row.commission * 100) / 100,
        net: Math.round(row.net * 100) / 100,
        unsettled_net: Math.round(row.unsettled_net * 100) / 100,
      })),
      compliance: COMPLIANCE_CHECKLIST,
    };
  }

  async markSettlementPaid(ctx: TenantContext, id: string, reference?: string) {
    this.assertPlatform(ctx);
    const s = await this.settleRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Settlement not found');
    s.status = 'paid';
    s.paid_at = new Date();
    s.payment_reference = reference?.trim() || null;
    await this.settleRepo.save(s);
    return {
      id: s.id,
      status: s.status,
      paid_at: s.paid_at,
      payment_reference: s.payment_reference,
      net_amount: num(s.net_amount),
    };
  }

  /** Mark mall order paid (admin / webhook stub). */
  async markOrderPaid(ctx: TenantContext, id: string, paymentRef?: string) {
    this.assertPlatform(ctx);
    const o = await this.mpOrderRepo.findOne({ where: { id } });
    if (!o) throw new NotFoundException('Order not found');
    o.payment_status = 'paid';
    o.payment_ref = paymentRef?.trim() || null;
    o.status = 'confirmed';
    await this.mpOrderRepo.save(o);
    return { id: o.id, payment_status: o.payment_status };
  }

  // ── Delivery jobs ──────────────────────────────────────────────────────────

  async listDeliveryJobs(ctx: TenantContext, status?: string) {
    this.assertPlatform(ctx);
    const where = status ? { status } : {};
    const rows = await this.jobRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: 200,
    });
    return rows.map((j) => ({
      id: j.id,
      marketplace_order_id: j.marketplace_order_id,
      hub_order_id: j.hub_order_id,
      seller_tenant_id: j.seller_tenant_id,
      pickup_label: j.pickup_label,
      drop_address: j.drop_address,
      fee: num(j.fee),
      status: j.status,
      rider_name: j.rider_name,
      rider_phone: j.rider_phone,
      created_at: j.created_at,
    }));
  }

  async patchDeliveryJob(
    ctx: TenantContext,
    id: string,
    body: { status?: string; rider_name?: string; rider_phone?: string; notes?: string },
  ) {
    this.assertPlatform(ctx);
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Delivery job not found');
    const allowed = ['queued', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'];
    if (body.status) {
      if (!allowed.includes(body.status)) throw new BadRequestException('Invalid status');
      job.status = body.status;
    }
    if (body.rider_name !== undefined) job.rider_name = body.rider_name?.trim() || null;
    if (body.rider_phone !== undefined) job.rider_phone = body.rider_phone?.trim() || null;
    if (body.notes !== undefined) job.notes = body.notes?.trim() || null;
    await this.jobRepo.save(job);

    if (job.marketplace_order_id && job.status === 'delivered') {
      const mp = await this.mpOrderRepo.findOne({ where: { id: job.marketplace_order_id } });
      if (mp) {
        mp.status = 'delivered';
        await this.mpOrderRepo.save(mp);
      }
    }
    return job;
  }

  async tenantDeliveryJobs(ctx: TenantContext) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    const rows = await this.jobRepo.find({
      where: { seller_tenant_id: ctx.tenantId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return rows.map((j) => ({
      id: j.id,
      status: j.status,
      pickup_label: j.pickup_label,
      drop_address: j.drop_address,
      fee: num(j.fee),
      rider_name: j.rider_name,
      rider_phone: j.rider_phone,
      marketplace_order_id: j.marketplace_order_id,
      hub_order_id: j.hub_order_id,
      created_at: j.created_at,
    }));
  }
}
