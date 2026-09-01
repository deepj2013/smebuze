-- Platform subscription payments (SMEBUZE plan after trial) plus GST return books.
CREATE TABLE IF NOT EXISTS tenant_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  gateway varchar(20) NOT NULL,
  plan varchar(50) NOT NULL,
  interval varchar(20) NOT NULL,
  amount_paise integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'created',
  gateway_order_id varchar(120),
  gateway_payment_id varchar(120),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_subscription_payments_tenant_id ON tenant_subscription_payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscription_payments_gateway_order_id ON tenant_subscription_payments (gateway_order_id);

CREATE TABLE IF NOT EXISTS gstr2a_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  company_id uuid,
  period varchar(7) NOT NULL,
  supplier_gstin varchar(15) NOT NULL,
  invoice_number varchar(50) NOT NULL,
  invoice_date date NOT NULL,
  taxable_value decimal(18,2) NOT NULL DEFAULT 0,
  cgst decimal(18,2) NOT NULL DEFAULT 0,
  sgst decimal(18,2) NOT NULL DEFAULT 0,
  igst decimal(18,2) NOT NULL DEFAULT 0,
  invoice_value decimal(18,2) NOT NULL DEFAULT 0,
  source_table varchar(20) NOT NULL DEFAULT 'b2b',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gstr2a_invoices_tenant_period ON gstr2a_invoices (tenant_id, period);

ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS nature varchar(30) NOT NULL DEFAULT 'operations';
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS hsn_sac varchar(20);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS itc_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS journal_entry_id uuid;
