-- Contractor / invoice-lite: remarks on estimates and follow-ups tied to a quotation.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS internal_note text;

ALTER TABLE follow_ups
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES quotations (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_follow_ups_quotation ON follow_ups (quotation_id)
  WHERE quotation_id IS NOT NULL;
