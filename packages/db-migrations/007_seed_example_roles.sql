-- Example roles for a tenant (Vendor as seller+buyer; payment paid + received).
-- Replace YOUR_TENANT_ID with your tenant UUID (from tenants.id after creating a tenant).

DO $$
DECLARE
  tid UUID := 'YOUR_TENANT_ID';
  r_tenant_admin UUID;
  r_sales_mgr UUID;
  r_purchase_mgr UUID;
  r_staff UUID;
  r_viewer UUID;
  pid UUID;
  perm_keys TEXT[] := ARRAY[
    'org.company.create','org.company.view','org.company.update',
    'org.branch.create','org.branch.view','org.branch.update',
    'org.user.create','org.user.view','org.role.manage',
    'crm.lead.create','crm.lead.view','crm.lead.update',
    'crm.customer.create','crm.customer.view','crm.customer.update',
    'sales.quotation.create','sales.quotation.view','sales.order.create','sales.order.view',
    'sales.invoice.create','sales.invoice.view',
    'purchase.vendor.create','purchase.vendor.view','purchase.order.create','purchase.order.view',
    'inventory.item.create','inventory.item.view','inventory.stock.view',
    'accounting.coa.view','accounting.journal.create','accounting.journal.view',
    'reports.view'
  ];
  k TEXT;
BEGIN
  IF tid = 'YOUR_TENANT_ID' THEN
    RAISE NOTICE 'Skipping 007: Replace YOUR_TENANT_ID in this file with your tenant UUID, then re-run.';
    RETURN;
  END IF;

  INSERT INTO roles (tenant_id, name, slug, is_system) VALUES
    (tid, 'Tenant Admin', 'tenant_admin', false),
    (tid, 'Sales Manager', 'sales_manager', false),
    (tid, 'Purchase Manager', 'purchase_manager', false),
    (tid, 'Staff', 'staff', false),
    (tid, 'Viewer', 'viewer', false)
  ON CONFLICT (tenant_id, slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO r_tenant_admin FROM roles WHERE tenant_id = tid AND slug = 'tenant_admin';
  SELECT id INTO r_sales_mgr FROM roles WHERE tenant_id = tid AND slug = 'sales_manager';
  SELECT id INTO r_purchase_mgr FROM roles WHERE tenant_id = tid AND slug = 'purchase_manager';
  SELECT id INTO r_staff FROM roles WHERE tenant_id = tid AND slug = 'staff';
  SELECT id INTO r_viewer FROM roles WHERE tenant_id = tid AND slug = 'viewer';

  -- Tenant Admin: all permissions in perm_keys
  FOREACH k IN ARRAY perm_keys LOOP
    SELECT id INTO pid FROM permissions WHERE key = k;
    IF pid IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r_tenant_admin, pid)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Sales Manager
  FOREACH k IN ARRAY ARRAY['crm.lead.create','crm.lead.view','crm.lead.update','crm.customer.create','crm.customer.view','crm.customer.update','sales.quotation.create','sales.quotation.view','sales.order.create','sales.order.view','sales.invoice.create','sales.invoice.view','reports.view'] LOOP
    SELECT id INTO pid FROM permissions WHERE key = k;
    IF pid IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r_sales_mgr, pid)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Purchase Manager
  FOREACH k IN ARRAY ARRAY['purchase.vendor.create','purchase.vendor.view','purchase.order.create','purchase.order.view','reports.view'] LOOP
    SELECT id INTO pid FROM permissions WHERE key = k;
    IF pid IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r_purchase_mgr, pid)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Staff
  FOREACH k IN ARRAY ARRAY['crm.customer.view','sales.invoice.create','sales.invoice.view','purchase.vendor.view','purchase.order.view','inventory.item.view','inventory.stock.view','reports.view'] LOOP
    SELECT id INTO pid FROM permissions WHERE key = k;
    IF pid IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r_staff, pid)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Viewer (all *.view)
  FOREACH k IN ARRAY ARRAY['org.company.view','org.branch.view','org.user.view','crm.lead.view','crm.customer.view','sales.quotation.view','sales.order.view','sales.invoice.view','purchase.vendor.view','purchase.order.view','inventory.item.view','inventory.stock.view','accounting.coa.view','accounting.journal.view','reports.view'] LOOP
    SELECT id INTO pid FROM permissions WHERE key = k;
    IF pid IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r_viewer, pid)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Example roles created for tenant %', tid;
END $$;
