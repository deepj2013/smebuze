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
import {
  buildHostedCheckoutForm,
  makePayuTxnId,
  platformPayu,
  payuReturnUrl,
} from '../common/payu';
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

  private platformPayu() {
    const cfg = platformPayu();
    return { ...cfg, enabled: cfg.enabled };
  }

  platformReady() {
    return this.platformPayu().enabled;
  }

  addonCatalog() {
    return {
      addons: listAddonCatalog(),
      payu_ready: this.platformReady(),
      return_url: payuReturnUrl(),
    };
  }

  /** Create PayU hosted checkout for a mall order (money → SMEBUZE). */
  async createMallPayuCheckout(mpOrderId: string) {
    const payu = this.platformPayu();
    if (!payu.enabled) {
      throw new BadRequestException(
        'Platform PayU is not configured. Set PAYU_MERCHANT_KEY / PAYU_MERCHANT_SALT on the API server.',
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
    if (chargeRupees < 1) throw new BadRequestException('Order amount too small for online pay');

    let txnid = mp.gateway_order_id;
    if (!txnid) {
      txnid = makePayuTxnId('mall');
      mp.gateway_order_id = txnid;
      await this.mpOrderRepo.save(mp);
    }

    const checkout = buildHostedCheckoutForm(payu, {
      txnid,
      amountRupees: chargeRupees,
      productinfo: `Mall order ${mp.tracking_token.slice(0, 8)}`,
      firstname: (mp.buyer_name || 'Buyer').slice(0, 60),
      email: 'mall@smebuze.local',
      phone: mp.buyer_phone || '',
      udf1: 'mall_order',
      udf2: mp.id,
      udf3: mp.tracking_token,
    });

    return {
      checkout,
      txnid,
      amount_rupees: chargeRupees,
      currency: 'INR',
      marketplace_order_id: mp.id,
      tracking_token: mp.tracking_token,
      name: 'SMEBUZE Mall',
      description: passFee && fee > 0 ? `Mall order (incl. ${fee.toFixed(2)} platform fee)` : 'Mall order',
      bill_amount: gross,
      platform_fee: passFee ? fee : 0,
      delivery_fee: delivery,
      customer_charge: chargeRupees,
      pass_fee_to_customer: passFee,
    };
  }

  /** @deprecated PayU completes via surl/furl — kept for API compatibility. */
  async confirmMallPayment(_body: Record<string, string>) {
    throw new BadRequestException('Mall payments complete on PayU return. Refresh your order page.');
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
    const payu = this.platformPayu();
    if (!payu.enabled) {
      throw new BadRequestException(
        'Platform PayU is not configured. Ask SMEBUZE to set PAYU_MERCHANT_KEY / SALT, or pay offline via support.',
      );
    }
    const amountPaise = addonPricePaise(addon);
    if (amountPaise <= 0) {
      await this.activateAddon(ctx.tenantId, addon);
      return { free: true, activated: true, addon };
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenant_id: ctx.tenantId,
        gateway: 'payu',
        plan: `addon_${addon}`,
        interval: 'monthly',
        amount_paise: amountPaise,
        status: 'created',
        meta: { smebuze: 'commerce_addon', addon },
      }),
    );

    try {
      const txnid = makePayuTxnId('addon');
      payment.gateway_order_id = txnid;
      await this.paymentRepo.save(payment);
      const amountRupees = amountPaise / 100;
      const checkout = buildHostedCheckoutForm(payu, {
        txnid,
        amountRupees,
        productinfo: `${COMMERCE_ADDONS[addon].label} subscription`,
        firstname: (ctx.name || 'Tenant').slice(0, 60),
        email: ctx.email || 'billing@smebuze.local',
        udf1: 'commerce_addon',
        udf2: payment.id,
        udf3: ctx.tenantId,
      });
      return {
        checkout,
        txnid,
        amount: amountPaise,
        amount_rupees: amountRupees,
        currency: 'INR',
        payment_id: payment.id,
        addon,
        name: 'SMEBUZE',
        description: `${COMMERCE_ADDONS[addon].label} · ₹${addonPriceRupees(addon)}/mo`,
      };
    } catch (err) {
      payment.status = 'failed';
      payment.meta = { ...(payment.meta || {}), error: err instanceof Error ? err.message : 'order failed' };
      await this.paymentRepo.save(payment);
      throw new BadRequestException(err instanceof Error ? err.message : 'Could not start checkout');
    }
  }

  async confirmAddonPayment(_ctx: TenantContext, _body: Record<string, string>) {
    throw new BadRequestException('Add-on payments complete on PayU return. Refresh commerce settings.');
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
}
