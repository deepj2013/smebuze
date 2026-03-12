-- Optional TDS on vendor payments
ALTER TABLE vendor_payments
  ADD COLUMN IF NOT EXISTS tds_amount DECIMAL(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_percent DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN vendor_payments.tds_amount IS 'TDS withheld on this payment';
COMMENT ON COLUMN vendor_payments.tds_percent IS 'TDS rate applied (%)';
