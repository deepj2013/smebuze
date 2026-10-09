-- Link trips to sales invoices when billed (tenant-scoped).
ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transport_trips_invoice ON transport_trips(tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_bill_status ON transport_trips(tenant_id, bill_status);
