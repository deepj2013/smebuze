-- SMEBUZZ Multi-Tenant Foundation
-- Run as PostgreSQL superuser or app user with CREATE rights

-- Platform organisation (SMEBUZZ)
CREATE TABLE IF NOT EXISTS platform_org (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) UNIQUE NOT NULL,
  settings          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants = customer organisations (each MSME)
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_org_id   UUID NOT NULL REFERENCES platform_org(id),
  name              VARCHAR(255) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  plan              VARCHAR(50) NOT NULL DEFAULT 'basic', -- basic | advanced | enterprise | ai_pro
  license_key       VARCHAR(255),
  features          JSONB DEFAULT '[]',  -- enabled module keys e.g. ["crm","sales","purchase","inventory","accounting","reports","ai","whatsapp"]
  settings          JSONB DEFAULT '{}',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_org_id, slug)
);

CREATE INDEX idx_tenants_platform ON tenants(platform_org_id);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_license ON tenants(license_key) WHERE license_key IS NOT NULL;

-- Companies under a tenant (multi-company)
CREATE TABLE IF NOT EXISTS companies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  legal_name        VARCHAR(255),
  gstin             VARCHAR(50),
  address           JSONB DEFAULT '{}',
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_tenant ON companies(tenant_id);

-- Branches under a company
CREATE TABLE IF NOT EXISTS branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  address           JSONB DEFAULT '{}',
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_branches_company ON branches(company_id);

-- Departments (optional, tenant-level or company-level)
CREATE TABLE IF NOT EXISTS departments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);

-- Permissions (global list)
CREATE TABLE IF NOT EXISTS permissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               VARCHAR(100) UNIQUE NOT NULL,  -- e.g. crm.lead.create, sales.invoice.view
  module            VARCHAR(50) NOT NULL,
  description       VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Roles (per-tenant; tenant_id NULL = system role for super admin)
CREATE TABLE IF NOT EXISTS roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  is_system         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id           UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id     UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Users (belong to tenant; one user can be in one tenant for MVP)
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL only for super_admin
  email             VARCHAR(255) NOT NULL,
  password_hash     VARCHAR(255),
  name              VARCHAR(255),
  phone             VARCHAR(50),
  is_active         BOOLEAN DEFAULT true,
  is_super_admin    BOOLEAN DEFAULT false,
  default_company_id UUID REFERENCES companies(id),
  default_branch_id  UUID REFERENCES branches(id),
  settings          JSONB DEFAULT '{}',
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- User-Role mapping (user can have multiple roles in same tenant)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id           UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Audit log (sensitive actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  user_id           UUID REFERENCES users(id),
  action            VARCHAR(100) NOT NULL,
  resource          VARCHAR(100),
  resource_id       UUID,
  details           JSONB DEFAULT '{}',
  ip                INET,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Activity log (general activity)
CREATE TABLE IF NOT EXISTS activity_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id),
  module            VARCHAR(50),
  action            VARCHAR(100),
  entity_type       VARCHAR(100),
  entity_id         UUID,
  summary           VARCHAR(500),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- Subscriptions (billing period per tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan              VARCHAR(50) NOT NULL,
  interval          VARCHAR(20) NOT NULL, -- monthly | quarterly | half_yearly | yearly
  started_at        TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
