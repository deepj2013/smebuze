-- Seed platform org and permissions (idempotent)

INSERT INTO platform_org (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SMEBUZZ',
  'smebuzz',
  '{}'
)
ON CONFLICT (slug) DO NOTHING;

-- Permissions (MVP modules)
INSERT INTO permissions (id, key, module, description) VALUES
  (gen_random_uuid(), 'admin.tenant.create', 'admin', 'Create tenant'),
  (gen_random_uuid(), 'admin.tenant.view', 'admin', 'View tenants'),
  (gen_random_uuid(), 'admin.tenant.update', 'admin', 'Update tenant'),
  (gen_random_uuid(), 'org.company.create', 'organization', 'Create company'),
  (gen_random_uuid(), 'org.company.view', 'organization', 'View companies'),
  (gen_random_uuid(), 'org.company.update', 'organization', 'Update company'),
  (gen_random_uuid(), 'org.branch.create', 'organization', 'Create branch'),
  (gen_random_uuid(), 'org.branch.view', 'organization', 'View branches'),
  (gen_random_uuid(), 'org.branch.update', 'organization', 'Update branch'),
  (gen_random_uuid(), 'org.user.create', 'organization', 'Create user'),
  (gen_random_uuid(), 'org.user.view', 'organization', 'View users'),
  (gen_random_uuid(), 'org.role.manage', 'organization', 'Manage roles'),
  (gen_random_uuid(), 'crm.lead.create', 'crm', 'Create lead'),
  (gen_random_uuid(), 'crm.lead.view', 'crm', 'View leads'),
  (gen_random_uuid(), 'crm.lead.update', 'crm', 'Update lead'),
  (gen_random_uuid(), 'crm.customer.create', 'crm', 'Create customer'),
  (gen_random_uuid(), 'crm.customer.view', 'crm', 'View customers'),
  (gen_random_uuid(), 'crm.customer.update', 'crm', 'Update customer'),
  (gen_random_uuid(), 'sales.quotation.create', 'sales', 'Create quotation'),
  (gen_random_uuid(), 'sales.quotation.view', 'sales', 'View quotations'),
  (gen_random_uuid(), 'sales.order.create', 'sales', 'Create sales order'),
  (gen_random_uuid(), 'sales.order.view', 'sales', 'View sales orders'),
  (gen_random_uuid(), 'sales.invoice.create', 'sales', 'Create invoice'),
  (gen_random_uuid(), 'sales.invoice.view', 'sales', 'View invoices'),
  (gen_random_uuid(), 'purchase.vendor.create', 'purchase', 'Create vendor'),
  (gen_random_uuid(), 'purchase.vendor.view', 'purchase', 'View vendors'),
  (gen_random_uuid(), 'purchase.order.create', 'purchase', 'Create purchase order'),
  (gen_random_uuid(), 'purchase.order.view', 'purchase', 'View purchase orders'),
  (gen_random_uuid(), 'inventory.item.create', 'inventory', 'Create item'),
  (gen_random_uuid(), 'inventory.item.view', 'inventory', 'View items'),
  (gen_random_uuid(), 'inventory.stock.view', 'inventory', 'View stock'),
  (gen_random_uuid(), 'accounting.coa.view', 'accounting', 'View chart of accounts'),
  (gen_random_uuid(), 'accounting.journal.create', 'accounting', 'Create journal entry'),
  (gen_random_uuid(), 'accounting.journal.view', 'accounting', 'View journal entries'),
  (gen_random_uuid(), 'reports.view', 'reports', 'View reports')
ON CONFLICT (key) DO NOTHING;
