-- Production (synchronize is off). Run once against the SMEBUZE database.
CREATE TABLE IF NOT EXISTS tenant_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  gateway varchar(20) NOT NULL,
  plan varchar(50) NOT NULL,
  interval varchar(20) NOT NULL,
  amount_paise integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'created',
  gateway_order_id varchar(120),
  gateway_payment_id varchar(120),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS IDX_tenant_subscription_payments_tenant_id ON tenant_subscription_payments (tenant_id);
CREATE INDEX IF NOT EXISTS IDX_tenant_subscription_payments_gateway_order_id ON tenant_subscription_payments (gateway_order_id);
