-- CRM
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id),
  source            VARCHAR(100),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  stage             VARCHAR(50) NOT NULL DEFAULT 'new', -- new | contacted | qualified | proposal | won | lost
  score             INT DEFAULT 0,
  assigned_to       UUID REFERENCES users(id),
  tags              JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_stage ON leads(tenant_id, stage);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

CREATE TABLE IF NOT EXISTS customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  gstin             VARCHAR(50),
  address           JSONB DEFAULT '{}',
  credit_limit      DECIMAL(18,2) DEFAULT 0,
  tags              JSONB DEFAULT '[]',
  segment           VARCHAR(50),
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- Sales
CREATE TABLE IF NOT EXISTS quotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  customer_id       UUID REFERENCES customers(id),
  issue_date        DATE NOT NULL,
  valid_until       DATE,
  status            VARCHAR(50) DEFAULT 'draft', -- draft | sent | accepted | rejected
  total             DECIMAL(18,2) DEFAULT 0,
  tax_amount        DECIMAL(18,2) DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id      UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_id           UUID, -- references items(id) when inventory module present
  description       VARCHAR(500),
  qty               DECIMAL(18,4) NOT NULL,
  unit              VARCHAR(20) DEFAULT 'pcs',
  rate              DECIMAL(18,4) NOT NULL,
  amount            DECIMAL(18,2) NOT NULL,
  tax_rate          DECIMAL(5,2) DEFAULT 0,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  customer_id       UUID REFERENCES customers(id),
  quotation_id      UUID REFERENCES quotations(id),
  order_date        DATE NOT NULL,
  status            VARCHAR(50) DEFAULT 'draft',
  total             DECIMAL(18,2) DEFAULT 0,
  tax_amount        DECIMAL(18,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE TABLE IF NOT EXISTS sales_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  customer_id       UUID REFERENCES customers(id),
  order_id          UUID REFERENCES sales_orders(id),
  invoice_date      DATE NOT NULL,
  due_date          DATE,
  status            VARCHAR(50) DEFAULT 'draft',
  total             DECIMAL(18,2) DEFAULT 0,
  tax_amount        DECIMAL(18,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

-- Purchase
CREATE TABLE IF NOT EXISTS vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  gstin             VARCHAR(50),
  address           JSONB DEFAULT '{}',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendors_tenant ON vendors(tenant_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  branch_id         UUID REFERENCES branches(id),
  number            VARCHAR(50) NOT NULL,
  vendor_id         UUID NOT NULL REFERENCES vendors(id),
  order_date        DATE NOT NULL,
  status            VARCHAR(50) DEFAULT 'draft',
  total             DECIMAL(18,2) DEFAULT 0,
  tax_amount        DECIMAL(18,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);
