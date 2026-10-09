-- Platform marketing partners, referral attribution, commissions, BDE pipeline.
-- PRODUCTION-SAFE: additive only. No DROP. No UPDATE of tenant business rows.
-- New columns on tenants/users are NULLABLE so existing live tenants keep working unchanged.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_role VARCHAR(20);

COMMENT ON COLUMN users.platform_role IS 'null=tenant user; bde=platform sales; partner=agency login; super admin uses is_super_admin';

CREATE TABLE IF NOT EXISTS platform_partners (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(255) NOT NULL,
  code                 VARCHAR(40) NOT NULL,
  contact_name         VARCHAR(150),
  contact_email        VARCHAR(255),
  contact_phone        VARCHAR(50),
  commission_percent   DECIMAL(5,2) NOT NULL DEFAULT 20,
  status               VARCHAR(20) NOT NULL DEFAULT 'active',
  user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_platform_partners_status ON platform_partners(status);
CREATE INDEX IF NOT EXISTS idx_platform_partners_user ON platform_partners(user_id);

-- Nullable: live tenants without a referral stay NULL (no backfill, no error).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES platform_partners(id) ON DELETE SET NULL;
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_tenants_referred_by ON tenants(referred_by_partner_id);

CREATE TABLE IF NOT EXISTS platform_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES platform_partners(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id        UUID REFERENCES tenant_subscription_payments(id) ON DELETE SET NULL,
  amount_paise      INT NOT NULL DEFAULT 0,
  commission_paise  INT NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_partner ON platform_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_tenant ON platform_commissions(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_commissions_payment
  ON platform_commissions(payment_id) WHERE payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bde_leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name            VARCHAR(255) NOT NULL,
  contact_name            VARCHAR(150),
  contact_email           VARCHAR(255),
  contact_phone           VARCHAR(50),
  status                  VARCHAR(40) NOT NULL DEFAULT 'new',
  estimated_price_rupees  INT,
  plan                    VARCHAR(40) DEFAULT 'basic',
  billing_interval        VARCHAR(20) DEFAULT 'quarterly',
  notes                   TEXT,
  source                  VARCHAR(40) DEFAULT 'outbound',
  converted_tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bde_leads_owner ON bde_leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bde_leads_status ON bde_leads(status);

INSERT INTO permissions (id, key, module, description) VALUES
  (gen_random_uuid(), 'admin.bde.leads', 'admin', 'Manage BDE sales pipeline for SMEBUZE'),
  (gen_random_uuid(), 'admin.partner.manage', 'admin', 'Manage marketing partners and commissions'),
  (gen_random_uuid(), 'admin.partner.mine', 'admin', 'View own partner referrals and commissions')
ON CONFLICT (key) DO NOTHING;
