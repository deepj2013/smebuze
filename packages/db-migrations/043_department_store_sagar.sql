-- Department store: subcategories, pack-from-bulk, and Sagar General Store once.
-- Safe to re-run. The workspace insert runs only when the slug is missing.

ALTER TABLE item_categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES item_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_item_categories_parent ON item_categories (parent_id);

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'item_categories' AND con.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE item_categories DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_item_categories_parent_name
  ON item_categories (tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

ALTER TABLE items ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS variant_size VARCHAR(80);
ALTER TABLE items ADD COLUMN IF NOT EXISTS variant_shape VARCHAR(80);
ALTER TABLE items ADD COLUMN IF NOT EXISTS pack_source_id UUID REFERENCES items(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS pack_qty DECIMAL(18,4);

CREATE INDEX IF NOT EXISTS idx_items_pack_source ON items (pack_source_id) WHERE pack_source_id IS NOT NULL;

-- One-time workspace. Later deploys see the slug and leave it alone.
DO $$
DECLARE
  org_id uuid := 'a0000000-0000-0000-0000-000000000001';
  tid uuid;
  cid uuid;
  bid uuid;
  wid uuid;
  role_id uuid;
  uid uuid;
  grocery_id uuid;
  staples_id uuid;
  bulk_id uuid;
  pack_id uuid;
BEGIN
  INSERT INTO platform_org (id, name, slug, settings)
  VALUES (org_id, 'SMEBUZE', 'smebuzz', '{}')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO tid FROM tenants WHERE slug = 'sagar-general-store' LIMIT 1;
  IF tid IS NOT NULL THEN
    RETURN;
  END IF;

  INSERT INTO tenants (platform_org_id, name, slug, plan, features, settings, is_active)
  VALUES (
    org_id,
    'Sagar General Store',
    'sagar-general-store',
    'advanced',
    '["sales","inventory","crm","reports"]'::jsonb,
    jsonb_build_object(
      'business_type', 'department_store',
      'account_kind', 'real',
      'workspace_configured', true,
      'brand_name', 'Sagar General Store',
      'enabled_modules', jsonb_build_array('sales','inventory','crm','reports')
    ),
    true
  )
  RETURNING id INTO tid;

  INSERT INTO companies (tenant_id, name, legal_name, address, is_default)
  VALUES (
    tid,
    'Sagar General Store',
    'Sagar General Store',
    '{"line1":"","city":"","state":"Maharashtra","pincode":""}'::jsonb,
    true
  )
  RETURNING id INTO cid;

  INSERT INTO branches (company_id, name, address, is_default)
  VALUES (cid, 'Main counter', '{}'::jsonb, true)
  RETURNING id INTO bid;

  INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default)
  VALUES (tid, cid, bid, 'Shop floor', 'SAGAR-MAIN', true)
  RETURNING id INTO wid;

  INSERT INTO roles (tenant_id, name, slug, is_system)
  VALUES (tid, 'Store admin', 'tenant_admin', false)
  RETURNING id INTO role_id;

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT role_id, p.id
  FROM permissions p
  WHERE p.key = ANY (ARRAY[
    'org.company.create','org.company.view','org.company.update',
    'org.branch.create','org.branch.view','org.branch.update',
    'org.user.create','org.user.view','org.role.manage',
    'crm.customer.create','crm.customer.view','crm.customer.update',
    'sales.invoice.create','sales.invoice.view',
    'inventory.item.create','inventory.item.view','inventory.stock.view',
    'reports.view'
  ])
  ON CONFLICT DO NOTHING;

  INSERT INTO users (
    tenant_id, email, password_hash, name,
    default_company_id, default_branch_id,
    is_active, email_verified, onboarding_completed_at
  )
  VALUES (
    tid,
    'admin@sagargeneral.store',
    '$2b$10$DL3lG7EI.F/RawUZeu5epOshjDzCjDi0IvY9Pm3ODFKm9jC7.qs8C',
    'Sagar Admin',
    cid,
    bid,
    true,
    true,
    NOW()
  )
  RETURNING id INTO uid;

  INSERT INTO user_roles (user_id, role_id) VALUES (uid, role_id) ON CONFLICT DO NOTHING;

  INSERT INTO customers (tenant_id, company_id, name, phone, credit_limit, tags, segment, is_active)
  VALUES
    (tid, cid, 'Walk-in cash', NULL, 0, '["walk_in"]'::jsonb, 'cash', true),
    (tid, cid, 'Monthly credit', NULL, 50000, '["credit"]'::jsonb, 'credit', true);

  INSERT INTO item_categories (tenant_id, name, sort_order, parent_id)
  VALUES (tid, 'Grocery', 1, NULL)
  RETURNING id INTO grocery_id;

  INSERT INTO item_categories (tenant_id, name, sort_order, parent_id)
  VALUES (tid, 'Staples', 1, grocery_id)
  RETURNING id INTO staples_id;

  INSERT INTO items (
    tenant_id, company_id, sku, name, unit, category, subcategory,
    hsn_sac, cost_price, tax_rate, cgst_rate, sgst_rate,
    for_sale, for_consume, is_active, reorder_level
  )
  VALUES (
    tid, cid, 'RICE-BULK', 'Rice loose', 'kg', 'Grocery', 'Staples',
    '1006', 45, 0, 0, 0,
    false, true, true, 5
  )
  RETURNING id INTO bulk_id;

  INSERT INTO items (
    tenant_id, company_id, sku, barcode, name, unit, category, subcategory,
    variant_size, variant_shape, hsn_sac,
    mrp, cost_price, sale_price, discount_percent,
    tax_rate, cgst_rate, sgst_rate,
    for_sale, for_consume, is_active,
    pack_source_id, pack_qty, reorder_level
  )
  VALUES (
    tid, cid, 'RICE-50G', '8901234500501', 'Rice 50g', 'pcs', 'Grocery', 'Staples',
    '50g', 'pack', '1006',
    5, 2.25, 4.50, 10,
    5, 2.5, 2.5,
    true, false, true,
    bulk_id, 0.0500, 20
  )
  RETURNING id INTO pack_id;

  INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved)
  SELECT tid, wid, bulk_id, 50, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM stock WHERE warehouse_id = wid AND item_id = bulk_id AND batch_code IS NULL
  );
END $$;
