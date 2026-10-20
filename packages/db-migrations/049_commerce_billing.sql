-- Tier 8 billing: platform collect order id + SaaS add-on paid-until dates.

ALTER TABLE marketplace_orders
  ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_gateway_order
  ON marketplace_orders (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS storefront_paid_until TIMESTAMPTZ NULL;

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS mall_paid_until TIMESTAMPTZ NULL;

ALTER TABLE tenant_commerce_settings
  ADD COLUMN IF NOT EXISTS addons_meta JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenant_commerce_settings.storefront_paid_until IS 'Online shop add-on valid until; null = admin gifted / not required';
COMMENT ON COLUMN tenant_commerce_settings.mall_paid_until IS 'Mall listing add-on valid until; null with mall_enabled = admin gifted';
