-- Invoice line items (GST-compliant) and paid amount for pending payment tracking

ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(18,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS sales_invoice_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id           UUID REFERENCES items(id),
  hsn_sac           VARCHAR(20) NOT NULL,
  description       VARCHAR(500) NOT NULL,
  qty               DECIMAL(18,4) NOT NULL,
  unit              VARCHAR(20) DEFAULT 'pcs',
  rate              DECIMAL(18,4) NOT NULL,
  taxable_value     DECIMAL(18,2) NOT NULL,
  cgst_rate         DECIMAL(5,2) DEFAULT 0,
  cgst_amount       DECIMAL(18,2) DEFAULT 0,
  sgst_rate         DECIMAL(5,2) DEFAULT 0,
  sgst_amount       DECIMAL(18,2) DEFAULT 0,
  igst_rate         DECIMAL(5,2) DEFAULT 0,
  igst_amount       DECIMAL(18,2) DEFAULT 0,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_lines_invoice ON sales_invoice_lines(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  amount            DECIMAL(18,2) NOT NULL,
  payment_date      DATE NOT NULL,
  mode              VARCHAR(50) DEFAULT 'cash',
  reference         VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
