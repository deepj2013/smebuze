-- Safety net after 035–038: ensure additive columns exist with nullable / DEFAULT
-- so live tenants never fail SELECT/INSERT. No DROP. No data rewrite of business rows.

-- HR extras (no-op if already present)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_number VARCHAR(30);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS working_days_per_month INT NOT NULL DEFAULT 26;

ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80);
ALTER TABLE business_expenses ADD COLUMN IF NOT EXISTS payroll_line_id UUID;

-- Transport trip invoice link (nullable for unbilled trips / non-transport tenants)
DO $$
BEGIN
  IF to_regclass('public.transport_trips') IS NOT NULL THEN
    ALTER TABLE transport_trips ADD COLUMN IF NOT EXISTS invoice_id UUID;
  END IF;
END $$;

-- Platform referral columns (nullable for all existing tenants)
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code VARCHAR(40);

-- FK only if partners table exists and FK missing
DO $$
BEGIN
  IF to_regclass('public.platform_partners') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'tenants_referred_by_partner_id_fkey'
     ) THEN
    BEGIN
      ALTER TABLE tenants
        ADD CONSTRAINT tenants_referred_by_partner_id_fkey
        FOREIGN KEY (referred_by_partner_id) REFERENCES platform_partners(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
