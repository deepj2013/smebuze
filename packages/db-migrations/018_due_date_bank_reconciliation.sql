-- Purchase orders: due date for "due today" and ageing
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS due_date DATE;

-- Bank reconciliation: statement lines and match tracking
CREATE TABLE IF NOT EXISTS bank_statement_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  statement_ref     VARCHAR(255),
  line_date         DATE NOT NULL,
  description       VARCHAR(500),
  amount            DECIMAL(18,2) NOT NULL,
  balance_after     DECIMAL(18,2),
  external_id       VARCHAR(255),
  reconciled_at     TIMESTAMPTZ,
  journal_entry_id  UUID REFERENCES journal_entries(id),
  payment_ref_type  VARCHAR(50),
  payment_ref_id    UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_tenant ON bank_statement_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_reconciled ON bank_statement_lines(tenant_id, reconciled_at);
