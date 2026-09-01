-- POS categories + cost / sale / discount on items
CREATE TABLE IF NOT EXISTS item_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_item_categories_tenant ON item_categories (tenant_id);

ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(18,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(18,2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2);

COMMENT ON COLUMN items.cost_price IS 'Purchase / cost price (not shown on the bill)';
COMMENT ON COLUMN items.sale_price IS 'Counter selling price before optional discount';
COMMENT ON COLUMN items.discount_percent IS 'Optional % off sale price at the counter';

INSERT INTO item_categories (tenant_id, name)
SELECT DISTINCT i.tenant_id, TRIM(i.category)
FROM items i
WHERE i.category IS NOT NULL AND TRIM(i.category) <> ''
ON CONFLICT (tenant_id, name) DO NOTHING;
