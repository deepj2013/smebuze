-- Loyalty / credit RFID (or barcode) on the customer. Additive; existing rows stay NULL.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS loyalty_card varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_tenant_loyalty_card
  ON customers (tenant_id, loyalty_card)
  WHERE loyalty_card IS NOT NULL AND loyalty_card <> '';
