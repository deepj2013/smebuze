/** How a shop collects money from its customers (not SaaS plan billing). */

export const CUSTOMER_PAYMENT_MODES = ['platform_collect', 'tenant_razorpay', 'upi_qr'] as const;
export type CustomerPaymentMode = (typeof CUSTOMER_PAYMENT_MODES)[number];

/** Default platform fee when SMEBUZE collects on behalf of the shop. */
export const DEFAULT_PLATFORM_FEE_PCT = 2.5;

export const PAYMENT_MODE_COPY: Record<
  CustomerPaymentMode,
  { label: string; buyerPays: string; shopGets: string; smebuzeGets: string }
> = {
  platform_collect: {
    label: 'SMEBUZE collect (recommended for Mall / COD-free online)',
    buyerPays: 'Bill amount, or bill + 2.5% if shop passes the fee to the customer',
    shopGets: 'Net after platform fee, settled T+1 to shop bank / UPI',
    smebuzeGets: 'Platform fee (default 2.5%) as commission',
  },
  tenant_razorpay: {
    label: 'Shop’s own Razorpay / payment gateway',
    buyerPays: 'Bill amount only (no SMEBUZE fee on the card)',
    shopGets: 'Full settlement from Razorpay to the shop’s account',
    smebuzeGets: 'Nothing on the transaction (SaaS plan is separate)',
  },
  upi_qr: {
    label: 'Shop’s own UPI QR image',
    buyerPays: 'Bill amount via UPI to the shop',
    shopGets: 'Instant to shop UPI — shop marks paid manually if needed',
    smebuzeGets: 'Nothing on the transaction',
  },
};

export function isCustomerPaymentMode(v: unknown): v is CustomerPaymentMode {
  return typeof v === 'string' && (CUSTOMER_PAYMENT_MODES as readonly string[]).includes(v);
}

/** Fee rupees on a taxable/gross bill. */
export function platformFeeRupees(grossRupees: number, feePct = DEFAULT_PLATFORM_FEE_PCT): number {
  const g = Math.max(0, Number(grossRupees) || 0);
  const pct = Math.max(0, Number(feePct) || 0);
  return Math.round(g * (pct / 100) * 100) / 100;
}

/**
 * Amount the customer is charged at checkout.
 * passFeeToCustomer=true → shop nets ≈ gross; customer pays gross + fee.
 */
export function customerChargeRupees(
  grossRupees: number,
  opts: { feePct?: number; passFeeToCustomer?: boolean } = {},
): { charge: number; fee: number; netToShop: number } {
  const gross = Math.round(Math.max(0, Number(grossRupees) || 0) * 100) / 100;
  const fee = platformFeeRupees(gross, opts.feePct ?? DEFAULT_PLATFORM_FEE_PCT);
  if (opts.passFeeToCustomer !== false) {
    return { charge: Math.round((gross + fee) * 100) / 100, fee, netToShop: gross };
  }
  return { charge: gross, fee, netToShop: Math.round((gross - fee) * 100) / 100 };
}

export const COMPLIANCE_CHECKLIST = [
  {
    id: 'kyc_platform',
    title: 'SMEBUZE Razorpay KYC (live)',
    detail: 'Platform account must be live KYC’d before collecting for shops. Settlements leave this account.',
  },
  {
    id: 'fee_disclosure',
    title: 'Show fee on checkout',
    detail: 'When pass-fee-to-customer is on, the buyer receipt must show “Platform fee 2.5%” separately.',
  },
  {
    id: 'settlement_t1',
    title: 'T+1 payout trail',
    detail: 'Keep NEFT/UPI reference on each settlement. Do not mix SaaS plan money with shop collect money.',
  },
  {
    id: 'tenant_gateway_keys',
    title: 'Tenant gateway keys encrypted',
    detail: 'Shop Razorpay secrets stored encrypted; never log Key Secret. Webhook per shop for auto mark-paid.',
  },
  {
    id: 'upi_qr_manual',
    title: 'UPI QR is not auto-reconciled',
    detail: 'QR image mode needs shop staff to confirm payment — no bank callback.',
  },
  {
    id: 'saas_ecs',
    title: 'SaaS ECS / eMandate',
    detail: 'Tenant→SMEBUZE plan renewals use Razorpay Subscriptions + eMandate. Separate from shop collect.',
  },
  {
    id: 'rbi_pa',
    title: 'Payment Aggregator posture',
    detail: 'If volume grows, confirm with counsel whether platform_collect needs PA/PG authorisation vs pure SaaS + Route.',
  },
] as const;
