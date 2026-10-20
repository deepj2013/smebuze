import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContext } from '../common/tenant-context';
import { razorpayRequest, verifyRazorpaySignature } from '../common/tenant-razorpay';
import { TenantSubscriptionPayment } from '../billing/entities/tenant-subscription-payment.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { TenantCommerceSettings } from './entities/tenant-commerce-settings.entity';
import { CommerceService } from './commerce.service';
import {
  CommerceAddonId,
  COMMERCE_ADDONS,
  addonPricePaise,
  addonPriceRupees,
  extendPaidUntil,
  listAddonCatalog,
} from './commerce-addons';

@Injectable()
export class MarketplacePaymentsService {
  private readonly logger = new Logger(MarketplacePaymentsService.name);

  constructor(
    @InjectRepository(MarketplaceOrder) private readonly mpOrderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(TenantSubscriptionPayment)
    private readonly paymentRepo: Repository<TenantSubscriptionPayment>,
    @InjectRepository(TenantCommerceSettings)
    private readonly settingsRepo: Repository<TenantCommerceSettings>,
    private readonly commerce: CommerceService,
  ) {}

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

  platformReady() {
    return this.platformRazorpay().enabled;
  }

  addonCatalog() {
    return {
      addons: listAddonCatalog(),
      razorpay_ready: this.platformReady(),
      webhook_url: `${(process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/v1/billing/razorpay/webhook`,
    };
  }

  /** Create Razorpay order for a mall checkout (money → SMEBUZE). */
  async createMallRazorpayOrder(mpOrderId: string) {
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) {
      throw new BadRequestException(
        'Platform Razorpay is not configured. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET on the API server.',
      );
    }
    const mp = await this.mpOrderRepo.findOne({ where: { id: mpOrderId } });
    if (!mp) throw new NotFoundException('Mall order not found');
    if (mp.payment_status === 'paid') {
      return { already_paid: true, tracking_token: mp.tracking_token };
    }
    const cs = await this.settingsRepo.findOne({ where: { tenant_id: mp.seller_tenant_id } });
    const passFee = cs?.pass_fee_to_customer !== false;
    const gross = Number(mp.gross_amount) || 0;
    const delivery = Number(mp.delivery_fee) || 0;
    const fee = Number(mp.commission_amount) || 0;
    const chargeRupees = passFee ? gross + fee + delivery : gross + delivery;
    const amountPaise = Math.round(chargeRupees * 100);
    if (amountPaise < 100) throw new BadRequestException('Order amount too small for online pay');

    if (mp.gateway_order_id) {
      return {
        key_id: rzp.key_id,
        order_id: mp.gateway_order_id,
        amount: amountPaise,
        currency: 'INR',
        marketplace_order_id: mp.id,
        tracking_token: mp.tracking_token,
        name: 'SMEBUZE Mall',
        description: `Order ${mp.tracking_token.slice(0, 8)}`,
        prefill: { name: mp.buyer_name, contact: mp.buyer_phone },
        bill_amount: gross,
        platform_fee: passFee ? fee : 0,
        delivery_fee: delivery,
        customer_charge: chargeRupees,
        pass_fee_to_customer: passFee,
      };
    }

    const order = await razorpayRequest<{ id: string; amount: number; currency: string }>(
      rzp.key_id,
      rzp.key_secret,
      'POST',
      '/orders',
      {
        amount: amountPaise,
        currency: 'INR',
        receipt: `mall_${mp.id.replace(/-/g, '').slice(0, 32)}`,
        notes: {
          smebuze: 'mall_order',
          marketplace_order_id: mp.id,
          tracking_token: mp.tracking_token,
          seller_tenant_id: mp.seller_tenant_id,
          platform_fee: String(fee),
          pass_fee_to_customer: passFee ? '1' : '0',
        },
      },
    );
    mp.gateway_order_id = order.id;
    await this.mpOrderRepo.save(mp);
    return {
      key_id: rzp.key_id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
      marketplace_order_id: mp.id,
      tracking_token: mp.tracking_token,
      name: 'SMEBUZE Mall',
      description: passFee && fee > 0 ? `Mall order (incl. ${fee.toFixed(2)} platform fee)` : 'Mall order',
      prefill: { name: mp.buyer_name, contact: mp.buyer_phone },
      bill_amount: gross,
      platform_fee: passFee ? fee : 0,
      delivery_fee: delivery,
      customer_charge: chargeRupees,
      pass_fee_to_customer: passFee,
    };
  }

  async confirmMallPayment(body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) throw new BadRequestException('Razorpay is not configured');
    const signed = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    if (!verifyRazorpaySignature(signed, body.razorpay_signature, rzp.key_secret)) {
      throw new BadRequestException('Payment signature did not match');
    }
    const mp = await this.mpOrderRepo.findOne({ where: { gateway_order_id: body.razorpay_order_id } });
    if (!mp) throw new NotFoundException('Mall order not found');
    await this.markMallPaid(mp, body.razorpay_payment_id);
    return {
      paid: true,
      tracking_token: mp.tracking_token,
      track_path: `/mall/orders/${mp.tracking_token}`,
      payment_status: 'paid',
    };
  }

  async markMallPaid(mp: MarketplaceOrder, paymentRef?: string) {
    if (mp.payment_status === 'paid') return mp;
    mp.payment_status = 'paid';
    mp.payment_ref = paymentRef?.trim() || mp.payment_ref;
    mp.status = 'confirmed';
    await this.mpOrderRepo.save(mp);
    this.logger.log(`Mall order ${mp.id} marked paid`);
    return mp;
  }

  async markMallPaidById(id: string, paymentRef?: string) {
    const mp = await this.mpOrderRepo.findOne({ where: { id } });
    if (!mp) throw new NotFoundException('Order not found');
    return this.markMallPaid(mp, paymentRef);
  }

  /** Tenant pays monthly add-on (online shop or mall listing). */
  async createAddonOrder(ctx: TenantContext, addon: CommerceAddonId) {
    if (!ctx.tenantId) throw new ForbiddenException('Tenant required');
    if (!COMMERCE_ADDONS[addon]) throw new BadRequestException('Unknown add-on');
    const rzp = this.platformRazorpay();
    if (!rzp.enabled) {
      throw new BadRequestException(
        'Platform Razorpay is not configured. Ask SMEBUZE to set RAZORPAY_KEY_ID / KEY_SECRET, or pay offline via support.',
      );
    }
    const amountPaise = addonPricePaise(addon);
    if (amountPaise <= 0) {
      // Free add-on — activate immediately
      await this.activateAddon(ctx.tenantId, addon);
      return { free: true, activated: true, addon };
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: ctx.tenantId,
        gateway: 'razorpay',
        plan: `addon_${addon}`,
        interval: 'monthly',
        amount_paise: amountPaise,
        status: 'created',
        meta: { smebuze: 'commerce_addon', addon },
      }),
    );

    try {
      const order = await razorpayRequest<{ id: string; amount: number; currency: string }>(
        rzp.key_id,
        rzp.key_secret,
        'POST',
        '/orders',
        {
          amount: amountPaise,
          currency: 'INR',
          receipt: `addon_${payment.id.replace(/-/g, '').slice(0, 32)}`,
          notes: {
            smebuze: 'commerce_addon',
            addon,
            tenant_id: ctx.tenantId,
            payment_id: payment.id,
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
        payment_id: payment.id,
        addon,
        name: 'SMEBUZE',
        description: `${COMMERCE_ADDONS[addon].label} · ₹${addonPriceRupees(addon)}/mo`,
        prefill: { email: ctx.email, name: ctx.name },
      };
    } catch (err) {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), error: err instanceof Error ? err.message : 'order failed' };
      await this.paymentRepo.save(payment);
      throw new BadRequestException(err instanceof Error ? err.message : 'Could not start checkout');
    }
  }

  async confirmAddonPayment(
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
      where: {
        gateway_order_id: body.razorpay_order_id,
        tenant_id: ctx.tenantId!,
        gateway: 'razorpay',
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.markAddonPaymentPaid(payment, body.razorpay_payment_id);
  }

  async markAddonPaymentPaid(payment: TenantSubscriptionPayment, paymentId?: string) {
    if (payment.status === 'paid') {
      return { paid: true, already: true, plan: payment.plan };
    }
    const addon = String(payment.meta?.addon || payment.plan.replace(/^addon_/, '')) as CommerceAddonId;
    if (!COMMERCE_ADDONS[addon]) {
      this.logger.warn(`Unknown addon on payment ${payment.id}: ${addon}`);
      return { paid: false };
    }
    payment.status = 'paid';
    payment.gateway_payment_id = paymentId || payment.gateway_payment_id;
    await this.paymentRepo.save(payment);
    await this.activateAddon(payment.tenant_id, addon);
    return {
      paid: true,
      addon,
      monthly_rupees: addonPriceRupees(addon),
      settings: this.commerce.serialize(await this.commerce.getOrCreate(payment.tenant_id)),
    };
  }

  async activateAddon(tenantId: string, addon: CommerceAddonId) {
    const row = await this.commerce.getOrCreate(tenantId);
    if (addon === 'online_shop') {
      row.storefront_enabled = true;
      row.storefront_paid_until = extendPaidUntil(row.storefront_paid_until, 1);
      row.addons_meta = { ...(row.addons_meta || {}), admin_gifted_storefront: false };
    } else if (addon === 'mall_listing') {
      row.mall_enabled = true;
      row.payment_mode = 'platform_collect';
      row.mall_paid_until = extendPaidUntil(row.mall_paid_until, 1);
      row.listing_fee_monthly = String(addonPriceRupees('mall_listing'));
      row.addons_meta = { ...(row.addons_meta || {}), admin_gifted_mall: false };
    }
    row.addons_meta = {
      ...(row.addons_meta || {}),
      last_addon: addon,
      last_paid_at: new Date().toISOString(),
    };
    await this.settingsRepo.save(row);
    return row;
  }

  /**
   * Called from BillingService Razorpay webhook when notes.smebuze is mall_order or commerce_addon.
   */
  async handlePlatformWebhookNotes(notes: Record<string, unknown>, paymentEntity: Record<string, unknown>) {
    const kind = String(notes.smebuze || '');
    const paymentId = String(paymentEntity.id || '');
    const orderId = String(paymentEntity.order_id || '');

    if (kind === 'mall_order') {
      const mpId = String(notes.marketplace_order_id || '');
      let mp = mpId
        ? await this.mpOrderRepo.findOne({ where: { id: mpId } })
        : orderId
          ? await this.mpOrderRepo.findOne({ where: { gateway_order_id: orderId } })
          : null;
      if (mp) await this.markMallPaid(mp, paymentId);
      return { handled: true, kind };
    }

    if (kind === 'commerce_addon') {
      const payment = orderId
        ? await this.paymentRepo.findOne({ where: { gateway_order_id: orderId, gateway: 'razorpay' } })
        : notes.payment_id
          ? await this.paymentRepo.findOne({ where: { id: String(notes.payment_id), gateway: 'razorpay' } })
          : null;
      if (payment) await this.markAddonPaymentPaid(payment, paymentId);
      return { handled: true, kind };
    }

    return { handled: false };
  }

}
