-- Customer→tenant collect modes + SaaS ECS mandate + finance reporting helpers.

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS pass_fee_to_customer boolean NOT NULL DEFAULT true;

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS upi_qr_image_url text;

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS settle_days int NOT NULL DEFAULT 1;

COMMENT ON COLUMN tenant_commerce_settings.payment_mode IS
  'platform_collect | tenant_razorpay | upi_qr — how the shop takes money from its customers';
COMMENT ON COLUMN tenant_commerce_settings.commission_pct IS
  'Platform fee % when payment_mode=platform_collect (default 2.50)';
COMMENT ON COLUMN tenant_commerce_settings.pass_fee_to_customer IS
  'When true, checkout charges bill + fee so the shop nets the bill amount';
COMMENT ON COLUMN tenant_commerce_settings.upi_qr_image_url IS
  'Static UPI QR image URL when payment_mode=upi_qr';
COMMENT ON COLUMN tenant_commerce_settings.settle_days IS
  'Business days after capture before settlement is due (T+1 default)';

-- Raise default for new rows (existing rows keep their value until admin changes).
ALTER TABLE tenant_commerce_settings
  ALTER COLUMN commission_pct SET DEFAULT 2.50;

-- SaaS (tenant→SMEBUZE) ECS / e-mandate tracking
CREATE TABLE IF NOT EXISTS tenant_billing_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  gateway varchar(30) NOT NULL DEFAULT 'razorpay',
  status varchar(30) NOT NULL DEFAULT 'created',
  plan varchar(40) NOT NULL,
  interval varchar(20) NOT NULL DEFAULT 'quarterly',
  amount_paise int NOT NULL DEFAULT 0,
  gateway_plan_id varchar(80),
  gateway_subscription_id varchar(80),
  gateway_customer_id varchar(80),
  mandate_token varchar(120),
  next_charge_at timestamptz,
  last_charged_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_billing_mandates_active
  ON tenant_billing_mandates (tenant_id)
  WHERE status IN ('created', 'authenticated', 'active');

CREATE INDEX IF NOT EXISTS idx_tenant_billing_mandates_sub
  ON tenant_billing_mandates (gateway_subscription_id)
  WHERE gateway_subscription_id IS NOT NULL;
