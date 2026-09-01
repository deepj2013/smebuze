-- Company logo for branded Ice Crest invoices and quotations.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
