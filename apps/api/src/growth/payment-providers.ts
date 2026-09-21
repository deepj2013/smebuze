export type PaymentProviderId = 'razorpay' | 'stripe' | 'payu' | 'cashfree' | 'phonepe';

export type PaymentProviderField = { key: string; label: string; secret?: boolean };

export type PaymentProviderDef = {
  id: PaymentProviderId;
  label: string;
  live: boolean;
  fields: PaymentProviderField[];
};

export const PAYMENT_PROVIDERS: PaymentProviderDef[] = [
  {
    id: 'razorpay',
    label: 'Razorpay',
    live: true,
    fields: [
      { key: 'key_id', label: 'Key ID' },
      { key: 'key_secret', label: 'Key secret', secret: true },
      { key: 'webhook_secret', label: 'Webhook secret', secret: true },
    ],
  },
  {
    id: 'stripe',
    label: 'Stripe',
    live: false,
    fields: [
      { key: 'publishable_key', label: 'Publishable key' },
      { key: 'secret_key', label: 'Secret key', secret: true },
    ],
  },
  {
    id: 'payu',
    label: 'PayU',
    live: false,
    fields: [
      { key: 'merchant_key', label: 'Merchant key' },
      { key: 'merchant_salt', label: 'Merchant salt', secret: true },
    ],
  },
  {
    id: 'cashfree',
    label: 'Cashfree',
    live: false,
    fields: [
      { key: 'app_id', label: 'App ID' },
      { key: 'secret_key', label: 'Secret key', secret: true },
    ],
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    live: false,
    fields: [
      { key: 'merchant_id', label: 'Merchant ID' },
      { key: 'salt_key', label: 'Salt key', secret: true },
    ],
  },
];

export function getPaymentProvider(id: string): PaymentProviderDef | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}
