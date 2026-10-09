-- Tenant invoice series lives in tenants.settings.document_series (no column change).
-- GST credit / debit note amounts, and sales debit notes against invoices.
-- Safe to re-run. Does not rewrite existing invoice numbers or note rows.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS reason_code VARCHAR(40);

ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS taxable_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS reason_code VARCHAR(40);

CREATE TABLE IF NOT EXISTS sales_debit_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  branch_id       UUID REFERENCES branches(id),
  number          VARCHAR(50) NOT NULL,
  invoice_id      UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  note_date       DATE NOT NULL,
  amount          DECIMAL(18,2) NOT NULL,
  taxable_amount  DECIMAL(18,2) NOT NULL DEFAULT 0,
  cgst_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,
  sgst_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,
  igst_amount     DECIMAL(18,2) NOT NULL DEFAULT 0,
  reason          VARCHAR(500),
  reason_code     VARCHAR(40),
  status          VARCHAR(50) DEFAULT 'issued',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_sales_debit_notes_tenant ON sales_debit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_debit_notes_invoice ON sales_debit_notes(invoice_id);
