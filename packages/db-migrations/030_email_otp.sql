-- Email verification + OTP codes
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS email_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     VARCHAR(40) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_purpose ON email_otps (user_id, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at) WHERE used_at IS NULL;
