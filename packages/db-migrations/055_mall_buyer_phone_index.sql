CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer_phone
  ON marketplace_orders (buyer_phone, created_at DESC)
  WHERE channel = 'smebuze_mall';
