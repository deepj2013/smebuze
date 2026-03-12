/**
 * Seed full demo data for "Ameera IT Corporate Services".
 * Run after migrations 001-006 and 004 (permissions).
 * Usage: DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-ameera-data.js
 *
 * Creates: tenant, company, branches, users (all roles), CRM leads/customers,
 * vendors, items, warehouses, stock, quotations, sales orders, sales invoices
 * (with lines and payments), purchase orders, vendor payments.
 * All tenant user password: Password123
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';
const TENANT_NAME = 'Ameera IT Corporate Services';
const TENANT_SLUG = 'ameera-it';
const COMPANY_NAME = 'Ameera IT Corporate Services';

const tenantAdminPerms = [
  'org.company.create', 'org.company.view', 'org.company.update', 'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'accounting.coa.view', 'accounting.journal.create', 'accounting.journal.view', 'reports.view'
];
const salesManagerPerms = ['crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update', 'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view', 'reports.view'];
const purchaseManagerPerms = ['purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view', 'reports.view'];
const staffPerms = ['crm.customer.view', 'sales.invoice.create', 'sales.invoice.view', 'purchase.vendor.view', 'purchase.order.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'];
const viewerPerms = ['org.company.view', 'org.branch.view', 'org.user.view', 'crm.lead.view', 'crm.customer.view', 'sales.quotation.view', 'sales.order.view', 'sales.invoice.view', 'purchase.vendor.view', 'purchase.order.view', 'inventory.item.view', 'inventory.stock.view', 'accounting.coa.view', 'accounting.journal.view', 'reports.view'];

function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function toDateStr(d) { return d.toISOString().slice(0, 10); }

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smebuzz',
  });
  await client.connect();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    await client.query(
      `INSERT INTO platform_org (id, name, slug, settings) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [PLATFORM_ORG_ID, 'SMEBUZZ', 'smebuzz', '{}']
    );

    let tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [TENANT_SLUG]);
    if (tenantRow.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (platform_org_id, name, slug, plan, features) VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
        [PLATFORM_ORG_ID, TENANT_NAME, TENANT_SLUG, 'advanced', JSON.stringify(['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'])]
      );
      tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1', [TENANT_SLUG]);
    }
    const tenantId = tenantRow.rows[0].id;

    let companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, COMPANY_NAME]);
    if (companyRes.rows.length === 0) {
      await client.query(
        `INSERT INTO companies (tenant_id, name, legal_name, gstin, address, is_default) VALUES ($1, $2, $3, $4, $5::jsonb, true)`,
        [tenantId, COMPANY_NAME, 'Ameera IT Corporate Services Pvt Ltd', '29AABCA1234M1ZM', JSON.stringify({ line1: 'Plot 45, Sector 18', city: 'Gurugram', state: 'Haryana', pincode: '122015' })]
      );
      companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, COMPANY_NAME]);
    }
    const companyId = companyRes.rows[0].id;

    let branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 AND name = $2 LIMIT 1', [companyId, 'Head Office']);
    if (branchRes.rows.length === 0) {
      await client.query(
        `INSERT INTO branches (company_id, name, address, is_default) VALUES ($1, $2, $3::jsonb, true)`,
        [companyId, 'Head Office', JSON.stringify({ line1: 'Plot 45, Sector 18', city: 'Gurugram', state: 'Haryana', pincode: '122015' })]
      );
      branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 AND name = $2 LIMIT 1', [companyId, 'Head Office']);
    }
    const branchId = branchRes.rows[0].id;

    const roleSlugs = ['tenant_admin', 'sales_manager', 'purchase_manager', 'staff', 'viewer'];
    const roleNames = ['Tenant Admin', 'Sales Manager', 'Purchase Manager', 'Staff', 'Viewer'];
    const rolePermKeys = [tenantAdminPerms, salesManagerPerms, purchaseManagerPerms, staffPerms, viewerPerms];
    const roleIds = {};

    for (let i = 0; i < roleSlugs.length; i++) {
      let r = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, roleSlugs[i]]);
      if (r.rows.length === 0) {
        await client.query(
          `INSERT INTO roles (tenant_id, name, slug, is_system) VALUES ($1, $2, $3, false)`,
          [tenantId, roleNames[i], roleSlugs[i]]
        );
        r = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, roleSlugs[i]]);
      }
      roleIds[roleSlugs[i]] = r.rows[0].id;
      const permIds = await client.query('SELECT id FROM permissions WHERE key = ANY($1::varchar[])', [rolePermKeys[i]]);
      for (const row of permIds.rows) {
        await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING', [roleIds[roleSlugs[i]], row.id]);
      }
    }

    let su = await client.query('SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL', ['superadmin@smebuzz.com']);
    if (su.rows.length === 0) {
      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, is_super_admin, is_active)
         VALUES (NULL, $1, $2, $3, true, true)`,
        ['superadmin@smebuzz.com', passwordHash, 'Super Admin']
      );
    } else {
      await client.query('UPDATE users SET password_hash = $1, name = $2 WHERE email = $3 AND tenant_id IS NULL', [passwordHash, 'Super Admin', 'superadmin@smebuzz.com']);
    }

    const tenantUsers = [
      { email: 'admin@ameera-it.com', name: 'Rahul Mehta', role: 'tenant_admin' },
      { email: 'sales@ameera-it.com', name: 'Priya Sharma', role: 'sales_manager' },
      { email: 'purchase@ameera-it.com', name: 'Vikram Singh', role: 'purchase_manager' },
      { email: 'staff@ameera-it.com', name: 'Anita Desai', role: 'staff' },
      { email: 'viewer@ameera-it.com', name: 'Kiran Rao', role: 'viewer' },
    ];
    const userIds = {};
    for (const u of tenantUsers) {
      let uRow = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email]);
      if (uRow.rows.length === 0) {
        await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, name, default_company_id, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [tenantId, u.email, passwordHash, u.name, companyId]
        );
        uRow = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email]);
      } else {
        await client.query('UPDATE users SET password_hash = $1, name = $2, default_company_id = $3 WHERE tenant_id = $4 AND email = $5', [passwordHash, u.name, companyId, tenantId, u.email]);
      }
      const uid = uRow.rows[0].id;
      userIds[u.role] = uid;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING', [uid, roleIds[u.role]]);
    }
    const salesManagerId = userIds.sales_manager;
    const purchaseManagerId = userIds.purchase_manager;
    const staffId = userIds.staff;

    const existingLeads = await client.query('SELECT 1 FROM leads WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existingLeads.rows.length > 0) {
      console.log('Business data already present for this tenant. Skipping leads, customers, invoices, etc.');
      console.log('Ameera IT Corporate Services seed (users/org) completed. Tenant slug:', TENANT_SLUG);
      return;
    }

    // ——— CRM Leads ———
    const leads = [
      { name: 'TechNova Solutions', email: 'contact@technova.in', phone: '+91 98765 43210', source: 'Website', stage: 'qualified', score: 85 },
      { name: 'Global Retail Corp', email: 'procurement@globalretail.com', phone: '+91 91234 56789', source: 'Referral', stage: 'proposal', score: 72 },
      { name: 'MedCare Hospitals', email: 'it@medcare.in', phone: '+91 99887 66554', source: 'LinkedIn', stage: 'contacted', score: 60 },
      { name: 'EduLearn Academy', email: 'admin@edulearn.co', phone: '+91 98765 11223', source: 'Website', stage: 'new', score: 40 },
      { name: 'FinServe Bank', email: 'vendor@finserve.in', phone: '+91 87654 32109', source: 'Cold Call', stage: 'won', score: 90 },
      { name: 'LogiTrack Logistics', email: 'ops@logitrack.in', phone: '+91 76543 21098', source: 'Referral', stage: 'contacted', score: 55 },
      { name: 'GreenEnergy Pvt Ltd', email: 'info@greenenergy.co', phone: '+91 65432 10987', source: 'Website', stage: 'qualified', score: 78 },
      { name: 'BuildRight Constructions', email: 'projects@buildright.in', phone: '+91 54321 09876', source: 'Exhibition', stage: 'lost', score: 35 },
      { name: 'FoodExpress Delivery', email: 'tech@foodexpress.in', phone: '+91 43210 98765', source: 'Website', stage: 'proposal', score: 68 },
      { name: 'PharmaPlus Ltd', email: 'it@pharmaplus.com', phone: '+91 32109 87654', source: 'Referral', stage: 'new', score: 45 },
    ];
    const leadIds = [];
    for (const l of leads) {
      const r = await client.query(
        `INSERT INTO leads (tenant_id, company_id, source, name, email, phone, stage, score, assigned_to, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb) RETURNING id`,
        [tenantId, companyId, l.source, l.name, l.email, l.phone, l.stage, l.score, salesManagerId]
      );
      leadIds.push(r.rows[0].id);
    }

    // ——— Customers ———
    const customers = [
      { name: 'TechNova Solutions', email: 'billing@technova.in', phone: '+91 98765 43210', gstin: '27AABCT1234L1Z5', segment: 'Enterprise', credit_limit: 500000 },
      { name: 'Global Retail Corp', email: 'accounts@globalretail.com', phone: '+91 91234 56789', gstin: '09AABCG5678K1Z2', segment: 'Enterprise', credit_limit: 1000000 },
      { name: 'MedCare Hospitals', email: 'finance@medcare.in', phone: '+91 99887 66554', gstin: '07AABCM9012P1Z3', segment: 'Mid-Market', credit_limit: 300000 },
      { name: 'EduLearn Academy', email: 'admin@edulearn.co', phone: '+91 98765 11223', gstin: null, segment: 'SMB', credit_limit: 100000 },
      { name: 'FinServe Bank', email: 'vendor@finserve.in', phone: '+91 87654 32109', gstin: '27AABCF3456N1Z4', segment: 'Enterprise', credit_limit: 2000000 },
      { name: 'LogiTrack Logistics', email: 'accounts@logitrack.in', phone: '+91 76543 21098', gstin: '33AABCL7890Q1Z6', segment: 'Mid-Market', credit_limit: 400000 },
      { name: 'GreenEnergy Pvt Ltd', email: 'finance@greenenergy.co', phone: '+91 65432 10987', gstin: '06AABCG1112R1Z7', segment: 'Mid-Market', credit_limit: 350000 },
      { name: 'FoodExpress Delivery', email: 'billing@foodexpress.in', phone: '+91 43210 98765', gstin: '07AABCF5678S1Z8', segment: 'SMB', credit_limit: 150000 },
      { name: 'PharmaPlus Ltd', email: 'accounts@pharmaplus.com', phone: '+91 32109 87654', gstin: '27AABCP9012T1Z9', segment: 'Enterprise', credit_limit: 600000 },
    ];
    const customerIds = [];
    for (const c of customers) {
      const addr = { line1: 'Business Address', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };
      const r = await client.query(
        `INSERT INTO customers (tenant_id, company_id, name, email, phone, gstin, address, credit_limit, segment, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, true) RETURNING id`,
        [tenantId, companyId, c.name, c.email, c.phone, c.gstin, JSON.stringify(addr), c.credit_limit, c.segment]
      );
      customerIds.push(r.rows[0].id);
    }

    // ——— Vendors ———
    const vendors = [
      { name: 'Dell India Pvt Ltd', email: 'enterprise@dell.com', phone: '1800 425 4026', gstin: '27AABCS1234D1Z1' },
      { name: 'Microsoft India', email: 'partner@microsoft.com', phone: '+91 80 4010 3000', gstin: '29AABCM5678M1Z2' },
      { name: 'Amazon Web Services', email: 'support@aws.amazon.com', phone: '+91 80 6143 9800', gstin: '29AABCA9012A1Z3' },
      { name: 'Cisco Systems India', email: 'sales@cisco.com', phone: '+91 80 4114 0000', gstin: '29AABCC3456C1Z4' },
      { name: 'HP India', email: 'b2b@hp.com', phone: '1800 425 4999', gstin: '27AABCH7890H1Z5' },
      { name: 'Lenovo India', email: 'enterprise@lenovo.com', phone: '+91 124 456 7000', gstin: '09AABCL1112L1Z6' },
      { name: 'Zoho Corporation', email: 'sales@zoho.com', phone: '+91 44 6100 4000', gstin: '33AABCZ5678Z1Z7' },
      { name: 'Tata Communications', email: 'enterprise@tatacommunications.com', phone: '1800 209 3535', gstin: '27AABCT9012T1Z8' },
    ];
    const vendorIds = [];
    for (const v of vendors) {
      const addr = { line1: 'Vendor Address', city: 'Bangalore', state: 'Karnataka', pincode: '560001' };
      const r = await client.query(
        `INSERT INTO vendors (tenant_id, company_id, name, email, phone, gstin, address, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true) RETURNING id`,
        [tenantId, companyId, v.name, v.email, v.phone, v.gstin, JSON.stringify(addr)]
      );
      vendorIds.push(r.rows[0].id);
    }

    // ——— Warehouses ———
    let whRes = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, 'Main Warehouse']);
    let warehouseId = whRes.rows[0]?.id;
    if (!warehouseId) {
      await client.query(
        'INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default) VALUES ($1, $2, $3, $4, $5, true)',
        [tenantId, companyId, branchId, 'Main Warehouse', 'WH-MAIN']
      );
      whRes = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 AND name = $2', [tenantId, 'Main Warehouse']);
      warehouseId = whRes.rows[0].id;
    }

    // ——— Items ———
    const items = [
      { sku: 'SRV-001', name: 'Server Management - Annual', description: 'Annual server monitoring and maintenance', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
      { sku: 'SRV-002', name: 'Cloud Migration Package', description: 'End-to-end cloud migration support', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
      { sku: 'SRV-003', name: 'Network Setup & Config', description: 'LAN/WAN setup and configuration', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
      { sku: 'LIC-MS365', name: 'Microsoft 365 Business Basic', description: 'Per user/month license', unit: 'pcs', category: 'Software', hsn_sac: '998332' },
      { sku: 'LIC-MS365-P', name: 'Microsoft 365 Business Premium', description: 'Per user/month license', unit: 'pcs', category: 'Software', hsn_sac: '998332' },
      { sku: 'HW-LAP-001', name: 'Laptop - Business Grade', description: 'Dell/HP business laptop', unit: 'pcs', category: 'Hardware', hsn_sac: '84713000' },
      { sku: 'HW-MON-001', name: 'LED Monitor 24 inch', description: 'Full HD monitor', unit: 'pcs', category: 'Hardware', hsn_sac: '85285200' },
      { sku: 'SRV-SEC', name: 'Security Audit', description: 'IT security assessment and report', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
      { sku: 'SRV-BKP', name: 'Backup & DR Setup', description: 'Backup and disaster recovery setup', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
      { sku: 'CON-SUP', name: 'Annual Support Contract', description: '12-month technical support', unit: 'pcs', category: 'Services', hsn_sac: '998314' },
    ];
    const itemIds = [];
    for (const it of items) {
      const barcode = it.barcode ?? null;
      const r = await client.query(
        `INSERT INTO items (tenant_id, company_id, sku, barcode, name, description, unit, category, hsn_sac, image_urls, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, true) RETURNING id`,
        [tenantId, companyId, it.sku, barcode, it.name, it.description, it.unit, it.category, it.hsn_sac]
      );
      itemIds.push(r.rows[0].id);
    }

    // Stock (one row per warehouse+item with batch_code to satisfy UNIQUE)
    for (let i = 0; i < Math.min(5, itemIds.length); i++) {
      try {
        await client.query(
          `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved, batch_code)
           VALUES ($1, $2, $3, $4, 0, $5)`,
          [tenantId, warehouseId, itemIds[i], 50 + i * 10, `BATCH-${String(i + 1).padStart(3, '0')}`]
        );
      } catch (e) {
        if (!e.message.includes('unique')) throw e;
      }
    }

    const baseDate = new Date('2025-01-15');

    // ——— Quotations ———
    const quotNumbers = ['QTN-2025-001', 'QTN-2025-002', 'QTN-2025-003', 'QTN-2025-004'];
    const quotIds = [];
    for (let i = 0; i < 4; i++) {
      const issueDate = addDays(baseDate, i * 14);
      const validUntil = addDays(issueDate, 30);
      const status = i === 0 ? 'accepted' : i === 1 ? 'sent' : 'draft';
      const total = 150000 + (i + 1) * 25000;
      const tax = Math.round(total * 0.18);
      const r = await client.query(
        `INSERT INTO quotations (tenant_id, company_id, branch_id, number, customer_id, issue_date, valid_until, status, total, tax_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [tenantId, companyId, branchId, quotNumbers[i], customerIds[i % customerIds.length], toDateStr(issueDate), toDateStr(validUntil), status, total, tax, salesManagerId]
      );
      quotIds.push(r.rows[0].id);
      await client.query(
        `INSERT INTO quotation_items (quotation_id, item_id, description, qty, unit, rate, amount, tax_rate, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 18, 0)`,
        [r.rows[0].id, itemIds[0], items[0].name, 1, 'pcs', total - tax, total - tax]
      );
    }

    // ——— Sales Orders ———
    const soNumbers = ['SO-2025-001', 'SO-2025-002', 'SO-2025-003', 'SO-2025-004', 'SO-2025-005', 'SO-2025-006'];
    const soIds = [];
    for (let i = 0; i < 6; i++) {
      const orderDate = addDays(baseDate, 20 + i * 10);
      const total = 120000 + (i + 1) * 20000;
      const tax = Math.round(total * 0.18);
      const custId = customerIds[i % customerIds.length];
      const quotId = i < 2 ? quotIds[i] : null;
      const r = await client.query(
        `INSERT INTO sales_orders (tenant_id, company_id, branch_id, number, customer_id, quotation_id, order_date, status, total, tax_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [tenantId, companyId, branchId, soNumbers[i], custId, quotId, toDateStr(orderDate), i < 4 ? 'confirmed' : 'draft', total, tax, salesManagerId]
      );
      soIds.push(r.rows[0].id);
    }

    // ——— Sales Invoices (with lines) ———
    const invNumbers = ['INV-2025-001', 'INV-2025-002', 'INV-2025-003', 'INV-2025-004', 'INV-2025-005', 'INV-2025-006', 'INV-2025-007', 'INV-2025-008'];
    const invIds = [];
    for (let i = 0; i < 8; i++) {
      const invDate = addDays(baseDate, 30 + i * 8);
      const dueDate = addDays(invDate, 30);
      const subtotal = 80000 + (i + 1) * 15000;
      const taxAmt = Math.round(subtotal * 0.18);
      const total = subtotal + taxAmt;
      const status = i < 5 ? 'posted' : i < 7 ? 'draft' : 'posted';
      const custId = customerIds[i % customerIds.length];
      const r = await client.query(
        `INSERT INTO sales_invoices (tenant_id, company_id, branch_id, number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, total, paid_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [tenantId, companyId, branchId, invNumbers[i], custId, toDateStr(invDate), toDateStr(dueDate), status, subtotal, taxAmt, total, i < 3 ? total : i === 3 ? Math.round(total * 0.5) : 0, staffId]
      );
      invIds.push(r.rows[0].id);
      const lineSub = subtotal;
      const cgstAmt = Math.round(taxAmt / 2);
      const sgstAmt = taxAmt - cgstAmt;
      await client.query(
        `INSERT INTO sales_invoice_lines (invoice_id, item_id, hsn_sac, description, qty, unit, rate, taxable_value, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, sort_order)
         VALUES ($1, $2, $3, $4, 1, 'pcs', $5, $6, 9, $7, 9, $8, 0, 0, 0)`,
        [r.rows[0].id, itemIds[i % itemIds.length], items[i % items.length].hsn_sac, items[i % items.length].name, lineSub, lineSub, cgstAmt, sgstAmt]
      );
    }

    // Invoice payments (for first 3 invoices — full; 4th partial already in paid_amount)
    for (let i = 0; i < 3; i++) {
      const invTotal = await client.query('SELECT total FROM sales_invoices WHERE id = $1', [invIds[i]]);
      const amt = parseFloat(invTotal.rows[0].total);
      await client.query(
        `INSERT INTO invoice_payments (invoice_id, amount, payment_date, mode, reference) VALUES ($1, $2, $3, $4, $5)`,
        [invIds[i], amt, toDateStr(addDays(baseDate, 35 + i * 5)), 'bank_transfer', `PAY-${invNumbers[i]}`]
      );
    }
    const inv4Total = await client.query('SELECT total, paid_amount FROM sales_invoices WHERE id = $1', [invIds[3]]);
    const paid4 = parseFloat(inv4Total.rows[0].paid_amount);
    if (paid4 > 0) {
      await client.query(
        `INSERT INTO invoice_payments (invoice_id, amount, payment_date, mode, reference) VALUES ($1, $2, $3, $4, $5)`,
        [invIds[3], paid4, toDateStr(addDays(baseDate, 65)), 'bank_transfer', `PAY-${invNumbers[3]}-PART`]
      );
    }

    // ——— Purchase Orders ———
    const poNumbers = ['PO-2025-001', 'PO-2025-002', 'PO-2025-003', 'PO-2025-004', 'PO-2025-005'];
    const poIds = [];
    for (let i = 0; i < 5; i++) {
      const orderDate = addDays(baseDate, 10 + i * 12);
      const total = 200000 + (i + 1) * 30000;
      const tax = Math.round(total * 0.18);
      const r = await client.query(
        `INSERT INTO purchase_orders (tenant_id, company_id, branch_id, number, vendor_id, order_date, status, total, tax_amount, paid_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [tenantId, companyId, branchId, poNumbers[i], vendorIds[i % vendorIds.length], toDateStr(orderDate), i < 4 ? 'received' : 'draft', total, tax, i < 2 ? total : i === 2 ? Math.round(total * 0.6) : 0, purchaseManagerId]
      );
      poIds.push(r.rows[0].id);
    }

    // Vendor payments
    for (let i = 0; i < 2; i++) {
      const poTotal = await client.query('SELECT total FROM purchase_orders WHERE id = $1', [poIds[i]]);
      await client.query(
        `INSERT INTO vendor_payments (tenant_id, vendor_id, purchase_order_id, amount, payment_date, mode, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, vendorIds[i], poIds[i], parseFloat(poTotal.rows[0].total), toDateStr(addDays(baseDate, 25 + i * 10)), 'bank_transfer', `VP-${poNumbers[i]}`]
      );
    }
    const po2Total = await client.query('SELECT total, paid_amount FROM purchase_orders WHERE id = $1', [poIds[2]]);
    const paidPo2 = parseFloat(po2Total.rows[0].paid_amount);
    if (paidPo2 > 0) {
      await client.query(
        `INSERT INTO vendor_payments (tenant_id, vendor_id, purchase_order_id, amount, payment_date, mode, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, vendorIds[2], poIds[2], paidPo2, toDateStr(addDays(baseDate, 50)), 'bank_transfer', `VP-${poNumbers[2]}-PART`]
      );
    }

    // ——— Chart of Accounts & Journal (for reports) ———
    const coaRows = [
      { code: '1000', name: 'Cash', type: 'asset' },
      { code: '1100', name: 'Bank - Current', type: 'asset' },
      { code: '1200', name: 'Accounts Receivable', type: 'asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability' },
      { code: '3000', name: 'Owner Equity', type: 'equity' },
      { code: '4000', name: 'Sales Revenue', type: 'income' },
      { code: '5000', name: 'Operating Expenses', type: 'expense' },
    ];
    const coaIds = [];
    for (const a of coaRows) {
      try {
        const cr = await client.query(
          `INSERT INTO chart_of_accounts (tenant_id, company_id, code, name, type, is_system) VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
          [tenantId, companyId, a.code, a.name, a.type]
        );
        coaIds.push(cr.rows[0].id);
      } catch (e) {
        if (!e.message.includes('unique')) throw e;
        const r = await client.query('SELECT id FROM chart_of_accounts WHERE tenant_id = $1 AND company_id = $2 AND code = $3', [tenantId, companyId, a.code]);
        if (r.rows[0]) coaIds.push(r.rows[0].id);
      }
    }
    if (coaIds.length >= 5) {
      try {
        const jeRes = await client.query(
          `INSERT INTO journal_entries (tenant_id, company_id, number, entry_date, reference, status, total_debit, total_credit, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8) RETURNING id`,
          [tenantId, companyId, 'JE-2025-001', toDateStr(baseDate), 'Opening balance', 'posted', 50000, staffId]
        );
        const jeId = jeRes.rows[0].id;
        await client.query(
          `INSERT INTO journal_entry_lines (journal_id, account_id, debit, credit, narration, sort_order) VALUES ($1, $2, 50000, 0, 'Cash opening', 0), ($1, $3, 0, 50000, 'Owner equity', 1)`,
          [jeId, coaIds[0], coaIds[4]]
        );
      } catch (e) {
        if (!e.message.includes('unique')) throw e;
      }
    }

    console.log('Ameera IT Corporate Services seed completed successfully.');
    console.log('Tenant slug for login:', TENANT_SLUG);
    console.log('Users: admin@ameera-it.com, sales@ameera-it.com, purchase@ameera-it.com, staff@ameera-it.com, viewer@ameera-it.com');
    console.log('Password for all:', DEMO_PASSWORD);
    console.log('Seeded: leads, customers, vendors, items, warehouses, quotations, sales orders, sales invoices (with lines & payments), purchase orders, vendor payments.');
  } finally {
    await client.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
