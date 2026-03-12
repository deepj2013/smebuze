-- Users: link to department; Departments: allowed modules for menu/access

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS allowed_modules JSONB DEFAULT '["dashboard","onboarding","crm","sales","purchase","inventory","accounting","reports","bulk_upload","organization"]';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id) WHERE department_id IS NOT NULL;
