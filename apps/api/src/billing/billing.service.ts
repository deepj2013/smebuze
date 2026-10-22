import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { PlatformOrg } from '../tenant/entities/platform-org.entity';
import { User } from '../auth/entities/user.entity';
import { TenantContext } from '../common/tenant-context';
import {
  buildHostedCheckoutForm,
  makePayuTxnId,
  platformPayu,
} from '../common/payu';
import {
  extendSubscriptionFrom,
  INTERVAL_MONTHS,
  subscriptionStatus,
  YEARLY_DISCOUNT_PERCENT,
} from '../common/plans';
import {
  applyEnvOverrides,
  defaultPlanForWorkspace,
  INVOICE_LITE_PLAN_ID,
  isInvoicingLiteWorkspace,
  minBillingIntervalForWorkspace,
  payuSmokeAmountRupees,
  payablePlanInCatalog,
  planIdsForWorkspace,
  quotePlanWithCatalog,
  resolvePlanCatalog,
  tenantBusinessType,
  type ResolvedPlanCatalog,
} from '../common/platform-plan-catalog';
import { TenantSubscriptionPayment } from './entities/tenant-subscription-payment.entity';
import { TenantBillingMandate } from './entities/tenant-billing-mandate.entity';
import { BillingPayDto } from './dto/billing-pay.dto';
import { CustomPlanEnquiryDto } from './dto/custom-plan-enquiry.dto';
import {
  AdminLicenceActivateDto,
  AdminLicenceRemindDto,
  AdminOfflinePaymentDto,
} from './dto/admin-licence.dto';
import { MailService } from '../mail/mail.service';
import { licenceRenewalHtml } from '../mail/templates';
import { PartnersService } from '../partners/partners.service';
import { MarketplacePaymentsService } from '../marketplace/marketplace-payments.service';
import { platformManualPayInstructions } from '../common/platform-billing-pay';
import { SubmitManualPaymentDto } from './dto/manual-payment.dto';
import { AdminPlanCatalogDto } from './dto/plan-catalog.dto';
import * as fs from 'fs';
import * as path from 'path';

const SUPPORT_EMAIL = 'support@smebuze.com';
const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantSubscriptionPayment)
    private readonly paymentRepo: Repository<TenantSubscriptionPayment>,
    @InjectRepository(TenantBillingMandate)
    private readonly mandateRepo: Repository<TenantBillingMandate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PlatformOrg)
    private readonly platformOrgRepo: Repository<PlatformOrg>,
    private readonly mail: MailService,
    @Inject(forwardRef(() => PartnersService))
    private readonly partnersService: PartnersService,
    @Inject(forwardRef(() => MarketplacePaymentsService))
    private readonly marketplacePayments: MarketplacePaymentsService,
  ) {}

  private tenantId(ctx: TenantContext): string {
    if (!ctx.tenantId) {
      throw new ForbiddenException('Open a workspace to manage the SMEBUZE plan.');
    }
    return ctx.tenantId;
  }

  private platformPayu() {
    return platformPayu();
  }

  private frontendUrl(): string {
    return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  }

  private apiPublicUrl(): string {
    return (process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private billingSettings(settings: Record<string, unknown> | null | undefined): {
    interval: string;
    trial?: boolean;
    auto_renew?: boolean;
  } {
    const raw = (settings?.billing ?? {}) as { interval?: string; trial?: boolean; auto_renew?: boolean };
    const fallback = minBillingIntervalForWorkspace(settings as Record<string, unknown>);
    const interval = raw.interval && INTERVAL_MONTHS[raw.interval] ? raw.interval : fallback;
    return { interval, trial: raw.trial === true, auto_renew: raw.auto_renew !== false };
  }

  private async loadCatalog(): Promise<ResolvedPlanCatalog> {
    const org = await this.platformOrgRepo.findOne({ where: { id: PLATFORM_ORG_ID } });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return applyEnvOverrides(resolvePlanCatalog(settings));
  }

  private async resolvePlanInterval(
    tenant: Tenant,
    dto?: BillingPayDto,
  ): Promise<{ plan: string; interval: string; amountPaise: number; amountRupees: number }> {
    const catalog = await this.loadCatalog();
    const settings = (tenant.settings ?? {}) as Record<string, unknown>;
    const allowed = planIdsForWorkspace(settings);
    let plan = dto?.plan || tenant.plan || defaultPlanForWorkspace(settings);
    if (!allowed.includes(plan)) plan = allowed[0]!;
    const stored = this.billingSettings(tenant.settings);
    const minInt = minBillingIntervalForWorkspace(settings);
    let interval = dto?.interval || stored.interval || minInt;
    if (isInvoicingLiteWorkspace(settings)) {
      if (!['monthly', 'yearly'].includes(interval)) interval = 'monthly';
    }
    if (!payablePlanInCatalog(catalog, plan)) {
      throw new BadRequestException(
        `The ${catalog.labels[plan] || plan} plan is quoted by SMEBUZE. Write to ${SUPPORT_EMAIL}.`,
      );
    }
    const quote = quotePlanWithCatalog(catalog, plan, interval);
    if (!quote?.amount_paise) {
      throw new BadRequestException('Choose a valid plan and billing period.');
    }
    return { plan, interval, amountPaise: quote.amount_paise, amountRupees: quote.amount_rupees };
  }

  async status(ctx: TenantContext) {
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const catalog = await this.loadCatalog();
    const settings = (tenant.settings ?? {}) as Record<string, unknown>;
    const lite = isInvoicingLiteWorkspace(settings);
    const stored = this.billingSettings(tenant.settings);
    const sub = subscriptionStatus(tenant.subscription_ends_at);
    const plan = tenant.plan || defaultPlanForWorkspace(settings);
    const interval = stored.interval;
    const payable = payablePlanInCatalog(catalog, plan);
    const quote = payable ? quotePlanWithCatalog(catalog, plan, interval) : null;
    const payu = this.platformPayu();
    const planIds = planIdsForWorkspace(settings);
    const yearlyTotal = catalog.yearly_total_rupees[INVOICE_LITE_PLAN_ID];
    return {
      tenant_name: tenant.name,
      slug: tenant.slug,
      business_type: tenantBusinessType(settings),
      billing_mode: lite ? 'invoice_lite' : 'erp',
      plan,
      plan_label: catalog.labels[plan] || plan,
      interval,
      amount_rupees: quote?.amount_rupees ?? null,
      amount_paise: quote?.amount_paise ?? null,
      yearly_discount_percent: YEARLY_DISCOUNT_PERCENT,
      payable,
      support_email: SUPPORT_EMAIL,
      ...sub,
      trial: stored.trial === true && (sub.days_left == null || sub.days_left > 0),
      auto_renew: stored.auto_renew !== false,
      min_package_interval: minBillingIntervalForWorkspace(settings),
      package_note: lite
        ? `Invoice Lite: ₹${catalog.monthly_rupees[INVOICE_LITE_PLAN_ID]}/month or ₹${yearlyTotal ?? 1800}/year. Pay with PayU or upload bank/UPI proof if enabled.`
        : 'Quarterly is the minimum package. Pay yearly and save an extra 15%. Pay online with PayU or upload a bank/UPI proof if manual pay is enabled.',
      prices: catalog.monthly_rupees,
      list_prices: catalog.list_monthly_rupees,
      yearly_totals: catalog.yearly_total_rupees,
      plans: planIds.map((id) => ({
        id,
        label: catalog.labels[id] || id,
        monthly_rupees: catalog.monthly_rupees[id],
        list_rupees: catalog.list_monthly_rupees[id],
        yearly_total_rupees: catalog.yearly_total_rupees[id] ?? null,
      })),
      intervals: lite
        ? [
            { id: 'monthly', label: 'Monthly', months: 1, discount_percent: 0, is_minimum: true },
            {
              id: 'yearly',
              label: `Yearly (₹${yearlyTotal ?? 1800})`,
              months: 12,
              discount_percent: 0,
              is_minimum: false,
            },
          ]
        : [
            { id: 'quarterly', label: 'Quarterly (minimum)', months: 3, discount_percent: 0, is_minimum: true },
            { id: 'yearly', label: 'Yearly', months: 12, discount_percent: YEARLY_DISCOUNT_PERCENT, is_minimum: false },
            { id: 'monthly', label: 'Monthly', months: 1, discount_percent: 0, is_minimum: false },
          ],
      gateways: {
        payu: payu.enabled,
      },
      payu_smoke_rupees: payuSmokeAmountRupees(),
      ecs: { enabled: false, status: null as string | null, subscription_id: null as string | null },
      ecs_note: 'Auto-debit (ECS) is not available with PayU yet. Renew manually each cycle or use manual bank/UPI proof.',
      manual_pay: platformManualPayInstructions(),
      pending_proof: await this.pendingProofForTenant(tenant.id),
    };
  }

  private async pendingProofForTenant(tenantId: string) {
    const row = await this.paymentRepo.findOne({
      where: { tenant_id: tenantId, status: 'pending_review' },
      order: { created_at: 'DESC' },
    });
    if (!row) return null;
    const meta = (row.meta || {}) as Record<string, unknown>;
    return {
      payment_id: row.id,
      plan: row.plan,
      interval: row.interval,
      amount_rupees: Math.round(row.amount_paise / 100),
      method: row.gateway,
      reference: meta.reference ?? null,
      proof_url: meta.proof_url ?? null,
      submitted_at: row.created_at?.toISOString() ?? null,
    };
  }

  /** Tenant uploads UPI/bank payment proof when platform Razorpay is not live. */
  async submitManualPaymentProof(
    ctx: TenantContext,
    dto: SubmitManualPaymentDto,
    file: { buffer: Buffer; originalname?: string },
  ) {
    const tenantId = this.tenantId(ctx);
    const manual = platformManualPayInstructions();
    if (!manual.enabled) {
      throw new BadRequestException('Manual payment is not configured on this server. Contact support.');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const existing = await this.paymentRepo.findOne({
      where: { tenant_id: tenantId, status: 'pending_review' },
    });
    if (existing) {
      throw new BadRequestException('A payment is already waiting for SMEBUZE approval. We will email you when it is verified.');
    }
    const chosen = await this.resolvePlanInterval(tenant, { plan: dto.plan, interval: dto.interval });
    if (!chosen.amountPaise || chosen.amountPaise < 100) {
      throw new BadRequestException('Choose a valid plan and billing period.');
    }
    if (!file?.buffer?.length) throw new BadRequestException('Upload a screenshot of the payment (PNG or JPG).');
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      throw new BadRequestException('Screenshot must be PNG, JPG or WEBP');
    }
    const dir = path.join(process.cwd(), 'uploads', 'billing-proofs');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${tenantId}-${Date.now()}${ext === '.jpeg' ? '.jpg' : ext}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);
    const proofUrl = `/uploads/billing-proofs/${filename}`;
    const method = dto.method && ['upi', 'bank', 'cash', 'cheque'].includes(dto.method) ? dto.method : 'upi';
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: tenantId,
        gateway: method,
        plan: chosen.plan,
        interval: chosen.interval,
        amount_paise: chosen.amountPaise,
        status: 'pending_review',
        gateway_order_id: dto.reference?.trim() || null,
        gateway_payment_id: null,
        meta: {
          manual_proof: true,
          proof_url: proofUrl,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          submitted_by: ctx.userId,
          tenant_slug: tenant.slug,
        },
      }),
    );
    this.logger.log(`Manual payment proof ${payment.id} from ${tenant.slug}`);
    return {
      ok: true,
      payment_id: payment.id,
      message: 'Screenshot received. SMEBUZE will verify and activate your workspace — usually within one business day.',
      pending_proof: await this.pendingProofForTenant(tenantId),
    };
  }

  async listPendingPaymentProofs(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    const rows = await this.paymentRepo.find({
      where: { status: 'pending_review' },
      order: { created_at: 'ASC' },
      take: 100,
    });
    const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
    const tenants = tenantIds.length ? await this.tenantRepo.find({ where: { id: In(tenantIds) } }) : [];
    const byId = new Map(tenants.map((t) => [t.id, t]));
    return {
      proofs: rows.map((p) => {
        const t = byId.get(p.tenant_id);
        const meta = (p.meta || {}) as Record<string, unknown>;
        return {
          payment_id: p.id,
          tenant_id: p.tenant_id,
          tenant_name: t?.name ?? '—',
          tenant_slug: t?.slug ?? '—',
          plan: p.plan,
          interval: p.interval,
          amount_rupees: Math.round(p.amount_paise / 100),
          method: p.gateway,
          reference: meta.reference ?? p.gateway_order_id ?? null,
          proof_url: meta.proof_url ?? null,
          note: meta.note ?? null,
          submitted_at: p.created_at?.toISOString() ?? null,
        };
      }),
    };
  }

  async approvePaymentProof(ctx: TenantContext, paymentId: string, activate = true) {
    this.assertSuperAdmin(ctx);
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending_review') {
      throw new BadRequestException('This payment is not waiting for approval.');
    }
    const result = await this.markPaid(payment);
    if (activate !== false) {
      const t = await this.tenantRepo.findOne({ where: { id: payment.tenant_id } });
      if (t && t.is_active === false) {
        t.is_active = true;
        await this.tenantRepo.save(t);
      }
    }
    const meta = { ...(payment.meta || {}), approved_by: ctx.userId, approved_at: new Date().toISOString() };
    payment.meta = meta;
    await this.paymentRepo.save(payment);
    return { ...result, payment_id: payment.id };
  }

  async rejectPaymentProof(ctx: TenantContext, paymentId: string, reason?: string) {
    this.assertSuperAdmin(ctx);
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'pending_review') {
      throw new BadRequestException('This payment is not waiting for approval.');
    }
    payment.status = 'rejected';
    payment.meta = {
      ...(payment.meta || {}),
      rejected_by: ctx.userId,
      rejected_at: new Date().toISOString(),
      reject_reason: reason?.trim() || null,
    };
    await this.paymentRepo.save(payment);
    return { ok: true, payment_id: payment.id };
  }

  private async ecsStatus(tenantId: string) {
    const m = await this.mandateRepo.findOne({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
    if (!m) return { enabled: false, status: null as string | null, subscription_id: null as string | null };
    return {
      enabled: ['authenticated', 'active'].includes(m.status),
      status: m.status,
      subscription_id: m.gateway_subscription_id,
      plan: m.plan,
      interval: m.interval,
      amount_paise: m.amount_paise,
      next_charge_at: m.next_charge_at?.toISOString() ?? null,
    };
  }

  async setAutoRenew(ctx: TenantContext, autoRenew: boolean) {
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const settings = { ...(tenant.settings || {}) };
    const billing = this.billingSettings(settings);
    settings.billing = { ...billing, auto_renew: autoRenew };
    tenant.settings = settings;
    await this.tenantRepo.save(tenant);
    return this.status(ctx);
  }

  async setupEcs(_ctx: TenantContext, _dto: BillingPayDto) {
    throw new BadRequestException('Auto-debit (ECS) is not available with PayU. Pay manually each billing cycle.');
  }

  async cancelEcs(ctx: TenantContext) {
    const tenantId = this.tenantId(ctx);
    const m = await this.mandateRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tid', { tid: tenantId })
      .andWhere('m.status IN (:...st)', { st: ['created', 'authenticated', 'active'] })
      .orderBy('m.created_at', 'DESC')
      .getOne();
    if (!m) throw new NotFoundException('No active ECS mandate');
    m.status = 'cancelled';
    await this.mandateRepo.save(m);
    return this.status(ctx);
  }

  async createPayuCheckout(ctx: TenantContext, dto: BillingPayDto) {
    const payu = this.platformPayu();
    if (!payu.enabled) {
      throw new BadRequestException(
        'PayU is not configured on SMEBUZE yet. Upload a payment proof or write to ' + SUPPORT_EMAIL + '.',
      );
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const catalog = await this.loadCatalog();
    const chosen = await this.resolvePlanInterval(tenant, dto);
    const smoke = payuSmokeAmountRupees();
    let amountPaise = chosen.amountPaise;
    if (smoke != null && smoke * 100 < amountPaise) {
      amountPaise = Math.round(smoke * 100);
    }
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: tenant.id,
        gateway: 'payu',
        plan: chosen.plan,
        interval: chosen.interval,
        amount_paise: amountPaise,
        status: 'created',
        meta: {
          tenant_slug: tenant.slug,
          smebuze: 'subscription',
          catalog_amount_paise: chosen.amountPaise,
          payu_smoke: smoke != null,
        },
      }),
    );
    const txnid = makePayuTxnId('sub');
    payment.gateway_order_id = txnid;
    await this.paymentRepo.save(payment);
    const amountRupees = amountPaise / 100;
    const checkout = buildHostedCheckoutForm(payu, {
      txnid,
      amountRupees,
      productinfo: `SMEBUZE ${catalog.labels[chosen.plan] || chosen.plan}`.slice(0, 100),
      firstname: (ctx.name || tenant.name || 'Customer').slice(0, 60),
      email: (ctx.email || 'billing@smebuze.local').slice(0, 60),
      udf1: 'subscription',
      udf2: payment.id,
      udf3: tenant.id,
    });
    return {
      checkout,
      txnid,
      amount: chosen.amountPaise,
      amount_rupees: amountRupees,
      currency: 'INR',
      name: 'SMEBUZE',
      description: `${catalog.labels[chosen.plan] || chosen.plan} · ${chosen.interval}${smoke != null ? ' (test)' : ''}`,
      payment_id: payment.id,
      smoke_test: smoke != null,
      catalog_amount_rupees: chosen.amountRupees,
    };
  }

  async handlePhonePeWebhook() {
    return { ok: false, deprecated: true };
  }

  async handleRazorpayWebhook() {
    return { ok: false, deprecated: true };
  }

  async markPaidPublic(payment: TenantSubscriptionPayment) {
    return this.markPaid(payment);
  }

  private async markPaid(payment: TenantSubscriptionPayment) {
    if (payment.status === 'paid') {
      const tenant = await this.tenantRepo.findOne({ where: { id: payment.tenant_id } });
      if (!tenant) throw new NotFoundException('Workspace not found');
      return {
        paid: true,
        already: true,
        plan: tenant.plan,
        subscription_ends_at: tenant.subscription_ends_at?.toISOString() ?? null,
      };
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: payment.tenant_id } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const now = new Date();
    const nextEnd = extendSubscriptionFrom(now, tenant.subscription_ends_at, payment.interval);
    const settings = { ...(tenant.settings || {}) };
    const billing = this.billingSettings(settings);
    settings.billing = {
      ...billing,
      interval: payment.interval,
      trial: false,
      auto_renew: true,
      last_paid_at: now.toISOString(),
    };
    tenant.plan = payment.plan;
    tenant.subscription_ends_at = nextEnd;
    tenant.is_active = true;
    tenant.settings = settings;
    payment.status = 'paid';
    await this.tenantRepo.save(tenant);
    await this.paymentRepo.save(payment);
    try {
      await this.partnersService.recordCommissionForPayment({
        tenantId: tenant.id,
        paymentId: payment.id,
        amountPaise: payment.amount_paise,
      });
    } catch (err) {
      this.logger.warn(`Commission for payment ${payment.id} failed: ${(err as Error).message}`);
    }
    return {
      paid: true,
      plan: tenant.plan,
      interval: payment.interval,
      subscription_ends_at: nextEnd.toISOString(),
    };
  }

  async captureCustomEnquiry(dto: CustomPlanEnquiryDto) {
    const name = (dto.name || '').trim();
    const phone = (dto.phone || '').trim();
    const email = (dto.email || '').trim();
    const company = (dto.company || '').trim();
    const message = (dto.message || '').trim();
    if (!phone && !email) {
      throw new BadRequestException('Share a phone number or email so we can reply.');
    }
    const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
    const subject = `Custom SMEBUZE plan — ${name}${company ? ` (${company})` : ''}`;
    const html = `
      <p>A custom-plan request came in from smebuze.com.</p>
      <table cellpadding="6" style="font-family:sans-serif;font-size:14px">
        <tr><td><b>Name</b></td><td>${safe(name)}</td></tr>
        <tr><td><b>Phone</b></td><td>${safe(phone) || '—'}</td></tr>
        <tr><td><b>Email</b></td><td>${safe(email) || '—'}</td></tr>
        <tr><td><b>Business</b></td><td>${safe(company) || '—'}</td></tr>
        <tr><td><b>What they need</b></td><td>${safe(message) || '—'}</td></tr>
      </table>
    `;
    const text = `Custom SMEBUZE plan request\nName: ${name}\nPhone: ${phone || '—'}\nEmail: ${email || '—'}\nBusiness: ${company || '—'}\nMessage:\n${message || '—'}`;
    const mailed = await this.mail.sendHtml(SUPPORT_EMAIL, subject, html, text, { replyTo: email || undefined });
    this.logger.log(`Custom plan enquiry from ${name} (${email || phone}) mailed=${mailed.sent}`);
    return { ok: true };
  }

  private assertSuperAdmin(ctx: TenantContext) {
    if (!ctx.isSuperAdmin) {
      throw new ForbiddenException('Only platform admin can manage licences.');
    }
  }

  async getAdminPlanCatalog(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    const catalog = await this.loadCatalog();
    return {
      invoice_lite: {
        monthly_rupees: catalog.monthly_rupees[INVOICE_LITE_PLAN_ID],
        yearly_rupees: catalog.yearly_total_rupees[INVOICE_LITE_PLAN_ID],
      },
      payu_smoke_rupees: payuSmokeAmountRupees(),
      payu_env: process.env.PAYU_ENV || 'test',
      note: 'Invoice Lite workspaces (business_type invoicing_lite) only see this plan. Env BILLING_PAYU_SMOKE_RUPEES=10 charges ₹10 on PayU test checkout.',
    };
  }

  async updateAdminPlanCatalog(ctx: TenantContext, dto: AdminPlanCatalogDto) {
    this.assertSuperAdmin(ctx);
    const org = await this.platformOrgRepo.findOne({ where: { id: PLATFORM_ORG_ID } });
    if (!org) throw new NotFoundException('Platform org not found');
    const settings = { ...(org.settings ?? {}) };
    const prev = (settings.billing_plan_catalog ?? {}) as Record<string, unknown>;
    const monthly = { ...((prev.monthly_rupees as Record<string, number>) ?? {}) };
    const yearly = { ...((prev.yearly_total_rupees as Record<string, number>) ?? {}) };
    if (dto.invoice_lite_monthly_rupees != null) monthly[INVOICE_LITE_PLAN_ID] = dto.invoice_lite_monthly_rupees;
    if (dto.invoice_lite_yearly_rupees != null) yearly[INVOICE_LITE_PLAN_ID] = dto.invoice_lite_yearly_rupees;
    settings.billing_plan_catalog = { monthly_rupees: monthly, yearly_total_rupees: yearly };
    org.settings = settings;
    await this.platformOrgRepo.save(org);
    return this.getAdminPlanCatalog(ctx);
  }

  /** Universal admin: every workspace with licence status for renewals. */
  async listLicences(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
    const catalog = await this.loadCatalog();
    const tenants = await this.tenantRepo.find({ order: { name: 'ASC' } });
    const now = new Date();
    const rows = await Promise.all(
      tenants.map(async (t) => {
        const sub = subscriptionStatus(t.subscription_ends_at, now);
        const users = await this.userRepo.find({
          where: { tenant_id: t.id, is_active: true },
          order: { created_at: 'ASC' },
          take: 5,
        });
        const recentPayments = await this.paymentRepo.find({
          where: { tenant_id: t.id },
          order: { created_at: 'DESC' },
          take: 5,
        });
        let bucket: 'expired' | 'expiring_soon' | 'active' | 'no_end' = 'no_end';
        if (sub.days_left == null) bucket = 'no_end';
        else if (sub.expired) bucket = 'expired';
        else if (sub.days_left <= 14) bucket = 'expiring_soon';
        else bucket = 'active';
        const settings = (t.settings as Record<string, unknown> | null) ?? {};
        let account_kind: 'demo' | 'real' | 'unknown' = 'unknown';
        if (settings.account_kind === 'demo' || settings.account_kind === 'real') {
          account_kind = settings.account_kind;
        } else {
          const slug = t.slug.toLowerCase();
          const name = t.name.toLowerCase();
          account_kind =
            slug.startsWith('demo') || slug.startsWith('pos-') || name.startsWith('demo ') ? 'demo' : 'real';
        }
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          plan_label: catalog.labels[t.plan] || t.plan,
          is_active: t.is_active !== false,
          business_type: settings.business_type ?? null,
          account_kind,
          created_at: t.created_at?.toISOString() ?? null,
          license_key: t.license_key,
          ...sub,
          bucket,
          contacts: users.map((u) => ({ id: u.id, email: u.email, name: u.name })),
          recent_payments: recentPayments.map((p) => ({
            id: p.id,
            gateway: p.gateway,
            plan: p.plan,
            interval: p.interval,
            amount_rupees: Math.round(p.amount_paise / 100),
            status: p.status,
            reference: (p.meta as Record<string, unknown>)?.reference ?? null,
            created_at: p.created_at,
          })),
        };
      }),
    );
    const summary = {
      total: rows.length,
      expired: rows.filter((r) => r.bucket === 'expired').length,
      expiring_soon: rows.filter((r) => r.bucket === 'expiring_soon').length,
      active: rows.filter((r) => r.bucket === 'active').length,
      no_end: rows.filter((r) => r.bucket === 'no_end').length,
      paused: rows.filter((r) => !r.is_active).length,
    };
    return {
      summary,
      prices: catalog.monthly_rupees,
      plans: Object.keys(catalog.monthly_rupees).map((id) => ({
        id,
        label: catalog.labels[id] || id,
        monthly_rupees: catalog.monthly_rupees[id],
        yearly_total_rupees: catalog.yearly_total_rupees[id] ?? null,
      })),
      plan_catalog: {
        invoice_lite: {
          monthly_rupees: catalog.monthly_rupees[INVOICE_LITE_PLAN_ID],
          yearly_rupees: catalog.yearly_total_rupees[INVOICE_LITE_PLAN_ID],
        },
      },
      offline_methods: [
        { id: 'cash', label: 'Cash (handed to SMEBUZE)' },
        { id: 'cheque', label: 'Cheque (in SMEBUZE account)' },
        { id: 'upi', label: 'UPI (to SMEBUZE account)' },
      ],
      note: 'Online gateway comes later. For now record cash / cheque / UPI received on the SMEBUZE account, then activate.',
      tenants: rows,
    };
  }

  /** Record cash / cheque / UPI received on the SMEBUZE (platform) account and extend licence. */
  async recordOfflinePayment(ctx: TenantContext, dto: AdminOfflinePaymentDto) {
    this.assertSuperAdmin(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenant_id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const catalog = await this.loadCatalog();
    if (!payablePlanInCatalog(catalog, dto.plan)) {
      throw new BadRequestException('Choose a valid plan for offline renewal.');
    }
    if (!INTERVAL_MONTHS[dto.interval]) {
      throw new BadRequestException('Interval must be monthly, quarterly or yearly.');
    }
    const amountPaise = Math.round(Number(dto.amount_rupees) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      throw new BadRequestException('Enter the amount received in rupees.');
    }
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: tenant.id,
        gateway: dto.method,
        plan: dto.plan,
        interval: dto.interval,
        amount_paise: amountPaise,
        status: 'created',
        gateway_order_id: dto.reference?.trim() || null,
        gateway_payment_id: dto.reference?.trim() || null,
        meta: {
          offline: true,
          method: dto.method,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          recorded_by: ctx.userId,
          tenant_slug: tenant.slug,
        },
      }),
    );
    const result = await this.markPaid(payment);
    if (dto.activate !== false) {
      const t = await this.tenantRepo.findOne({ where: { id: tenant.id } });
      if (t && t.is_active === false) {
        t.is_active = true;
        await this.tenantRepo.save(t);
      }
    }
    this.logger.log(`Offline ${dto.method} ₹${dto.amount_rupees} for ${tenant.slug} by ${ctx.userId}`);
    return {
      ...result,
      payment_id: payment.id,
      method: dto.method,
      amount_rupees: dto.amount_rupees,
      reference: dto.reference?.trim() || null,
    };
  }

  /** Email workspace users a renewal reminder (activation / pay). */
  async sendLicenceReminder(ctx: TenantContext, dto: AdminLicenceRemindDto) {
    this.assertSuperAdmin(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenant_id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const users = await this.userRepo.find({
      where: { tenant_id: tenant.id, is_active: true },
      order: { created_at: 'ASC' },
      take: 10,
    });
    if (!users.length) {
      throw new BadRequestException('No active users on this workspace to remind.');
    }
    const sub = subscriptionStatus(tenant.subscription_ends_at);
    const billingUrl = `${this.frontendUrl()}/billing`;
    const catalog = await this.loadCatalog();
    const planLabel = catalog.labels[tenant.plan] || tenant.plan;
    let sent = 0;
    const failures: string[] = [];
    for (const u of users) {
      const html = licenceRenewalHtml({
        name: u.name || u.email,
        workspaceName: tenant.name,
        planLabel,
        endsAt: sub.ends_at,
        daysLeft: sub.days_left,
        billingUrl,
        supportEmail: SUPPORT_EMAIL,
      });
      const noteLine = dto.note?.trim() ? `\n\nNote from SMEBUZE: ${dto.note.trim()}` : '';
      const text = `Renew SMEBUZE for ${tenant.name}. Plan: ${planLabel}. Open ${billingUrl}.${noteLine}`;
      const r = await this.mail.sendHtml(
        u.email,
        `Renew your SMEBUZE licence — ${tenant.name}`,
        html,
        text,
      );
      if (r.sent) sent += 1;
      else failures.push(u.email);
    }
    const settings = { ...(tenant.settings || {}) } as Record<string, unknown>;
    const billing = { ...((settings.billing as Record<string, unknown>) || {}) };
    billing.last_reminder_at = new Date().toISOString();
    billing.last_reminder_by = ctx.userId;
    settings.billing = billing;
    tenant.settings = settings;
    await this.tenantRepo.save(tenant);
    return { ok: true, sent, failed: failures, total: users.length, days_left: sub.days_left };
  }

  /** Manually set end date / plan / active without a payment (trial or goodwill). */
  async activateLicence(ctx: TenantContext, dto: AdminLicenceActivateDto) {
    this.assertSuperAdmin(ctx);
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenant_id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (dto.plan) tenant.plan = dto.plan;
    if (dto.is_active !== undefined) tenant.is_active = dto.is_active;
    if (dto.subscription_ends_at !== undefined) {
      tenant.subscription_ends_at = dto.subscription_ends_at ? new Date(dto.subscription_ends_at) : null;
    } else if (dto.interval && INTERVAL_MONTHS[dto.interval]) {
      tenant.subscription_ends_at = extendSubscriptionFrom(new Date(), tenant.subscription_ends_at, dto.interval);
      const settings = { ...(tenant.settings || {}) };
      const billing = this.billingSettings(settings);
      settings.billing = { ...billing, interval: dto.interval, last_activated_at: new Date().toISOString() };
      tenant.settings = settings;
    }
    if (dto.is_active !== false && tenant.is_active === false && (dto.subscription_ends_at || dto.interval)) {
      tenant.is_active = true;
    }
    await this.tenantRepo.save(tenant);
    const sub = subscriptionStatus(tenant.subscription_ends_at);
    return {
      id: tenant.id,
      plan: tenant.plan,
      is_active: tenant.is_active,
      ...sub,
    };
  }
}
