-- Lead live (feature flag already via tenants.features lead_hub).
-- Platform support tickets: tenant → SMEBUZE admin. Additive only.

CREATE TABLE IF NOT EXISTS platform_support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  number          VARCHAR(40) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(40) NOT NULL DEFAULT 'general',
  status          VARCHAR(30) NOT NULL DEFAULT 'open',
  priority        VARCHAR(20) NOT NULL DEFAULT 'medium',
  admin_notes     TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_support_tenant ON platform_support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_support_status ON platform_support_tickets(status);

INSERT INTO permissions (id, key, module, description) VALUES
  (gen_random_uuid(), 'admin.support.view', 'admin', 'View platform support tickets'),
  (gen_random_uuid(), 'admin.support.manage', 'admin', 'Update platform support tickets')
ON CONFLICT (key) DO NOTHING;
