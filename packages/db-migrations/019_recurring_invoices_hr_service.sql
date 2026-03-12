-- Recurring invoices (task 45)
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  customer_id       UUID REFERENCES customers(id),
  number_prefix     VARCHAR(20) DEFAULT 'RINV',
  frequency         VARCHAR(20) NOT NULL, -- daily | weekly | monthly | yearly
  next_run_at       DATE NOT NULL,
  last_run_at       DATE,
  template_invoice_id UUID REFERENCES sales_invoices(id),
  is_active         BOOLEAN DEFAULT true,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_tenant ON recurring_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next ON recurring_invoices(tenant_id, next_run_at) WHERE is_active = true;

-- HR: Employee master (task 60)
CREATE TABLE IF NOT EXISTS employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  employee_code     VARCHAR(50),
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(50),
  department_id     UUID REFERENCES departments(id),
  designation       VARCHAR(100),
  joining_date      DATE,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, employee_code)
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);

-- HR: Attendance (task 61)
CREATE TABLE IF NOT EXISTS attendance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date    DATE NOT NULL,
  check_in          TIMESTAMPTZ,
  check_out         TIMESTAMPTZ,
  status            VARCHAR(20) DEFAULT 'present', -- present | absent | half_day | leave
  notes             VARCHAR(500),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);

-- HR: Leave types and leave applications (task 62)
CREATE TABLE IF NOT EXISTS leave_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  code              VARCHAR(20),
  days_per_year     DECIMAL(5,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id     UUID NOT NULL REFERENCES leave_types(id),
  from_date         DATE NOT NULL,
  to_date           DATE NOT NULL,
  days              DECIMAL(5,2) NOT NULL,
  reason            VARCHAR(500),
  status            VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
  approved_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_applications_tenant ON leave_applications(tenant_id);

-- Service: Ticket (task 63)
CREATE TABLE IF NOT EXISTS service_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  customer_id       UUID REFERENCES customers(id),
  number            VARCHAR(50) NOT NULL,
  subject           VARCHAR(255) NOT NULL,
  description       TEXT,
  status            VARCHAR(30) DEFAULT 'open', -- open | in_progress | resolved | closed
  priority          VARCHAR(20) DEFAULT 'medium',
  assigned_to       UUID REFERENCES users(id),
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, number)
);

CREATE INDEX IF NOT EXISTS idx_service_tickets_tenant ON service_tickets(tenant_id);

-- Service: AMC (task 64)
CREATE TABLE IF NOT EXISTS amc_contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id),
  customer_id       UUID NOT NULL REFERENCES customers(id),
  contract_number   VARCHAR(50) NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  renewal_date      DATE,
  amount            DECIMAL(18,2) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'active',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, company_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_amc_contracts_tenant ON amc_contracts(tenant_id);
