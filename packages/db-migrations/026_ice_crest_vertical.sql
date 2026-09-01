-- Ice Crest tenant vertical: auditable inventory movements, expenses and campaigns.
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('opening','inward','outward','adjustment')),
  quantity DECIMAL(18,4) NOT NULL CHECK (quantity > 0),
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type VARCHAR(40),
  reference_id UUID,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_date ON stock_movements(tenant_id, movement_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movement_reference ON stock_movements(tenant_id, reference_type, reference_id, item_id) WHERE reference_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  category VARCHAR(60) NOT NULL,
  amount DECIMAL(18,2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL,
  description TEXT,
  payment_mode VARCHAR(40),
  reference VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_business_expenses_tenant_date ON business_expenses(tenant_id, expense_date);

ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS shipping_charges DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS other_charges DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS stock_deducted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  message TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

