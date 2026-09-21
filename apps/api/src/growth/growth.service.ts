import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { ILike, In, Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Company } from '../tenant/entities/company.entity';
import { Item } from '../inventory/entities/item.entity';
import { Customer } from '../crm/entities/customer.entity';
import { Lead } from '../crm/entities/lead.entity';
import { SalesOrder } from '../sales/entities/sales-order.entity';
import { SalesOrderLine } from '../sales/entities/sales-order-line.entity';
import { DeliveryChallan } from '../sales/entities/delivery-challan.entity';
import { StorefrontSite } from './entities/storefront-site.entity';
import { LeadIngestEvent } from './entities/lead-ingest-event.entity';
import { PaymentGatewayAccount } from './entities/payment-gateway-account.entity';
import { TenantContext } from '../common/tenant-context';
import { encryptSecret } from '../common/tenant-razorpay';
import { CLIENT_PACKS, getClientPack } from './client-packs';
import { mergeChannelSettings, parseChannelSettings, publicChannelSettings } from './channel-settings';
import { LEAD_SOURCES, normalizeLeadSource } from './lead-sources';
import { PAYMENT_PROVIDERS, getPaymentProvider } from './payment-providers';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'shop';
}

function newTrackingToken(): string {
  return randomBytes(5).toString('hex');
}

function publicItem(item: Item) {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description,
    unit: item.unit,
    category: item.category,
    image_urls: item.image_urls ?? [],
    sale_price: item.sale_price,
    mrp: item.mrp,
    tax_rate: item.tax_rate,
  };
}

function defaultPages(name: string, packWebsite?: { hero_title: string; hero_subtitle: string; about: string }) {
  return {
    hero_title: packWebsite?.hero_title ?? `Welcome to ${name}`,
    hero_subtitle: packWebsite?.hero_subtitle ?? 'Browse our catalog and place an order.',
    about: packWebsite?.about ?? `${name} is now online.`,
    phone: '',
    email: '',
    address: '',
    extra_pages: [] as Array<{ slug: string; title: string; body: string }>,
  };
}

@Injectable()
export class GrowthService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(SalesOrder) private readonly orderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine) private readonly orderLineRepo: Repository<SalesOrderLine>,
    @InjectRepository(DeliveryChallan) private readonly challanRepo: Repository<DeliveryChallan>,
    @InjectRepository(StorefrontSite) private readonly siteRepo: Repository<StorefrontSite>,
    @InjectRepository(LeadIngestEvent) private readonly ingestRepo: Repository<LeadIngestEvent>,
    @InjectRepository(PaymentGatewayAccount) private readonly gatewayRepo: Repository<PaymentGatewayAccount>,
  ) {}

  private assertTenant(ctx: TenantContext): string {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant context required');
    return ctx.tenantId;
  }

  listPacks() {
    return CLIENT_PACKS.map(({ id, title, blurb, shop_checkout }) => ({ id, title, blurb, shop_checkout }));
  }

  async ensureSite(tenant: Tenant, opts?: { published?: boolean; shop?: boolean; pages?: Record<string, unknown> }): Promise<StorefrontSite> {
    let site = await this.siteRepo.findOne({ where: { tenant_id: tenant.id } });
    if (site) return site;
    let slug = slugify(tenant.slug || tenant.name);
    const clash = await this.siteRepo.findOne({ where: { slug } });
    if (clash) slug = `${slug}-${tenant.id.slice(0, 6)}`;
    site = this.siteRepo.create({
      tenant_id: tenant.id,
      slug,
      custom_domain: null,
      domain_status: 'none',
      is_published: opts?.published ?? false,
      shop_enabled: opts?.shop ?? true,
      theme: {},
      pages: opts?.pages ?? defaultPages(tenant.name),
    });
    return this.siteRepo.save(site);
  }

  async getMySite(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const site = await this.ensureSite(tenant);
    return this.sitePayload(site, tenant);
  }

  private sitePayload(site: StorefrontSite, tenant: Tenant) {
    const origin = (process.env.PUBLIC_WEB_ORIGIN || 'https://smebuze.com').replace(/\/$/, '');
    return {
      ...site,
      tenant_name: tenant.name,
      shop_url: `${origin}/shop/${site.slug}`,
      site_url: `${origin}/site/${site.slug}`,
      custom_url: site.custom_domain && site.domain_status === 'active' ? `https://${site.custom_domain}` : null,
    };
  }

  async saveMySite(
    ctx: TenantContext,
    dto: {
      is_published?: boolean;
      shop_enabled?: boolean;
      pages?: Record<string, unknown>;
      theme?: Record<string, unknown>;
    },
  ) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const site = await this.ensureSite(tenant);
    if (dto.is_published !== undefined) site.is_published = Boolean(dto.is_published);
    if (dto.shop_enabled !== undefined) site.shop_enabled = Boolean(dto.shop_enabled);
    if (dto.pages) site.pages = { ...(site.pages ?? {}), ...dto.pages };
    if (dto.theme) site.theme = { ...(site.theme ?? {}), ...dto.theme };
    await this.siteRepo.save(site);
    return this.sitePayload(site, tenant);
  }

  async getCatalog(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { name: 'ASC' },
    });
    return items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      sale_price: i.sale_price,
      mrp: i.mrp,
      image_urls: i.image_urls ?? [],
      for_sale: i.for_sale,
      portal_listed: i.portal_listed,
    }));
  }

  async setCatalogListing(ctx: TenantContext, itemId: string, listed: boolean) {
    const tenantId = this.assertTenant(ctx);
    const item = await this.itemRepo.findOne({ where: { id: itemId, tenant_id: tenantId } });
    if (!item) throw new NotFoundException('Item not found');
    item.portal_listed = listed;
    await this.itemRepo.save(item);
    return { id: item.id, portal_listed: item.portal_listed };
  }

  async bulkListCatalog(ctx: TenantContext, listed: boolean, onlyForSale = true) {
    const tenantId = this.assertTenant(ctx);
    const qb = this.itemRepo
      .createQueryBuilder()
      .update(Item)
      .set({ portal_listed: listed })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('is_active = true');
    if (onlyForSale) qb.andWhere('for_sale = true');
    const res = await qb.execute();
    return { updated: res.affected ?? 0, portal_listed: listed };
  }

  async portalOrders(ctx: TenantContext, channel?: string) {
    const tenantId = this.assertTenant(ctx);
    const where: { tenant_id: string; channel?: string } = { tenant_id: tenantId };
    if (channel) where.channel = channel;
    else where.channel = 'buyer_portal';
    return this.orderRepo.find({
      where,
      relations: ['customer', 'lines', 'lines.item'],
      order: { created_at: 'DESC' },
    });
  }

  async getChannels(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return publicChannelSettings(parseChannelSettings(tenant.settings));
  }

  async saveChannels(ctx: TenantContext, body: Parameters<typeof mergeChannelSettings>[1]) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.settings = mergeChannelSettings(tenant.settings ?? {}, body);
    await this.tenantRepo.save(tenant);
    return publicChannelSettings(parseChannelSettings(tenant.settings));
  }

  async listPaymentProviders(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const accounts = await this.gatewayRepo.find({ where: { tenant_id: tenantId } });
    const byProvider = new Map(accounts.map((a) => [a.provider, a]));
    return PAYMENT_PROVIDERS.map((p) => {
      const acc = byProvider.get(p.id);
      const creds = (acc?.credentials ?? {}) as Record<string, string>;
      return {
        id: p.id,
        label: p.label,
        live: p.live,
        enabled: acc?.enabled === true,
        is_default: acc?.is_default === true,
        fields: p.fields.map((f) => ({
          key: f.key,
          label: f.label,
          secret: Boolean(f.secret),
          set: Boolean(creds[f.key]),
        })),
      };
    });
  }

  async savePaymentProvider(
    ctx: TenantContext,
    provider: string,
    body: { enabled?: boolean; is_default?: boolean; credentials?: Record<string, string> },
  ) {
    const tenantId = this.assertTenant(ctx);
    const def = getPaymentProvider(provider);
    if (!def) throw new BadRequestException('Unknown payment provider');
    let acc = await this.gatewayRepo.findOne({ where: { tenant_id: tenantId, provider: def.id } });
    if (!acc) {
      acc = this.gatewayRepo.create({
        tenant_id: tenantId,
        provider: def.id,
        enabled: false,
        is_default: def.id === 'razorpay',
        credentials: {},
      });
    }
    if (body.enabled !== undefined) acc.enabled = Boolean(body.enabled);
    if (body.is_default) {
      await this.gatewayRepo.update({ tenant_id: tenantId }, { is_default: false });
      acc.is_default = true;
    }
    if (body.credentials) {
      const next = { ...(acc.credentials ?? {}) } as Record<string, string>;
      for (const field of def.fields) {
        const v = body.credentials[field.key];
        if (typeof v === 'string' && v.trim()) {
          next[field.key] = field.secret ? encryptSecret(v.trim()) : v.trim();
        }
      }
      acc.credentials = next;
    }
    await this.gatewayRepo.save(acc);
    if (def.id === 'razorpay' && body.credentials) {
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      if (tenant) {
        const rzp = { ...((tenant.settings?.razorpay as Record<string, unknown>) ?? {}) };
        const c = body.credentials;
        if (c.key_id) rzp.key_id = c.key_id;
        if (c.key_secret) rzp.key_secret = encryptSecret(c.key_secret);
        if (c.webhook_secret) rzp.webhook_secret = encryptSecret(c.webhook_secret);
        if (body.enabled !== undefined) rzp.enabled = body.enabled;
        tenant.settings = { ...(tenant.settings ?? {}), razorpay: rzp };
        await this.tenantRepo.save(tenant);
      }
    }
    return this.listPaymentProviders(ctx);
  }

  async leadHub(ctx: TenantContext) {
    const tenantId = this.assertTenant(ctx);
    const raw = await this.ingestRepo
      .createQueryBuilder('e')
      .select('e.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('e.tenant_id = :tenantId', { tenantId })
      .groupBy('e.source')
      .getRawMany<{ source: string; count: string }>();
    const bySource = Object.fromEntries(raw.map((r) => [r.source, Number(r.count)]));
    const recent = await this.ingestRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
      take: 50,
    });
    return {
      sources: LEAD_SOURCES.map((s) => ({ ...s, count: bySource[s.id] ?? 0 })),
      total: raw.reduce((n, r) => n + Number(r.count), 0),
      recent,
    };
  }

  async applyPack(ctx: TenantContext, type: string, opts?: { force?: boolean; list_existing_items?: boolean }) {
    const tenantId = this.assertTenant(ctx);
    const pack = getClientPack(type);
    if (!pack) throw new BadRequestException('Unknown client pack');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.settings = {
      ...(tenant.settings ?? {}),
      business_type: pack.id,
      enabled_modules: pack.modules,
    };
    const features = new Set([...(tenant.features ?? []), ...pack.features]);
    tenant.features = [...features];
    tenant.settings = mergeChannelSettings(tenant.settings, {
      whatsapp: { mode: 'shared' },
      campaign: { mode: 'shared' },
      payments: { mode: 'private', default_provider: 'razorpay' },
    });
    await this.tenantRepo.save(tenant);

    let site = await this.siteRepo.findOne({ where: { tenant_id: tenantId } });
    const pages = defaultPages(tenant.name, pack.website);
    if (!site) {
      site = await this.ensureSite(tenant, { published: true, shop: pack.shop_checkout, pages });
    } else if (opts?.force || !site.pages || Object.keys(site.pages).length === 0) {
      site.pages = pages;
      site.shop_enabled = pack.shop_checkout;
      site.is_published = true;
      await this.siteRepo.save(site);
    } else {
      site.shop_enabled = pack.shop_checkout;
      site.is_published = true;
      await this.siteRepo.save(site);
    }

    let listed = 0;
    const shouldList = opts?.list_existing_items ?? pack.list_existing_items;
    if (shouldList) {
      const res = await this.itemRepo
        .createQueryBuilder()
        .update(Item)
        .set({ portal_listed: true })
        .where('tenant_id = :tenantId AND is_active = true AND for_sale = true', { tenantId })
        .execute();
      listed = res.affected ?? 0;
    }

    return { pack: pack.id, listed_items: listed, site: this.sitePayload(site, tenant) };
  }

  async adminListSites(ctx: TenantContext) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    const sites = await this.siteRepo.find({ order: { updated_at: 'DESC' } });
    const tenants = await this.tenantRepo.find();
    const byId = new Map(tenants.map((t) => [t.id, t]));
    const origin = (process.env.PUBLIC_WEB_ORIGIN || 'https://smebuze.com').replace(/\/$/, '');
    return sites.map((s) => {
      const t = byId.get(s.tenant_id);
      return {
        ...s,
        tenant_name: t?.name ?? '',
        tenant_slug: t?.slug ?? '',
        shop_url: `${origin}/shop/${s.slug}`,
        site_url: `${origin}/site/${s.slug}`,
        dns_hint: s.custom_domain
          ? `CNAME ${s.custom_domain} → smebuze.com  (then mark domain Active)`
          : 'Set a custom domain, then ask the client to CNAME it to smebuze.com',
      };
    });
  }

  async adminPatchSite(
    ctx: TenantContext,
    id: string,
    dto: { custom_domain?: string | null; domain_status?: string; domain_notes?: string | null; is_published?: boolean; slug?: string },
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    const site = await this.siteRepo.findOne({ where: { id } });
    if (!site) throw new NotFoundException('Storefront not found');
    if (dto.custom_domain !== undefined) {
      const host = (dto.custom_domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      site.custom_domain = host || null;
      if (host && site.domain_status === 'none') site.domain_status = 'pending_dns';
      if (!host) site.domain_status = 'none';
    }
    if (dto.domain_status) {
      if (!['none', 'pending_dns', 'active', 'disabled'].includes(dto.domain_status)) {
        throw new BadRequestException('Invalid domain status');
      }
      site.domain_status = dto.domain_status;
    }
    if (dto.domain_notes !== undefined) site.domain_notes = dto.domain_notes;
    if (dto.is_published !== undefined) site.is_published = Boolean(dto.is_published);
    if (dto.slug) {
      const slug = slugify(dto.slug);
      const clash = await this.siteRepo.findOne({ where: { slug } });
      if (clash && clash.id !== site.id) throw new BadRequestException('Slug already used');
      site.slug = slug;
    }
    await this.siteRepo.save(site);
    const tenant = await this.tenantRepo.findOne({ where: { id: site.tenant_id } });
    return this.sitePayload(site, tenant!);
  }

  async adminApplyPack(
    ctx: TenantContext,
    tenantId: string,
    type: string,
    opts?: { force?: boolean; list_existing_items?: boolean },
  ) {
    if (!ctx.isSuperAdmin) throw new ForbiddenException('Platform admin only');
    return this.applyPack({ ...ctx, tenantId, isSuperAdmin: true }, type, {
      force: Boolean(opts?.force),
      list_existing_items: opts?.list_existing_items,
    });
  }

  async resolvePublic(hostOrSlug: string) {
    const key = hostOrSlug.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!key) throw new NotFoundException('Storefront not found');
    let site =
      (await this.siteRepo.findOne({ where: { slug: key } })) ||
      (await this.siteRepo.findOne({ where: { custom_domain: ILike(key) } }));
    if (!site || !site.is_published) throw new NotFoundException('Storefront not found');
    if (site.custom_domain && site.custom_domain.toLowerCase() === key && site.domain_status !== 'active') {
      throw new NotFoundException('Domain is not active yet');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: site.tenant_id } });
    if (!tenant?.is_active) throw new NotFoundException('Storefront not found');
    return { site, tenant };
  }

  async publicDirectory() {
    const sites = await this.siteRepo.find({ where: { is_published: true }, order: { slug: 'ASC' } });
    const tenants = await this.tenantRepo.find();
    const byId = new Map(tenants.map((t) => [t.id, t]));
    const out: Array<{
      name: string;
      slug: string;
      type: string;
      shop_enabled: boolean;
      shop_path: string;
      site_path: string;
      item_count: number;
      hero: string;
    }> = [];
    for (const site of sites) {
      const tenant = byId.get(site.tenant_id);
      if (!tenant?.is_active) continue;
      const itemCount = await this.itemRepo.count({
        where: { tenant_id: tenant.id, is_active: true, for_sale: true, portal_listed: true },
      });
      const type = typeof tenant.settings?.business_type === 'string' ? tenant.settings.business_type : 'standard';
      out.push({
        name: tenant.name,
        slug: site.slug,
        type,
        shop_enabled: site.shop_enabled,
        shop_path: `/shop/${site.slug}`,
        site_path: `/site/${site.slug}`,
        item_count: itemCount,
        hero: (site.pages as { hero_title?: string })?.hero_title || tenant.name,
      });
    }
    return out;
  }

  async publicShop(slug: string) {
    const { site, tenant } = await this.resolvePublic(slug);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenant.id, is_active: true, for_sale: true, portal_listed: true },
      order: { name: 'ASC' },
    });
    return {
      slug: site.slug,
      name: tenant.name,
      shop_enabled: site.shop_enabled,
      theme: site.theme,
      pages: site.pages,
      items: items.map(publicItem),
    };
  }

  async publicSite(slug: string) {
    const { site, tenant } = await this.resolvePublic(slug);
    const items = await this.itemRepo.find({
      where: { tenant_id: tenant.id, is_active: true, for_sale: true, portal_listed: true },
      order: { name: 'ASC' },
    });
    return {
      slug: site.slug,
      name: tenant.name,
      shop_enabled: site.shop_enabled,
      shop_path: `/shop/${site.slug}`,
      theme: site.theme,
      pages: site.pages,
      items: items.map(publicItem),
    };
  }

  async publicOrder(
    slug: string,
    body: {
      name: string;
      phone: string;
      email?: string;
      note?: string;
      address?: Record<string, unknown>;
      lines: Array<{ item_id: string; qty: number }>;
    },
  ) {
    const { site, tenant } = await this.resolvePublic(slug);
    if (!site.shop_enabled) throw new BadRequestException('This shop does not take online orders. Send an enquiry instead.');
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
    if (!name || phone.length !== 10) throw new BadRequestException('Name and a 10-digit phone are required');
    const linesIn = Array.isArray(body.lines) ? body.lines : [];
    if (!linesIn.length) throw new BadRequestException('Add at least one item');

    const company = await this.companyRepo.findOne({ where: { tenant_id: tenant.id }, order: { created_at: 'ASC' } });
    if (!company) throw new BadRequestException('This business is not ready to take orders yet');

    let customer = await this.customerRepo.findOne({ where: { tenant_id: tenant.id, phone } });
    if (!customer) {
      customer = await this.customerRepo.save(
        this.customerRepo.create({
          tenant_id: tenant.id,
          company_id: company.id,
          name,
          phone,
          email: body.email?.trim() || null,
          address: body.address ?? {},
          entity_type: 'individual',
          tags: ['buyer_portal'],
        }),
      );
    }

    const itemIds = [...new Set(linesIn.map((l) => l.item_id))];
    const items = await this.itemRepo.find({
      where: { tenant_id: tenant.id, id: In(itemIds), is_active: true, for_sale: true, portal_listed: true },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    let total = 0;
    const resolved: Array<{ item: Item; qty: number; rate: number }> = [];
    for (const line of linesIn) {
      const item = byId.get(line.item_id);
      if (!item) throw new BadRequestException('One or more items are not available');
      const qty = Number(line.qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('Quantity must be greater than zero');
      const rate = Number(item.sale_price ?? item.mrp ?? 0);
      total += qty * rate;
      resolved.push({ item, qty, rate });
    }

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        tenant_id: tenant.id,
        company_id: company.id,
        customer_id: customer.id,
        number: `WEB-${Date.now().toString().slice(-8)}`,
        order_date: new Date(),
        status: 'confirmed',
        total: total.toFixed(2),
        tax_amount: '0',
        channel: 'buyer_portal',
        tracking_token: newTrackingToken(),
        shipping_json: body.address ?? {},
        buyer_note: body.note?.trim() || null,
        requirement_channel: 'website',
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

    await this.ingestLeadInternal(tenant, {
      source: 'shop',
      name,
      phone,
      email: body.email,
      message: `Portal order ${order.number}`,
      metadata: { order_id: order.id, tracking_token: order.tracking_token },
    });

    return {
      number: order.number,
      tracking_token: order.tracking_token,
      status: 'placed',
      total: order.total,
      track_path: `/shop/${site.slug}/track/${order.tracking_token}`,
    };
  }

  async publicTrack(slug: string, token: string) {
    const { site, tenant } = await this.resolvePublic(slug);
    const order = await this.orderRepo.findOne({
      where: { tenant_id: tenant.id, tracking_token: token },
      relations: ['lines', 'customer'],
    });
    if (!order) throw new NotFoundException('Order not found');
    const challans = await this.challanRepo.find({ where: { tenant_id: tenant.id, order_id: order.id } });
    const buyerStatus = this.buyerStatus(order.status, challans.map((c) => c.status));
    return {
      slug: site.slug,
      number: order.number,
      status: buyerStatus,
      order_status: order.status,
      total: order.total,
      order_date: order.order_date,
      lines: (order.lines ?? []).map((l) => ({ description: l.description, qty: l.quantity, unit: l.unit, rate: l.rate })),
    };
  }

  private buyerStatus(orderStatus: string, challanStatuses: string[]): string {
    if (['cancelled', 'rejected'].includes(orderStatus)) return 'cancelled';
    if (challanStatuses.some((s) => s === 'delivered')) return 'delivered';
    if (challanStatuses.some((s) => s === 'issued' || s === 'dispatched' || s === 'out_for_delivery')) return 'out_for_delivery';
    if (challanStatuses.some((s) => s === 'draft' || s === 'packed')) return 'packed';
    if (orderStatus === 'confirmed' || orderStatus === 'accepted') return 'confirmed';
    return 'placed';
  }

  async ingestPublicLead(body: {
    tenant_slug?: string;
    slug?: string;
    source?: string;
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }) {
    const key = String(body.slug || body.tenant_slug || '').trim();
    if (!key) throw new BadRequestException('slug is required');
    const { tenant } = await this.resolvePublic(key).catch(async () => {
      const t = await this.tenantRepo.findOne({ where: { slug: key } });
      if (!t) throw new NotFoundException('Storefront not found');
      const site = await this.ensureSite(t);
      return { site, tenant: t };
    });
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Name is required');
    return this.ingestLeadInternal(tenant, {
      source: normalizeLeadSource(body.source),
      name,
      phone: body.phone,
      email: body.email,
      message: body.message,
      metadata: body.metadata,
    });
  }

  private async ingestLeadInternal(
    tenant: Tenant,
    input: { source: string; name: string; phone?: string; email?: string; message?: string; metadata?: Record<string, unknown> },
  ) {
    const phone = input.phone ? String(input.phone).replace(/\D/g, '').slice(-10) : null;
    let lead: Lead | null = null;
    if (phone && phone.length === 10) {
      lead = await this.leadRepo.findOne({ where: { tenant_id: tenant.id, phone } });
    }
    if (!lead && input.email) {
      lead = await this.leadRepo.findOne({ where: { tenant_id: tenant.id, email: input.email } });
    }
    if (!lead) {
      lead = await this.leadRepo.save(
        this.leadRepo.create({
          tenant_id: tenant.id,
          name: input.name,
          phone,
          email: input.email?.trim() || null,
          source: input.source,
          stage: 'new',
          deal_stage: 'lead',
          tags: [input.source],
          metadata: input.metadata ?? {},
        }),
      );
    } else {
      lead.source = input.source;
      if (input.email && !lead.email) lead.email = input.email;
      await this.leadRepo.save(lead);
    }
    const event = await this.ingestRepo.save(
      this.ingestRepo.create({
        tenant_id: tenant.id,
        source: input.source,
        name: input.name,
        email: input.email?.trim() || null,
        phone,
        message: input.message ?? null,
        metadata: input.metadata ?? {},
        lead_id: lead.id,
      }),
    );
    return { ok: true, lead_id: lead.id, event_id: event.id };
  }

  async ingestFromTenant(
    ctx: TenantContext,
    body: { source?: string; name: string; phone?: string; email?: string; message?: string },
  ) {
    const tenantId = this.assertTenant(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const name = String(body.name || '').trim();
    if (!name) throw new BadRequestException('Name is required');
    return this.ingestLeadInternal(tenant, {
      source: normalizeLeadSource(body.source),
      name,
      phone: body.phone,
      email: body.email,
      message: body.message,
    });
  }
}

