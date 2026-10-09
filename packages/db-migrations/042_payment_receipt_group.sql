-- One customer receipt can be split across several invoices.
ALTER TABLE invoice_payments ADD COLUMN IF NOT EXISTS receipt_group UUID;
CREATE INDEX IF NOT EXISTS idx_invoice_payments_receipt_group ON invoice_payments (receipt_group);
