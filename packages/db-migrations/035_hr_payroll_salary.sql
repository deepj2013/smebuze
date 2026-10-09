-- HRMS: salary structure, payroll slips, expense subcategory (owner payroll)

ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_number VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS working_days_per_month INT NOT NULL DEFAULT 26;

CREATE TABLE IF NOT EXISTS employee_salary_components (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  code          VARCHAR(40),
  kind          VARCHAR(20) NOT NULL CHECK (kind IN ('allowance', 'deduction')),
  amount        DECIMAL(18,2) NOT NULL DEFAULT 0,
  is_percent    BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emp_salary_comp_employee ON employee_salary_components(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year              INT NOT NULL,
  month             INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status            VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  total_gross       DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_deductions  DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_net         DECIMAL(18,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  finalized_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, company_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant ON payroll_runs(tenant_id, year, month);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_run_id    UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  slip_number       VARCHAR(40),
  present_days      DECIMAL(5,2) NOT NULL DEFAULT 0,
  paid_days         DECIMAL(5,2) NOT NULL DEFAULT 0,
  leave_days        DECIMAL(5,2) NOT NULL DEFAULT 0,
  absent_days       DECIMAL(5,2) NOT NULL DEFAULT 0,
  working_days      DECIMAL(5,2) NOT NULL DEFAULT 26,
  basic             DECIMAL(18,2) NOT NULL DEFAULT 0,
  allowances_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  deductions_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  gross             DECIMAL(18,2) NOT NULL DEFAULT 0,
  deductions_total  DECIMAL(18,2) NOT NULL DEFAULT 0,
  net               DECIMAL(18,2) NOT NULL DEFAULT 0,
  expense_id        UUID REFERENCES business_expenses(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_run_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_lines_run ON payroll_lines(payroll_run_id);

ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS payroll_line_id UUID;

CREATE TABLE IF NOT EXISTS attendance_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  year          INT NOT NULL,
  month         INT NOT NULL,
  file_name     VARCHAR(255),
  source_format VARCHAR(20) NOT NULL DEFAULT 'csv',
  row_count     INT NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
