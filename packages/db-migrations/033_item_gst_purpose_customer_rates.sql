-- Product-level CGST/SGST (editable), sale vs consume purpose, optional per-customer item rates
ALTER TABLE items ADD COLUMN IF NOT EXISTS cgst_rate DECIMAL(5,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sgst_rate DECIMAL(5,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS for_sale BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS for_consume BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN items.cgst_rate IS 'CGST % stored on the product; invoice lines copy this and stay editable';
COMMENT ON COLUMN items.sgst_rate IS 'SGST % stored on the product; invoice lines copy this and stay editable';
COMMENT ON COLUMN items.for_sale IS 'When true, item appears on invoices, orders and quotations';
COMMENT ON COLUMN items.for_consume IS 'When true, item can be used for stock inward/outward and production consume';
COMMENT ON COLUMN items.tax_rate IS 'Combined GST % (cgst_rate + sgst_rate) for POS and backward-compatible clients';

UPDATE items
SET
  cgst_rate = COALESCE(cgst_rate, ROUND(COALESCE(tax_rate, 0) / 2, 2)),
  sgst_rate = COALESCE(sgst_rate, ROUND(COALESCE(tax_rate, 0) / 2, 2))
WHERE cgst_rate IS NULL OR sgst_rate IS NULL;

-- Ice Crest water / ice is typically 5% GST (2.5 + 2.5). Apply only where tax was never set.
UPDATE items i
SET cgst_rate = 2.5, sgst_rate = 2.5, tax_rate = 5
FROM tenants t
WHERE i.tenant_id = t.id
  AND (t.slug = 'ice-crest' OR COALESCE(t.settings->>'business_type', '') = 'ice_crest')
  AND COALESCE(i.tax_rate, 0) = 0;

CREATE TABLE IF NOT EXISTS customer_item_rates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  rate        DECIMAL(18,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_item_rates_customer
  ON customer_item_rates (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_item_rates_item
  ON customer_item_rates (tenant_id, item_id);

COMMENT ON TABLE customer_item_rates IS 'Optional customer-specific selling rate per item. If unset, invoices use sale_price / MRP.';
