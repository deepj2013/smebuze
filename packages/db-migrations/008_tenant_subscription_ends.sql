-- Tenant subscription end (for quick access check) and payment tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.subscription_ends_at IS 'End of current subscription period; NULL = no active subscription or use subscriptions table';
