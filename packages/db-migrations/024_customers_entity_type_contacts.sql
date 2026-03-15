-- Add entity_type and contacts to customers (for add/edit customer form and dashboard).
-- Fixes: column SalesInvoice__SalesInvoice_customer.entity_type does not exist

ALTER TABLE customers ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'company';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]';

COMMENT ON COLUMN customers.entity_type IS 'individual | company | other';
COMMENT ON COLUMN customers.contacts IS 'Contact persons: [{ name, email?, phone?, department? }]';
