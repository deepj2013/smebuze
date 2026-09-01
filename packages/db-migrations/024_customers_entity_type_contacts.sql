-- Add entity_type and contacts to customers (for add/edit customer form and dashboard).
-- Fixes: column SalesInvoice__SalesInvoice_customer.entity_type does not exist

ALTER TABLE customers ADD COLUMN IF NOT EXISTS entity_type VARCHAR(20) DEFAULT 'company';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]';

COMMENT ON COLUMN customers.entity_type IS 'individual | company | other';
COMMENT ON COLUMN customers.contacts IS 'Contact persons: [{ name, email?, phone?, department? }]';


cd /var/www/smebuze
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_NAME=smebuze
npm run db:migrate