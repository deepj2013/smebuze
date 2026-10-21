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
import { createHash, timingSafeEqual } from 'crypto';
import { In, Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { User } from '../auth/entities/user.entity';
import { TenantContext } from '../common/tenant-context';
import { razorpayRequest, verifyRazorpaySignature } from '../common/tenant-razorpay';
import {
  extendSubscriptionFrom,
  INTERVAL_MONTHS,
  MIN_PACKAGE_INTERVAL,
  payablePlan,
  PLAN_LABELS,
  PLAN_LIST_RUPEES,
  PLAN_PRICE_RUPEES,
  planAmountPaise,
  planAmountRupees,
  subscriptionStatus,
  YEARLY_DISCOUNT_PERCENT,
} from '../common/plans';
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
import * as fs from 'fs';
import * as path from 'path';

const SUPPORT_EMAIL = 'support@smebuze.com';

type PhonePePayResponse = {
  success?: boolean;
  code?: string;
  message?: string;
  data?: {
    merchantId?: string;
    merchantTransactionId?: string;
    transactionId?: string;
    amount?: number;
    state?: string;
    instrumentResponse?: { redirectInfo?: { url?: string; method?: string } };
  };
};

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

  private platformRazorpay() {
    const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
    const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    const webhook_secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
    return {
      key_id,
      key_secret,
      webhook_secret,
      enabled: key_id.startsWith('rzp_') && key_secret.length > 8,
    };
  }

  private platformPhonePe() {
    const merchantId = (process.env.PHONEPE_MERCHANT_ID || '').trim();
    const saltKey = (process.env.PHONEPE_SALT_KEY || '').trim();
    const saltIndex = (process.env.PHONEPE_SALT_INDEX || '1').trim() || '1';
    const env = (process.env.PHONEPE_ENV || 'sandbox').trim().toLowerCase();
    const sandbox = env !== 'production' && env !== 'prod';
    const host = sandbox
      ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
      : 'https://api.phonepe.com/apis/hermes';
    return {
      merchantId,
      saltKey,
      saltIndex,
      sandbox,
      host,
      enabled: Boolean(merchantId && saltKey),
    };
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
    const interval = raw.interval && INTERVAL_MONTHS[raw.interval] ? raw.interval : MIN_PACKAGE_INTERVAL;
    return { interval, trial: raw.trial === true, auto_renew: raw.auto_renew !== false };
  }

  private resolvePlanInterval(
    tenant: Tenant,
    dto?: BillingPayDto,
  ): { plan: string; interval: string; amountPaise: number; amountRupees: number } {
    const stored = this.billingSettings(tenant.settings);
    const plan = dto?.plan || tenant.plan || 'basic';
    const interval = dto?.interval || stored.interval || MIN_PACKAGE_INTERVAL;
    if (!payablePlan(plan)) {
      throw new BadRequestException(
        `The ${PLAN_LABELS[plan] || plan} plan is quoted by SMEBUZE. Write to ${SUPPORT_EMAIL}.`,
      );
    }
    const amountPaise = planAmountPaise(plan, interval);
    const amountRupees = planAmountRupees(plan, interval);
    if (amountPaise == null || amountRupees == null) {
      throw new BadRequestException('Choose Starter, Growth or Business, billed monthly, quarterly or yearly.');
    }
    return { plan, interval, amountPaise, amountRupees };
  }

  async status(ctx: TenantContext) {
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const stored = this.billingSettings(tenant.settings);
    const sub = subscriptionStatus(tenant.subscription_ends_at);
    const plan = tenant.plan || 'basic';
    const interval = stored.interval;
    const payable = payablePlan(plan);
    const amountRupees = payable ? planAmountRupees(plan, interval) : null;
    const rzp = this.platformRazorpay();
    const phonepe = this.platformPhonePe();
    return {
      tenant_name: tenant.name,
      slug: tenant.slug,
      plan,
      plan_label: PLAN_LABELS[plan] || plan,
      interval,
      amount_rupees: amountRupees,
      amount_paise: payable ? planAmountPaise(plan, interval) : null,
      yearly_discount_percent: YEARLY_DISCOUNT_PERCENT,
      payable,
      support_email: SUPPORT_EMAIL,
      ...sub,
      trial: stored.trial === true && (sub.days_left == null || sub.days_left > 0),
      auto_renew: stored.auto_renew !== false,
      min_package_interval: MIN_PACKAGE_INTERVAL,
      package_note:
        'Quarterly is the minimum package. Pay yearly and save an extra 15%. Razorpay checkout renews your workspace automatically when auto-renew is on.',
      prices: PLAN_PRICE_RUPEES,
      list_prices: PLAN_LIST_RUPEES,
      plans: Object.keys(PLAN_PRICE_RUPEES).map((id) => ({
        id,
        label: PLAN_LABELS[id],
        monthly_rupees: PLAN_PRICE_RUPEES[id],
        list_rupees: PLAN_LIST_RUPEES[id],
      })),
      intervals: [
        { id: 'quarterly', label: 'Quarterly (minimum)', months: 3, discount_percent: 0, is_minimum: true },
        { id: 'yearly', label: 'Yearly', months: 12, discount_percent: YEARLY_DISCOUNT_PERCENT, is_minimum: false },
        { id: 'monthly', label: 'Monthly', months: 1, discount_percent: 0, is_minimum: false },
      ],
      gateways: {
        razorpay: rzp.enabled,
        phonepe: phonepe.enabled,
      },
      ecs: await this.ecsStatus(tenant.id),
      ecs_note:
        'ECS / eMandate auto-debits your SMEBUZE plan each cycle via Razorpay Subscriptions. Separate from shop customer payments.',
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
    const chosen = this.resolvePlanInterval(tenant, { plan: dto.plan, interval: dto.interval });
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

  /**
   * Start Razorpay Subscription (ECS / eMandate) for SaaS plan auto-debit.
   * Customer opens short_url once to authorise; later cycles charge automatically.
   */
  async setupEcs(ctx: TenantContext, dto: BillingPayDto) {
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) {
      throw new BadRequestException(
        'Platform Razorpay is not configured. Set RAZORPAY_KEY_ID / SECRET, then retry ECS setup.',
      );
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const chosen = this.resolvePlanInterval(tenant, dto);
    if (!chosen.amountPaise || chosen.amountPaise < 100) {
      throw new BadRequestException('This plan cannot use ECS. Contact support@smebuze.com.');
    }

    const open = await this.mandateRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tid', { tid: tenant.id })
      .andWhere('m.status IN (:...st)', { st: ['created', 'authenticated', 'active'] })
      .getOne();
    if (open?.gateway_subscription_id && open.status === 'active') {
      return {
        already_active: true,
        subscription_id: open.gateway_subscription_id,
        status: open.status,
      };
    }

    const period = chosen.interval === 'yearly' ? 12 : chosen.interval === 'monthly' ? 1 : 3;
    const plan = await razorpayRequest<{ id: string }>(rzp.key_id, rzp.key_secret, 'POST', '/plans', {
      period: 'monthly',
      interval: period,
      item: {
        name: `SMEBUZE ${PLAN_LABELS[chosen.plan] || chosen.plan} (${chosen.interval})`,
        amount: chosen.amountPaise,
        currency: 'INR',
        description: `SaaS licence · ${tenant.slug}`,
      },
      notes: { smebuze: 'saas_ecs_plan', tenant_id: tenant.id, plan: chosen.plan, interval: chosen.interval },
    });

    const sub = await razorpayRequest<{ id: string; short_url?: string; status?: string }>(
      rzp.key_id,
      rzp.key_secret,
      'POST',
      '/subscriptions',
      {
        plan_id: plan.id,
        total_count: chosen.interval === 'yearly' ? 10 : 40,
        customer_notify: 1,
        notes: {
          smebuze: 'saas_ecs',
          tenant_id: tenant.id,
          plan: chosen.plan,
          interval: chosen.interval,
        },
      },
    );

    const mandate = await this.mandateRepo.save(
      this.mandateRepo.create({
        tenant_id: tenant.id,
        gateway: 'razorpay',
        status: sub.status || 'created',
        plan: chosen.plan,
        interval: chosen.interval,
        amount_paise: chosen.amountPaise,
        gateway_plan_id: plan.id,
        gateway_subscription_id: sub.id,
        meta: { short_url: sub.short_url || null },
      }),
    );

    const settings = { ...(tenant.settings || {}) };
    const billing = this.billingSettings(settings);
    settings.billing = { ...billing, auto_renew: true, ecs: true };
    tenant.settings = settings;
    await this.tenantRepo.save(tenant);

    return {
      mandate_id: mandate.id,
      subscription_id: sub.id,
      short_url: sub.short_url || null,
      status: mandate.status,
      amount_paise: chosen.amountPaise,
      message:
        'Open the link once to authorise auto-debit (UPI Autopay / eMandate). SMEBUZE will renew your plan each cycle.',
    };
  }

  async cancelEcs(ctx: TenantContext) {
    const rzp = this.platformRazorpay();
    const tenantId = this.tenantId(ctx);
    const m = await this.mandateRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tid', { tid: tenantId })
      .andWhere('m.status IN (:...st)', { st: ['created', 'authenticated', 'active'] })
      .orderBy('m.created_at', 'DESC')
      .getOne();
    if (!m) throw new NotFoundException('No active ECS mandate');
    if (rzp.enabled && m.gateway_subscription_id) {
      try {
        await razorpayRequest(
          rzp.key_id,
          rzp.key_secret,
          'POST',
          `/subscriptions/${m.gateway_subscription_id}/cancel`,
          { cancel_at_cycle_end: 0 },
        );
      } catch (err) {
        this.logger.warn(`ECS cancel API: ${(err as Error).message}`);
      }
    }
    m.status = 'cancelled';
    await this.mandateRepo.save(m);
    return this.status(ctx);
  }

  async createRazorpayOrder(ctx: TenantContext, dto: BillingPayDto) {
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) {
      throw new BadRequestException('Razorpay is not configured on SMEBUZE yet. Try PhonePe, or write to ' + SUPPORT_EMAIL + '.');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const chosen = this.resolvePlanInterval(tenant, dto);
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: tenant.id,
        gateway: 'razorpay',
        plan: chosen.plan,
        interval: chosen.interval,
        amount_paise: chosen.amountPaise,
        status: 'created',
        meta: { tenant_slug: tenant.slug },
      }),
    );
    try {
      const order = await razorpayRequest<{ id: string; amount: number; currency: string }>(
        rzp.key_id,
        rzp.key_secret,
        'POST',
        '/orders',
        {
          amount: chosen.amountPaise,
          currency: 'INR',
          receipt: `sub_${payment.id.replace(/-/g, '').slice(0, 32)}`,
          notes: {
            smebuze: 'subscription',
            tenant_id: tenant.id,
            payment_id: payment.id,
            plan: chosen.plan,
            interval: chosen.interval,
          },
        },
      );
      payment.gateway_order_id = order.id;
      await this.paymentRepo.save(payment);
      return {
        key_id: rzp.key_id,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'SMEBUZE',
        description: `${PLAN_LABELS[chosen.plan]} · ${chosen.interval}`,
        prefill: { email: ctx.email, name: ctx.name || tenant.name },
        payment_id: payment.id,
      };
    } catch (err) {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), error: err instanceof Error ? err.message : 'order failed' };
      await this.paymentRepo.save(payment);
      throw new BadRequestException(err instanceof Error ? err.message : 'Could not start Razorpay checkout');
    }
  }

  async confirmRazorpay(
    ctx: TenantContext,
    body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) throw new BadRequestException('Razorpay is not configured');
    const signed = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    if (!verifyRazorpaySignature(signed, body.razorpay_signature, rzp.key_secret)) {
      throw new BadRequestException('Payment signature did not match');
    }
    const payment = await this.paymentRepo.findOne({
      where: { gateway_order_id: body.razorpay_order_id, tenant_id: this.tenantId(ctx), gateway: 'razorpay' },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    payment.gateway_payment_id = body.razorpay_payment_id;
    return this.markPaid(payment);
  }

  async startPhonePe(ctx: TenantContext, dto: BillingPayDto) {
    const phonepe = this.platformPhonePe();
    if (!phonepe.enabled) {
      throw new BadRequestException('PhonePe is not configured on SMEBUZE yet. Try Razorpay, or write to ' + SUPPORT_EMAIL + '.');
    }
    const tenant = await this.tenantRepo.findOne({ where: { id: this.tenantId(ctx) } });
    if (!tenant) throw new NotFoundException('Workspace not found');
    const chosen = this.resolvePlanInterval(tenant, dto);
    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: tenant.id,
        gateway: 'phonepe',
        plan: chosen.plan,
        interval: chosen.interval,
        amount_paise: chosen.amountPaise,
        status: 'created',
        meta: { tenant_slug: tenant.slug },
      }),
    );
    const merchantTransactionId = `sb${payment.id.replace(/-/g, '')}`.slice(0, 34);
    payment.gateway_order_id = merchantTransactionId;
    await this.paymentRepo.save(payment);

    const payload = {
      merchantId: phonepe.merchantId,
      merchantTransactionId,
      merchantUserId: tenant.id.replace(/-/g, '').slice(0, 36),
      amount: chosen.amountPaise,
      redirectUrl: `${this.frontendUrl()}/billing?phonepe=1&txn=${encodeURIComponent(merchantTransactionId)}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${this.apiPublicUrl()}/api/v1/billing/phonepe/webhook`,
      paymentInstrument: { type: 'PAY_PAGE' },
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const path = '/pg/v1/pay';
    const xVerify =
      createHash('sha256').update(encoded + path + phonepe.saltKey).digest('hex') + '###' + phonepe.saltIndex;
    const res = await fetch(`${phonepe.host}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': phonepe.merchantId,
      },
      body: JSON.stringify({ request: encoded }),
    });
    const json = (await res.json().catch(() => ({}))) as PhonePePayResponse;
    const redirectUrl = json?.data?.instrumentResponse?.redirectInfo?.url;
    if (!res.ok || !json.success || !redirectUrl) {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), error: json.message || json.code || `PhonePe error (${res.status})` };
      await this.paymentRepo.save(payment);
      throw new BadRequestException(json.message || json.code || 'Could not start PhonePe checkout');
    }
    return { redirectUrl, merchantTransactionId, payment_id: payment.id };
  }

  async phonePeStatus(ctx: TenantContext, txn: string) {
    const payment = await this.paymentRepo.findOne({
      where: { gateway_order_id: String(txn || '').trim(), tenant_id: this.tenantId(ctx), gateway: 'phonepe' },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'paid') {
      return this.status(ctx);
    }
    const checked = await this.fetchPhonePeStatus(payment.gateway_order_id!);
    if (checked.state === 'COMPLETED' || checked.code === 'PAYMENT_SUCCESS') {
      payment.gateway_payment_id = checked.transactionId || payment.gateway_payment_id;
      await this.markPaid(payment);
      return this.status(ctx);
    }
    if (checked.state === 'FAILED' || checked.code === 'PAYMENT_ERROR' || checked.code === 'PAYMENT_DECLINED') {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), phonepe: checked };
      await this.paymentRepo.save(payment);
    }
    return { ...await this.status(ctx), payment_status: payment.status, phonepe_state: checked.state || checked.code };
  }

  async handlePhonePeWebhook(rawBody: string, xVerify: string | undefined, body: Record<string, unknown>) {
    const phonepe = this.platformPhonePe();
    if (!phonepe.enabled) return { ok: false };
    const encoded =
      typeof body?.response === 'string'
        ? body.response
        : typeof (body as { Response?: string }).Response === 'string'
          ? (body as { Response: string }).Response
          : '';
    if (!encoded) return { ok: false };
    if (xVerify && phonepe.saltKey) {
      const expected =
        createHash('sha256').update(encoded + phonepe.saltKey).digest('hex') + '###' + phonepe.saltIndex;
      const a = Buffer.from(expected);
      const b = Buffer.from(xVerify);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        this.logger.warn('PhonePe webhook signature mismatch');
        return { ok: false };
      }
    }
    let decoded: PhonePePayResponse = {};
    try {
      decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as PhonePePayResponse;
    } catch {
      return { ok: false };
    }
    const txn = decoded.data?.merchantTransactionId;
    if (!txn) return { ok: false };
    const payment = await this.paymentRepo.findOne({ where: { gateway_order_id: txn, gateway: 'phonepe' } });
    if (!payment) return { ok: true };
    const state = decoded.data?.state || decoded.code;
    if (state === 'COMPLETED' || decoded.code === 'PAYMENT_SUCCESS') {
      payment.gateway_payment_id = decoded.data?.transactionId || payment.gateway_payment_id;
      await this.markPaid(payment);
    } else if (state === 'FAILED' || decoded.code === 'PAYMENT_ERROR') {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), phonepe: decoded };
      await this.paymentRepo.save(payment);
    }
    return { ok: true };
  }

  async handleRazorpayWebhook(rawBody: string, signature: string | undefined) {
    const rzp = this.platformRazorpay();
    if (!rzp.webhook_secret) return { ok: false };
    if (!signature || !verifyRazorpaySignature(rawBody, signature, rzp.webhook_secret)) {
      return { ok: false };
    }
    let parsed: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> }; order?: { entity?: Record<string, unknown> } } };
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return { ok: false };
    }
    const paymentEntity = (parsed.payload?.payment?.entity || {}) as Record<string, unknown>;
    const orderId = String(paymentEntity.order_id || '');
    const notes = (paymentEntity.notes || {}) as Record<string, unknown>;
    const kind = String(notes.smebuze || '');

    // Mall checkout + commerce add-ons (platform collect) — do not extend SaaS subscription.
    if (kind === 'mall_order' || kind === 'commerce_addon') {
      if (parsed.event === 'payment.captured' || parsed.event === 'order.paid') {
        await this.marketplacePayments.handlePlatformWebhookNotes(notes, paymentEntity);
      }
      return { ok: true };
    }

    // SaaS ECS / Razorpay Subscriptions
    if (kind === 'saas_ecs' || String(parsed.event || '').startsWith('subscription.')) {
      await this.handleEcsWebhook(parsed.event || '', notes, paymentEntity, parsed.payload as Record<string, unknown>);
      return { ok: true };
    }

    if (kind !== 'subscription' && !orderId) return { ok: true };
    const payment = orderId
      ? await this.paymentRepo.findOne({ where: { gateway_order_id: orderId, gateway: 'razorpay' } })
      : notes.payment_id
        ? await this.paymentRepo.findOne({ where: { id: String(notes.payment_id), gateway: 'razorpay' } })
        : null;
    if (!payment) return { ok: true };
    // Safety: addon_* plans must not renew the main plan via this path
    if (String(payment.plan || '').startsWith('addon_')) {
      if (parsed.event === 'payment.captured' || parsed.event === 'order.paid') {
        await this.marketplacePayments.markAddonPaymentPaid(
          payment,
          String(paymentEntity.id || ''),
        );
      }
      return { ok: true };
    }
    if (parsed.event === 'payment.captured' || parsed.event === 'order.paid') {
      payment.gateway_payment_id = String(paymentEntity.id || payment.gateway_payment_id || '');
      await this.markPaid(payment);
    } else if (parsed.event === 'payment.failed') {
      payment.status = 'failed';
      await this.paymentRepo.save(payment);
    }
    return { ok: true };
  }

  private async handleEcsWebhook(
    event: string,
    notes: Record<string, unknown>,
    paymentEntity: Record<string, unknown>,
    payload: Record<string, unknown> | undefined,
  ) {
    const subEntity = ((payload?.subscription as { entity?: Record<string, unknown> })?.entity ||
      {}) as Record<string, unknown>;
    const subId = String(subEntity.id || notes.subscription_id || '');
    const subNotes = (subEntity.notes || {}) as Record<string, unknown>;
    const tenantId = String(notes.tenant_id || subNotes.tenant_id || '');
    let mandate = subId
      ? await this.mandateRepo.findOne({ where: { gateway_subscription_id: subId } })
      : null;
    if (!mandate && tenantId) {
      mandate = await this.mandateRepo
        .createQueryBuilder('m')
        .where('m.tenant_id = :tid', { tid: tenantId })
        .orderBy('m.created_at', 'DESC')
        .getOne();
    }
    if (!mandate) return;

    if (event === 'subscription.authenticated' || event === 'subscription.activated') {
      mandate.status = event === 'subscription.activated' ? 'active' : 'authenticated';
      await this.mandateRepo.save(mandate);
      return;
    }
    if (event === 'subscription.charged' || event === 'payment.captured') {
      mandate.status = 'active';
      mandate.last_charged_at = new Date();
      await this.mandateRepo.save(mandate);
      const tenant = await this.tenantRepo.findOne({ where: { id: mandate.tenant_id } });
      if (!tenant) return;
      const payment = await this.paymentRepo.save(
        this.paymentRepo.create({
          tenant_id: tenant.id,
          gateway: 'razorpay',
          plan: mandate.plan,
          interval: mandate.interval,
          amount_paise: mandate.amount_paise,
          status: 'paid',
          gateway_payment_id: String(paymentEntity.id || ''),
          gateway_order_id: String(paymentEntity.order_id || subId),
          meta: { smebuze: 'saas_ecs', subscription_id: subId },
        }),
      );
      await this.markPaid(payment);
      return;
    }
    if (event === 'subscription.halted' || event === 'subscription.cancelled' || event === 'subscription.completed') {
      mandate.status = event === 'subscription.cancelled' ? 'cancelled' : 'halted';
      await this.mandateRepo.save(mandate);
    }
  }

  private async fetchPhonePeStatus(merchantTransactionId: string): Promise<{
    state?: string;
    code?: string;
    transactionId?: string;
  }> {
    const phonepe = this.platformPhonePe();
    const path = `/pg/v1/status/${phonepe.merchantId}/${merchantTransactionId}`;
    const xVerify =
      createHash('sha256').update(path + phonepe.saltKey).digest('hex') + '###' + phonepe.saltIndex;
    const res = await fetch(`${phonepe.host}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': phonepe.merchantId,
      },
    });
    const json = (await res.json().catch(() => ({}))) as PhonePePayResponse;
    return {
      state: json.data?.state,
      code: json.code,
      transactionId: json.data?.transactionId,
    };
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

  /** Universal admin: every workspace with licence status for renewals. */
  async listLicences(ctx: TenantContext) {
    this.assertSuperAdmin(ctx);
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
          plan_label: PLAN_LABELS[t.plan] || t.plan,
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
      prices: PLAN_PRICE_RUPEES,
      plans: Object.keys(PLAN_PRICE_RUPEES).map((id) => ({ id, label: PLAN_LABELS[id], monthly_rupees: PLAN_PRICE_RUPEES[id] })),
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
    if (!payablePlan(dto.plan)) {
      throw new BadRequestException('Choose Starter, Growth or Business for offline renewal.');
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
    const planLabel = PLAN_LABELS[tenant.plan] || tenant.plan;
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
