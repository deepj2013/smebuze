-- Item MRP (default price when no client-specific price) and tax rate for tax calculation
ALTER TABLE items ADD COLUMN IF NOT EXISTS mrp DECIMAL(18,2) DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN items.mrp IS 'Maximum retail price / default selling price when no client-specific rate';
COMMENT ON COLUMN items.tax_rate IS 'Tax rate % applied (e.g. 0, 5, 12, 18, 28 for GST)';
