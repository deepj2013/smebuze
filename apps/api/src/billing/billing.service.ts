import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TenantContext } from '../common/tenant-context';
import { razorpayRequest, verifyRazorpaySignature } from '../common/tenant-razorpay';
import {
  extendSubscriptionFrom,
  INTERVAL_MONTHS,
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
import { BillingPayDto } from './dto/billing-pay.dto';
import { CustomPlanEnquiryDto } from './dto/custom-plan-enquiry.dto';
import { MailService } from '../mail/mail.service';

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
    private readonly mail: MailService,
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
  } {
    const raw = (settings?.billing ?? {}) as { interval?: string; trial?: boolean };
    const interval = raw.interval && INTERVAL_MONTHS[raw.interval] ? raw.interval : 'monthly';
    return { interval, trial: raw.trial === true };
  }

  private resolvePlanInterval(
    tenant: Tenant,
    dto?: BillingPayDto,
  ): { plan: string; interval: string; amountPaise: number; amountRupees: number } {
    const stored = this.billingSettings(tenant.settings);
    const plan = dto?.plan || tenant.plan || 'basic';
    const interval = dto?.interval || stored.interval || 'monthly';
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
      prices: PLAN_PRICE_RUPEES,
      list_prices: PLAN_LIST_RUPEES,
      plans: Object.keys(PLAN_PRICE_RUPEES).map((id) => ({
        id,
        label: PLAN_LABELS[id],
        monthly_rupees: PLAN_PRICE_RUPEES[id],
        list_rupees: PLAN_LIST_RUPEES[id],
      })),
      intervals: [
        { id: 'monthly', label: 'Monthly', months: 1, discount_percent: 0 },
        { id: 'quarterly', label: 'Quarterly', months: 3, discount_percent: 0 },
        { id: 'yearly', label: 'Yearly', months: 12, discount_percent: YEARLY_DISCOUNT_PERCENT },
      ],
      gateways: {
        razorpay: rzp.enabled,
        phonepe: phonepe.enabled,
      },
    };
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
    const paymentEntity = parsed.payload?.payment?.entity;
    const orderId = String(paymentEntity?.order_id || '');
    const notes = (paymentEntity?.notes || {}) as { smebuze?: string; payment_id?: string };
    if (notes.smebuze !== 'subscription' && !orderId) return { ok: true };
    const payment = orderId
      ? await this.paymentRepo.findOne({ where: { gateway_order_id: orderId, gateway: 'razorpay' } })
      : notes.payment_id
        ? await this.paymentRepo.findOne({ where: { id: notes.payment_id, gateway: 'razorpay' } })
        : null;
    if (!payment) return { ok: true };
    if (parsed.event === 'payment.captured' || parsed.event === 'order.paid') {
      payment.gateway_payment_id = String(paymentEntity?.id || payment.gateway_payment_id || '');
      await this.markPaid(payment);
    } else if (parsed.event === 'payment.failed') {
      payment.status = 'failed';
      await this.paymentRepo.save(payment);
    }
    return { ok: true };
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
    settings.billing = { ...billing, interval: payment.interval, trial: false, last_paid_at: now.toISOString() };
    tenant.plan = payment.plan;
    tenant.subscription_ends_at = nextEnd;
    tenant.is_active = true;
    tenant.settings = settings;
    payment.status = 'paid';
    await this.tenantRepo.save(tenant);
    await this.paymentRepo.save(payment);
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
}
