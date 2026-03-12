-- Company bank details for invoice print (e.g. Star ICE consolidated bill)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT NULL;

COMMENT ON COLUMN companies.bank_details IS 'Optional: { "bank_name", "account_no", "ifsc", "branch" } for payment instructions on invoice';
