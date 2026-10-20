-- Competitive parity: supplier bills (cost + input GST), loyalty, BOGO, counter label, e-invoice stubs.

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  number varchar(50) NOT NULL,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_bill_no varchar(80),
  status varchar(30) NOT NULL DEFAULT 'posted',
  taxable_amount numeric(18, 2) NOT NULL DEFAULT 0,
  cgst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  sgst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  igst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  total numeric(18, 2) NOT NULL DEFAULT 0,
  notes text,
  stock_received boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant_date
  ON purchase_invoices (tenant_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor
  ON purchase_invoices (tenant_id, vendor_id);

CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  description varchar(500),
  qty numeric(18, 4) NOT NULL DEFAULT 0,
  unit varchar(20) NOT NULL DEFAULT 'pcs',
  unit_cost numeric(18, 4) NOT NULL DEFAULT 0,
  cgst_rate numeric(8, 2) NOT NULL DEFAULT 0,
  sgst_rate numeric(8, 2) NOT NULL DEFAULT 0,
  igst_rate numeric(8, 2) NOT NULL DEFAULT 0,
  taxable_value numeric(18, 2) NOT NULL DEFAULT 0,
  cgst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  sgst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  igst_amount numeric(18, 2) NOT NULL DEFAULT 0,
  batch_code varchar(80),
  expiry_date date,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_bill
  ON purchase_invoice_lines (purchase_invoice_id);

-- Simple shop promos: buy X get Y free (same or linked item).
CREATE TABLE IF NOT EXISTS item_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  promo_type varchar(30) NOT NULL DEFAULT 'bogo',
  buy_item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  buy_qty numeric(18, 4) NOT NULL DEFAULT 1,
  free_item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  free_qty numeric(18, 4) NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  starts_on date,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_promotions_buy_qty_positive CHECK (buy_qty > 0),
  CONSTRAINT item_promotions_free_qty_positive CHECK (free_qty > 0)
);

CREATE INDEX IF NOT EXISTS idx_item_promotions_tenant
  ON item_promotions (tenant_id, is_active);

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS loyalty_points numeric(18, 2) NOT NULL DEFAULT 0;

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS counter_label varchar(100);

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS e_invoice_payload jsonb;

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS e_way_bill_no varchar(50);
