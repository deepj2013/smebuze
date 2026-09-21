-- Growth platform: public catalog, storefront sites, portal orders, lead ingest, payment accounts.

ALTER TABLE items ADD COLUMN IF NOT EXISTS portal_listed BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN items.portal_listed IS 'When true, item may appear on the tenant public catalog / shop';

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS channel VARCHAR(40) NOT NULL DEFAULT 'manual';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(32) NULL;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipping_json JSONB NOT NULL DEFAULT '{}';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS buyer_note TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_tracking_token
  ON sales_orders (tracking_token) WHERE tracking_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_channel
  ON sales_orders (tenant_id, channel);

CREATE TABLE IF NOT EXISTS storefront_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  custom_domain VARCHAR(255) NULL,
  domain_status VARCHAR(30) NOT NULL DEFAULT 'none',
  domain_notes TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  shop_enabled BOOLEAN NOT NULL DEFAULT true,
  theme JSONB NOT NULL DEFAULT '{}',
  pages JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),
  UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_sites_custom_domain
  ON storefront_sites (lower(custom_domain)) WHERE custom_domain IS NOT NULL AND custom_domain <> '';

CREATE TABLE IF NOT EXISTS lead_ingest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  message TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  lead_id UUID NULL REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_ingest_tenant_source_created
  ON lead_ingest_events (tenant_id, source, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_gateway_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  credentials JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider)
);
