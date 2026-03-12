-- Inventory
CREATE TABLE IF NOT EXISTS warehouses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  name              VARCHAR(255) NOT NULL,
  code              VARCHAR(50),
  address           JSONB DEFAULT '{}',
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warehouses_tenant ON warehouses(tenant_id);

CREATE TABLE IF NOT EXISTS items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id),
  sku               VARCHAR(100),
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  unit              VARCHAR(20) DEFAULT 'pcs',
  category          VARCHAR(100),
  hsn_sac           VARCHAR(20),
  reorder_level     DECIMAL(18,4) DEFAULT 0,
  valuation_method  VARCHAR(20) DEFAULT 'fifo', -- fifo | lifo | weighted
  is_active         BOOLEAN DEFAULT true,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, sku)
);

CREATE INDEX idx_items_tenant ON items(tenant_id);

CREATE TABLE IF NOT EXISTS stock (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id      UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity          DECIMAL(18,4) NOT NULL DEFAULT 0,
  reserved          DECIMAL(18,4) DEFAULT 0,
  batch_code        VARCHAR(100),
  expiry_date       DATE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, item_id, batch_code)
);

CREATE INDEX idx_stock_tenant ON stock(tenant_id);
CREATE INDEX idx_stock_item ON stock(item_id);

-- Accounting
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  code              VARCHAR(50) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  type              VARCHAR(50) NOT NULL, -- asset | liability | equity | income | expense
  parent_id         UUID REFERENCES chart_of_accounts(id),
  is_system         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, code)
);

CREATE INDEX idx_coa_tenant ON chart_of_accounts(tenant_id);

CREATE TABLE IF NOT EXISTS journal_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  number            VARCHAR(50) NOT NULL,
  entry_date        DATE NOT NULL,
  reference         VARCHAR(255),
  status            VARCHAR(50) DEFAULT 'draft',
  total_debit       DECIMAL(18,2) DEFAULT 0,
  total_credit      DECIMAL(18,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id        UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit             DECIMAL(18,2) DEFAULT 0,
  credit            DECIMAL(18,2) DEFAULT 0,
  narration         VARCHAR(500),
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_je_tenant ON journal_entries(tenant_id);
CREATE INDEX idx_je_date ON journal_entries(tenant_id, entry_date);
