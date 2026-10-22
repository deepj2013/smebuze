import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TenantSubscriptionPayment } from '../billing/entities/tenant-subscription-payment.entity';
import { MarketplaceOrder } from '../marketplace/entities/marketplace-order.entity';
import {
  frontendUrl,
  normalizePayuBody,
  parseTenantPayu,
  platformPayu,
  verifyPayuTransaction,
  type PayuReturnBody,
} from '../common/payu';
import { BillingService } from '../billing/billing.service';
import { MarketplacePaymentsService } from '../marketplace/marketplace-payments.service';
import { PayuService } from '../integrations/payu.service';

@Injectable()
export class PayuReturnService {
  private readonly logger = new Logger(PayuReturnService.name);

  constructor(
    @InjectRepository(TenantSubscriptionPayment)
    private readonly paymentRepo: Repository<TenantSubscriptionPayment>,
    @InjectRepository(MarketplaceOrder)
    private readonly mpOrderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly billing: BillingService,
    private readonly marketplacePayments: MarketplacePaymentsService,
    private readonly payu: PayuService,
  ) {}

  async handleReturn(body: unknown): Promise<{ redirect: string }> {
    const fields = normalizePayuBody(body);
    const txnid = fields.txnid;
    const udf1 = fields.udf1 || '';
    const status = String(fields.status || '').toLowerCase();
    const mihpayid = fields.mihpayid || fields.bank_ref_num || txnid;

    if (!txnid) {
      return { redirect: `${frontendUrl()}/billing?payu=failed` };
    }

    const platform = platformPayu();
    let cfg = platform;
    if (udf1 === 'invoice' && fields.udf3) {
      const tenant = await this.tenantRepo.findOne({ where: { id: fields.udf3 } });
      cfg = parseTenantPayu(tenant?.settings as Record<string, unknown>);
    }

    const verified = await verifyPayuTransaction(cfg, txnid);
    const ok = verified.status === 'success' || status === 'success';

    if (!ok) {
      return { redirect: this.failRedirect(udf1, fields) };
    }

    try {
      if (udf1 === 'subscription') {
        const payment = await this.paymentRepo.findOne({
          where: { gateway_order_id: txnid, gateway: 'payu' },
        });
        if (payment) {
          payment.gateway_payment_id = mihpayid;
          await this.billing.markPaidPublic(payment);
        }
        return { redirect: `${frontendUrl()}/billing?payu=success` };
      }

      if (udf1 === 'mall_order') {
        const mp =
          (fields.udf2 &&
            (await this.mpOrderRepo.findOne({ where: { id: fields.udf2 } }))) ||
          (await this.mpOrderRepo.findOne({ where: { gateway_order_id: txnid } }));
        if (mp) await this.marketplacePayments.markMallPaid(mp, mihpayid);
        const token = mp?.tracking_token || fields.udf3 || '';
        return { redirect: `${frontendUrl()}/mall/orders/${token}?paid=1` };
      }

      if (udf1 === 'commerce_addon') {
        const payment = await this.paymentRepo.findOne({
          where: { gateway_order_id: txnid, gateway: 'payu' },
        });
        if (payment) await this.marketplacePayments.markAddonPaymentPaid(payment, mihpayid);
        return { redirect: `${frontendUrl()}/organization/commerce?payu=success` };
      }

      if (udf1 === 'invoice') {
        await this.payu.verifyAndApplyInvoice(cfg, txnid, mihpayid);
        const payToken = fields.udf5 || '';
        if (payToken) return { redirect: `${frontendUrl()}/pay/${payToken}?paid=1` };
        return { redirect: `${frontendUrl()}/pay/success?txnid=${encodeURIComponent(txnid)}` };
      }
    } catch (err) {
      this.logger.warn(`PayU return handling failed: ${(err as Error).message}`);
    }

    return { redirect: `${frontendUrl()}/billing?payu=unknown` };
  }

  private failRedirect(kind: string, fields: PayuReturnBody): string {
    if (kind === 'mall_order' && fields.udf3) {
      return `${frontendUrl()}/mall/orders/${fields.udf3}?paid=0`;
    }
    if (kind === 'invoice') {
      return `${frontendUrl()}/pay/failed?txnid=${encodeURIComponent(fields.txnid || '')}`;
    }
    return `${frontendUrl()}/billing?payu=failed`;
  }
}
