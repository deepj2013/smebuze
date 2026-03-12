-- Sales order line items (for Requirement: customer, product, qty, rate)
CREATE TABLE IF NOT EXISTS sales_order_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id    UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_id           UUID REFERENCES items(id),
  description       VARCHAR(500),
  quantity          DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit              VARCHAR(20) DEFAULT 'pcs',
  rate              DECIMAL(18,4) NOT NULL DEFAULT 0,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_order_lines_order ON sales_order_lines(sales_order_id);
