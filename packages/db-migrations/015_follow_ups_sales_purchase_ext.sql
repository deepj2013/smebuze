-- Follow-ups (CRM)
CREATE TABLE IF NOT EXISTS follow_ups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id           UUID REFERENCES leads(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id) ON DELETE CASCADE,
  due_at            TIMESTAMPTZ NOT NULL,
  note              TEXT,
  status            VARCHAR(50) DEFAULT 'pending', -- pending | done | cancelled
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(tenant_id, due_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);

-- Delivery challans
CREATE TABLE IF NOT EXISTS delivery_challans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  customer_id       UUID REFERENCES customers(id),
  order_id          UUID REFERENCES sales_orders(id),
  invoice_id        UUID REFERENCES sales_invoices(id),
  challan_date      DATE NOT NULL,
  status            VARCHAR(50) DEFAULT 'draft',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_challans_tenant ON delivery_challans(tenant_id);

-- Credit notes (sales return)
CREATE TABLE IF NOT EXISTS credit_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  invoice_id        UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  note_date         DATE NOT NULL,
  amount            DECIMAL(18,2) NOT NULL,
  reason            VARCHAR(500),
  status            VARCHAR(50) DEFAULT 'draft', -- draft | posted
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant ON credit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);

-- GRN (Goods receipt note)
CREATE TABLE IF NOT EXISTS grns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  grn_date          DATE NOT NULL,
  status            VARCHAR(50) DEFAULT 'draft', -- draft | received
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE TABLE IF NOT EXISTS grn_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id             UUID NOT NULL REFERENCES grns(id) ON DELETE CASCADE,
  item_id            UUID REFERENCES items(id),
  description        VARCHAR(500),
  ordered_qty       DECIMAL(18,4) NOT NULL DEFAULT 0,
  received_qty       DECIMAL(18,4) NOT NULL DEFAULT 0,
  sort_order         INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grns_tenant ON grns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grns_po ON grns(purchase_order_id);

-- Debit notes (purchase return)
CREATE TABLE IF NOT EXISTS debit_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id         UUID NOT NULL REFERENCES companies(id),
  branch_id          UUID REFERENCES branches(id),
  number             VARCHAR(50) NOT NULL,
  purchase_order_id  UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  note_date          DATE NOT NULL,
  amount             DECIMAL(18,2) NOT NULL,
  reason             VARCHAR(500),
  status             VARCHAR(50) DEFAULT 'draft', -- draft | posted
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_tenant ON debit_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_po ON debit_notes(purchase_order_id);

-- Stock transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_warehouse_id  UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  transfer_date      DATE NOT NULL,
  status             VARCHAR(50) DEFAULT 'draft', -- draft | completed
  reference          VARCHAR(255),
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_transfer_id  UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity           DECIMAL(18,4) NOT NULL,
  sort_order         INT DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_tenant ON stock_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers(to_warehouse_id);
