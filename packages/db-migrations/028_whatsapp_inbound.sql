CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  wa_message_id VARCHAR(100),
  from_phone VARCHAR(30) NOT NULL,
  profile_name VARCHAR(150),
  message_type VARCHAR(30) NOT NULL DEFAULT 'text',
  body TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_tenant ON whatsapp_inbound_messages(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_inbound_wa_id ON whatsapp_inbound_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
