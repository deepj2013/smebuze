-- Vendor as buyer (sales to vendor) + Payment paid (we pay vendor)

-- Sales invoice can be raised to a customer OR to a vendor (vendor as buyer)
ALTER TABLE sales_invoices
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id),
  ALTER COLUMN customer_id DROP NOT NULL;

-- Purchase order: track how much we have paid (payment paid)
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(18,2) DEFAULT 0;

-- Payments we make to vendors (payment paid)
CREATE TABLE IF NOT EXISTS vendor_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id         UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  amount            DECIMAL(18,2) NOT NULL,
  payment_date      DATE NOT NULL,
  mode              VARCHAR(50) DEFAULT 'cash',
  reference         VARCHAR(255),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_tenant ON vendor_payments(tenant_id);
