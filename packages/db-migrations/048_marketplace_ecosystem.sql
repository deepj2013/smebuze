-- Tier 8: B2B Restock Hub + SMEBUZE Mall + settlements + platform delivery.
-- Additive only. Existing tenants unchanged until commerce flags are enabled.

-- ── Tenant commerce settings (opt-in flags) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_commerce_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  storefront_enabled BOOLEAN NOT NULL DEFAULT false,
  mall_enabled BOOLEAN NOT NULL DEFAULT false,
  restock_hub_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_mode VARCHAR(20) NOT NULL DEFAULT 'own',
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'tenant_razorpay',
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  listing_fee_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_commerce_settings IS 'Opt-in online commerce flags. Defaults keep ERP-only tenants unchanged.';
COMMENT ON COLUMN tenant_commerce_settings.delivery_mode IS 'own | platform | both';
COMMENT ON COLUMN tenant_commerce_settings.payment_mode IS 'tenant_razorpay | platform_collect';

-- ── B2B Restock Hub catalog (platform-owned) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  pack_label VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  sku VARCHAR(100) NULL,
  wholesale_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  mrp NUMERIC(18,2) NULL,
  cost_price NUMERIC(18,2) NULL,
  eta_days INT NOT NULL DEFAULT 2,
  delivery_charge NUMERIC(18,2) NOT NULL DEFAULT 0,
  business_types JSONB NOT NULL DEFAULT '[]',
  image_url TEXT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_catalog_active ON hub_catalog_items (active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_hub_catalog_business_types ON hub_catalog_items USING GIN (business_types);

-- Optional link: hub SKU ↔ tenant item (for shortage match + margin)
CREATE TABLE IF NOT EXISTS hub_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hub_item_id UUID NOT NULL REFERENCES hub_catalog_items(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, hub_item_id),
  UNIQUE (tenant_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_hub_item_links_tenant ON hub_item_links (tenant_id);

CREATE TABLE IF NOT EXISTS hub_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  delivery_date DATE NULL,
  delivery_charge NUMERIC(18,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  admin_notes TEXT NULL,
  warehouse_id UUID NULL,
  stock_received BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hub_orders_tenant_status ON hub_orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_orders_status ON hub_orders (status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hub_orders_tenant_number ON hub_orders (tenant_id, number);

CREATE TABLE IF NOT EXISTS hub_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_order_id UUID NOT NULL REFERENCES hub_orders(id) ON DELETE CASCADE,
  hub_item_id UUID NOT NULL REFERENCES hub_catalog_items(id),
  item_id UUID NULL REFERENCES items(id) ON DELETE SET NULL,
  description VARCHAR(255) NOT NULL,
  qty NUMERIC(18,4) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
  wholesale_price NUMERIC(18,2) NOT NULL,
  line_total NUMERIC(18,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hub_order_lines_order ON hub_order_lines (hub_order_id);

-- ── Mall listings (opt-in per item; no hot write on items until listed) ───────
CREATE TABLE IF NOT EXISTS mall_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  boost_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_mall_listings_active ON mall_listings (active, tenant_id) WHERE active = true;

-- ── Marketplace orders (platform ledger; sales_order owns tenant ops) ────────
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_id UUID NULL REFERENCES sales_orders(id) ON DELETE SET NULL,
  channel VARCHAR(40) NOT NULL DEFAULT 'smebuze_mall',
  tracking_token VARCHAR(32) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(50) NOT NULL,
  buyer_address JSONB NOT NULL DEFAULT '{}',
  delivery_mode VARCHAR(20) NOT NULL DEFAULT 'own',
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'platform_collect',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_ref VARCHAR(100) NULL,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 2.00,
  commission_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_to_seller NUMERIC(18,2) NOT NULL DEFAULT 0,
  settlement_id UUID NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'placed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_orders_token ON marketplace_orders (tracking_token);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_seller ON marketplace_orders (seller_tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_payment ON marketplace_orders (payment_status, settlement_id);

CREATE TABLE IF NOT EXISTS marketplace_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  delivery_fees NUMERIC(18,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  paid_at TIMESTAMPTZ NULL,
  payment_reference VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_settlements_tenant ON marketplace_settlements (tenant_id, status);

ALTER TABLE marketplace_orders
  DROP CONSTRAINT IF EXISTS marketplace_orders_settlement_id_fkey;
ALTER TABLE marketplace_orders
  ADD CONSTRAINT marketplace_orders_settlement_id_fkey
  FOREIGN KEY (settlement_id) REFERENCES marketplace_settlements(id) ON DELETE SET NULL;

-- ── Platform delivery jobs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_order_id UUID NULL REFERENCES marketplace_orders(id) ON DELETE SET NULL,
  hub_order_id UUID NULL REFERENCES hub_orders(id) ON DELETE SET NULL,
  seller_tenant_id UUID NULL REFERENCES tenants(id) ON DELETE SET NULL,
  pickup_label TEXT NULL,
  drop_address JSONB NOT NULL DEFAULT '{}',
  fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  rider_name VARCHAR(100) NULL,
  rider_phone VARCHAR(50) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_seller ON delivery_jobs (seller_tenant_id, status);
