-- Quotations: track whom sent to and when
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotations_lead ON quotations(lead_id);

-- Purchase orders: track when sent to vendor
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(tenant_id, status);

-- Leads: deal pipeline stage (for sales kanban)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deal_stage VARCHAR(50) DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS deal_value DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS expected_close_date DATE;
CREATE INDEX IF NOT EXISTS idx_leads_deal_stage ON leads(tenant_id, deal_stage);
