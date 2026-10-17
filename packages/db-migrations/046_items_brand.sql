-- Pack brand (Catch, MDH, Everest) — not the shop's company.
ALTER TABLE items ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_items_tenant_brand ON items (tenant_id, lower(brand))
  WHERE brand IS NOT NULL AND btrim(brand) <> '';
