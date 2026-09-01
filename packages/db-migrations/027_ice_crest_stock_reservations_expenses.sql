-- Ice Crest reliability: order reservations, invoice linkage and complete expense/purchase entries.
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS stock_reserved_at TIMESTAMPTZ;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS reservation_released_at TIMESTAMPTZ;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity DECIMAL(18,4) NOT NULL CHECK (quantity > 0),
  consumed_quantity DECIMAL(18,4) NOT NULL DEFAULT 0 CHECK (consumed_quantity >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sales_order_id,item_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_tenant_status ON stock_reservations(tenant_id,status);

ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS entry_type VARCHAR(30) NOT NULL DEFAULT 'operating_expense';
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS expense_number VARCHAR(60);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS tds_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'unpaid';
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS attachment_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_expense_number ON business_expenses(tenant_id,expense_number) WHERE expense_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_expense_vendor_invoice ON business_expenses(tenant_id,vendor_id,invoice_number) WHERE vendor_id IS NOT NULL AND invoice_number IS NOT NULL;
