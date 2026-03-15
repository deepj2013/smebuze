-- Requirement tracking on sales_orders (who gave, channel, proof).
-- Fixes: column SalesOrder.requirement_given_by does not exist

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS requirement_given_by VARCHAR(255) NULL;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS requirement_channel VARCHAR(50) NULL;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS requirement_proof_ref VARCHAR(500) NULL;

-- MRP, discount %, GST treatment on sales_order_lines (requirement form / invoice).
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS mrp DECIMAL(18,4) NULL;
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) NULL;
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS gst_treatment VARCHAR(20) DEFAULT 'extra';

COMMENT ON COLUMN sales_orders.requirement_given_by IS 'Who gave the requirement (e.g. contact person name)';
COMMENT ON COLUMN sales_orders.requirement_channel IS 'How communicated: phone, whatsapp, email, in_person, other';
COMMENT ON COLUMN sales_orders.requirement_proof_ref IS 'Proof or reference (e.g. WhatsApp screenshot, call ref)';
COMMENT ON COLUMN sales_order_lines.mrp IS 'MRP at time of requirement';
COMMENT ON COLUMN sales_order_lines.discount_percent IS 'Discount % offered (from MRP vs rate)';
COMMENT ON COLUMN sales_order_lines.gst_treatment IS 'inclusive | extra for GST calculation';
