-- CRM: Contact categories and message templates for campaigns

CREATE TABLE IF NOT EXISTS contact_categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  description       VARCHAR(500),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_contact_categories_tenant ON contact_categories(tenant_id);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES contact_categories(id) ON DELETE SET NULL;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES contact_categories(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS message_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,
  subject           VARCHAR(500),
  body              TEXT NOT NULL,
  channel           VARCHAR(50) DEFAULT 'email',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_templates_tenant ON message_templates(tenant_id);
