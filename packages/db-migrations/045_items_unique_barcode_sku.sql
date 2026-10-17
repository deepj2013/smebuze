-- Unique SKU / barcode per tenant for active items (case-insensitive).
-- Skips creating an index when existing duplicates would block it; API still rejects new dupes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_items_tenant_sku_lower'
  ) AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT tenant_id, lower(sku) AS k
      FROM items
      WHERE sku IS NOT NULL AND btrim(sku) <> '' AND is_active = true
      GROUP BY tenant_id, lower(sku)
      HAVING COUNT(*) > 1
    ) d
  ) THEN
    CREATE UNIQUE INDEX uq_items_tenant_sku_lower
      ON items (tenant_id, lower(sku))
      WHERE sku IS NOT NULL AND btrim(sku) <> '' AND is_active = true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'uq_items_tenant_barcode_lower'
  ) AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT tenant_id, lower(barcode) AS k
      FROM items
      WHERE barcode IS NOT NULL AND btrim(barcode) <> '' AND is_active = true
      GROUP BY tenant_id, lower(barcode)
      HAVING COUNT(*) > 1
    ) d
  ) THEN
    CREATE UNIQUE INDEX uq_items_tenant_barcode_lower
      ON items (tenant_id, lower(barcode))
      WHERE barcode IS NOT NULL AND btrim(barcode) <> '' AND is_active = true;
  END IF;
END $$;
