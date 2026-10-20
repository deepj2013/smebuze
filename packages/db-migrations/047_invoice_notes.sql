-- Counter fulfilment notes (home delivery address, pickup, etc.)
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS notes TEXT;
