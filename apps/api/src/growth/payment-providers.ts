export type PaymentProviderId = 'payu' | 'stripe' | 'cashfree';

export type PaymentProviderField = { key: string; label: string; secret?: boolean };

export type PaymentProviderDef = {
  id: PaymentProviderId;
  label: string;
  live: boolean;
  fields: PaymentProviderField[];
};

export const PAYMENT_PROVIDERS: PaymentProviderDef[] = [
  {
    id: 'payu',
    label: 'PayU',
    live: true,
    fields: [
      { key: 'key', label: 'Merchant key' },
      { key: 'salt', label: 'Merchant salt', secret: true },
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
    id: 'cashfree',
    label: 'Cashfree',
    live: false,
    fields: [
      { key: 'app_id', label: 'App ID' },
      { key: 'secret_key', label: 'Secret key', secret: true },
    ],
  },
];

export function getPaymentProvider(id: string): PaymentProviderDef | undefined {
  return PAYMENT_PROVIDERS.find((p) => p.id === id);
}
