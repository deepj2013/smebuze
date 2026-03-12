-- Restaurant/wholesale tenant: delivery challan lines (qty + per-customer price), signed challan image, link invoices to challans.
-- All additive: existing delivery_challans and sales_invoices unchanged. Used only when tenant.settings.business_type = 'restaurant_wholesale'.

ALTER TABLE delivery_challans
  ADD COLUMN IF NOT EXISTS signed_challan_image_url VARCHAR(1024) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS delivery_challan_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE CASCADE,
  item_id           UUID REFERENCES items(id),
  description       VARCHAR(500),
  quantity          DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit              VARCHAR(20) DEFAULT 'pcs',
  unit_price        DECIMAL(18,4) NOT NULL DEFAULT 0,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_challan_lines_challan ON delivery_challan_lines(delivery_challan_id);

-- Link invoices to delivery challans for consolidated monthly invoice (one invoice can aggregate multiple challans).
CREATE TABLE IF NOT EXISTS invoice_delivery_challans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  delivery_challan_id UUID NOT NULL REFERENCES delivery_challans(id) ON DELETE RESTRICT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, delivery_challan_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_delivery_challans_invoice ON invoice_delivery_challans(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_delivery_challans_challan ON invoice_delivery_challans(delivery_challan_id);
