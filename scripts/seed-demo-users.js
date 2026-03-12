/**
 * Seed demo users and demo company data for local run.
 * Run after migrations 001-011 and 004 (permissions). Migration 011 adds items.barcode and items.image_urls.
 * Usage: DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-demo-users.js
 *
 * All tenant user password: Password123
 * Super Admin: no tenant slug when logging in.
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';

const tenantAdminPerms = [
  'org.company.create','org.company.view','org.company.update','org.branch.create','org.branch.view','org.branch.update',
  'org.user.create','org.user.view','org.role.manage',
  'crm.lead.create','crm.lead.view','crm.lead.update','crm.customer.create','crm.customer.view','crm.customer.update',
  'sales.quotation.create','sales.quotation.view','sales.order.create','sales.order.view','sales.invoice.create','sales.invoice.view',
  'purchase.vendor.create','purchase.vendor.view','purchase.order.create','purchase.order.view',
  'inventory.item.create','inventory.item.view','inventory.stock.view',
  'accounting.coa.view','accounting.journal.create','accounting.journal.view','reports.view'
];
const salesManagerPerms = ['crm.lead.create','crm.lead.view','crm.lead.update','crm.customer.create','crm.customer.view','crm.customer.update','sales.quotation.create','sales.quotation.view','sales.order.create','sales.order.view','sales.invoice.create','sales.invoice.view','reports.view'];
const purchaseManagerPerms = ['purchase.vendor.create','purchase.vendor.view','purchase.order.create','purchase.order.view','reports.view'];
const staffPerms = ['crm.customer.view','sales.invoice.create','sales.invoice.view','purchase.vendor.view','purchase.order.view','inventory.item.view','inventory.stock.view','reports.view'];
const viewerPerms = ['org.company.view','org.branch.view','org.user.view','crm.lead.view','crm.customer.view','sales.quotation.view','sales.order.view','sales.invoice.view','purchase.vendor.view','purchase.order.view','inventory.item.view','inventory.stock.view','accounting.coa.view','accounting.journal.view','reports.view'];

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
    const poExists = await client.query('SELECT 1 FROM platform_org WHERE slug = $1', ['smebuzz']);
    if (poExists.rows.length === 0) {
      await client.query(
        'INSERT INTO platform_org (id, name, slug, settings) VALUES ($1, $2, $3, $4)',
        [PLATFORM_ORG_ID, 'SMEBUZZ', 'smebuzz', '{}']);
    }

    let tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', ['demo']);
    if (tenantRow.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (platform_org_id, name, slug, plan, features) VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
        [PLATFORM_ORG_ID, 'Demo Tenant', 'demo', 'advanced', JSON.stringify(['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'])]
      );
      tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1', ['demo']);
    }
    const tenantId = tenantRow.rows[0].id;

    await client.query(
      `INSERT INTO companies (tenant_id, name, is_default) SELECT $1::uuid, $2::varchar(255), true WHERE NOT EXISTS (SELECT 1 FROM companies WHERE tenant_id = $1::uuid AND name = $2::varchar(255))`,
      [tenantId, 'Demo Company']);
    const companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const companyId = companyRes.rows[0]?.id;

    let branchId = null;
    let branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    if (branchRes.rows.length === 0) {
      await client.query('INSERT INTO branches (company_id, name, is_default) VALUES ($1, $2, true)', [companyId, 'Main']);
      branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1', [companyId]);
    }
    if (branchRes.rows[0]) branchId = branchRes.rows[0].id;

    const roleSlugs = ['tenant_admin','sales_manager','purchase_manager','staff','viewer'];
    const roleNames = ['Tenant Admin','Sales Manager','Purchase Manager','Staff','Viewer'];
    const rolePermKeys = [tenantAdminPerms, salesManagerPerms, purchaseManagerPerms, staffPerms, viewerPerms];
    const roleIds = {};

    for (let i = 0; i < roleSlugs.length; i++) {
      const existing = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, roleSlugs[i]]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO roles (tenant_id, name, slug, is_system) VALUES ($1, $2, $3, false)`,
          [tenantId, roleNames[i], roleSlugs[i]]);
      } else {
        await client.query(
          `UPDATE roles SET name = $2 WHERE tenant_id = $1 AND slug = $3`,
          [tenantId, roleNames[i], roleSlugs[i]]);
      }
      const r = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, roleSlugs[i]]);
      roleIds[roleSlugs[i]] = r.rows[0].id;
      const permIds = await client.query('SELECT id FROM permissions WHERE key = ANY($1::varchar[])', [rolePermKeys[i]]);
      for (const row of permIds.rows) {
        const rpExists = await client.query('SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleIds[roleSlugs[i]], row.id]);
        if (rpExists.rows.length === 0) {
          await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleIds[roleSlugs[i]], row.id]);
        }
      }
    }

    const suExists = await client.query('SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL', ['superadmin@smebuzz.com']);
    if (suExists.rows.length === 0) {
      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, is_super_admin, is_active)
         VALUES (NULL, $1, $2, $3, true, true)`,
        ['superadmin@smebuzz.com', passwordHash, 'Super Admin']);
    } else {
      await client.query(
        `UPDATE users SET password_hash = $2, name = $3 WHERE email = $1 AND tenant_id IS NULL`,
        ['superadmin@smebuzz.com', passwordHash, 'Super Admin']);
    }
    const suId = (await client.query('SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL', ['superadmin@smebuzz.com'])).rows[0].id;

    const tenantUsers = [
      { email: 'admin@demo.com', name: 'Tenant Admin', role: 'tenant_admin' },
      { email: 'sales@demo.com', name: 'Sales Manager', role: 'sales_manager' },
      { email: 'purchase@demo.com', name: 'Purchase Manager', role: 'purchase_manager' },
      { email: 'staff@demo.com', name: 'Staff', role: 'staff' },
      { email: 'viewer@demo.com', name: 'Viewer', role: 'viewer' },
    ];
    for (const u of tenantUsers) {
      const uExists = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email]);
      if (uExists.rows.length === 0) {
        await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, name, default_company_id, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [tenantId, u.email, passwordHash, u.name, companyId]);
      } else {
        await client.query(
          `UPDATE users SET password_hash = $2, name = $3, default_company_id = $4 WHERE tenant_id = $1 AND email = $5`,
          [tenantId, passwordHash, u.name, companyId, u.email]);
      }
      const uid = (await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email])).rows[0].id;
      const urExists = await client.query('SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2', [uid, roleIds[u.role]]);
      if (urExists.rows.length === 0) {
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [uid, roleIds[u.role]]);
      }
    }

    const existingItems = await client.query('SELECT 1 FROM items WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existingItems.rows.length === 0) {
      const warehouseRes = await client.query(
        `INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default) VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [tenantId, companyId, branchId, 'Main Warehouse', 'WH-MAIN']
      );
      const warehouseId = warehouseRes.rows[0]?.id;

      const demoItems = [
        { sku: 'ITM-00001', barcode: '8901234567890', name: 'Office Chair Executive', category: 'Furniture', unit: 'pcs', hsn_sac: '94017900' },
        { sku: 'ITM-00002', barcode: '8901234567891', name: 'Desk Lamp LED', category: 'Electronics', unit: 'pcs', hsn_sac: '94052000' },
        { sku: 'ITM-00003', barcode: '8901234567892', name: 'A4 Paper Ream (500 sheets)', category: 'Stationery', unit: 'ream', hsn_sac: '48025690' },
        { sku: 'ITM-00004', barcode: '8901234567893', name: 'Stapler Heavy Duty', category: 'Stationery', unit: 'pcs', hsn_sac: '83052000' },
        { sku: 'ITM-00005', barcode: '8901234567894', name: 'Laptop Stand Aluminum', category: 'Electronics', unit: 'pcs', hsn_sac: '84733010' },
        { sku: 'ITM-00006', barcode: '8901234567895', name: 'Wireless Mouse', category: 'Electronics', unit: 'pcs', hsn_sac: '84716060' },
        { sku: 'ITM-00007', barcode: '8901234567896', name: 'USB-C Hub 7-in-1', category: 'Electronics', unit: 'pcs', hsn_sac: '84733029' },
        { sku: 'ITM-00008', barcode: '8901234567897', name: 'Whiteboard 3x2 ft', category: 'Office Supplies', unit: 'pcs', hsn_sac: '96100000' },
        { sku: 'ITM-00009', barcode: '8901234567898', name: 'Printer Cartridge Black', category: 'Consumables', unit: 'pcs', hsn_sac: '84433290' },
        { sku: 'ITM-00010', barcode: '8901234567899', name: 'Filing Cabinet 2-Drawer', category: 'Furniture', unit: 'pcs', hsn_sac: '94031000' },
        { sku: 'ITM-00011', barcode: '8901234567800', name: 'Notebook Set (5 pcs)', category: 'Stationery', unit: 'set', hsn_sac: '48201000' },
        { sku: 'ITM-00012', barcode: '8901234567801', name: 'Screen Cleaner Kit', category: 'Electronics', unit: 'kit', hsn_sac: '33049900' },
        { sku: 'ITM-00013', barcode: '8901234567802', name: 'Meeting Table 6-seater', category: 'Furniture', unit: 'pcs', hsn_sac: '94033000' },
        { sku: 'ITM-00014', barcode: '8901234567803', name: 'Keyboard Mechanical', category: 'Electronics', unit: 'pcs', hsn_sac: '84716060' },
        { sku: 'ITM-00015', barcode: '8901234567804', name: 'Pens Blue (Box of 50)', category: 'Stationery', unit: 'box', hsn_sac: '96091000' },
        { sku: 'ITM-00016', barcode: '8901234567805', name: 'Toner Cartridge Colour', category: 'Consumables', unit: 'pcs', hsn_sac: '84433290' },
        { sku: 'ITM-00017', barcode: '8901234567806', name: 'Bookshelf 4-tier', category: 'Furniture', unit: 'pcs', hsn_sac: '94036000' },
        { sku: 'ITM-00018', barcode: '8901234567807', name: 'HDMI Cable 2m', category: 'Electronics', unit: 'pcs', hsn_sac: '85444290' },
      ];
      for (const it of demoItems) {
        await client.query(
          `INSERT INTO items (tenant_id, company_id, sku, barcode, name, category, unit, hsn_sac, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [tenantId, companyId, it.sku, it.barcode, it.name, it.category, it.unit, it.hsn_sac]
        );
      }
      const itemIds = (await client.query('SELECT id FROM items WHERE tenant_id = $1 ORDER BY sku LIMIT 5', [tenantId])).rows.map((r) => r.id);
      if (warehouseId && itemIds.length) {
        for (let i = 0; i < itemIds.length; i++) {
          try {
            await client.query(
              `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved, batch_code) VALUES ($1, $2, $3, $4, 0, $5)`,
              [tenantId, warehouseId, itemIds[i], 25 + i * 10, `BATCH-${String(i + 1).padStart(3, '0')}`]
            );
          } catch (e) { if (!e.message?.includes('unique')) throw e; }
        }
      }
      console.log('Demo items and stock seeded.');
    }

    const existingLeads = await client.query('SELECT 1 FROM leads WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existingLeads.rows.length === 0) {
      const demoLeads = [
        { name: 'Acme Corp', email: 'buy@acme.example.com', phone: '+91 9876543210', source: 'Website', stage: 'qualified' },
        { name: 'Beta Industries', email: 'contact@beta.example.com', phone: '+91 9876543211', source: 'Referral', stage: 'contacted' },
        { name: 'Gamma Services', email: 'info@gamma.example.com', phone: '+91 9876543212', source: 'LinkedIn', stage: 'new' },
      ];
      for (const l of demoLeads) {
        await client.query(
          `INSERT INTO leads (tenant_id, company_id, name, email, phone, source, stage) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tenantId, companyId, l.name, l.email, l.phone, l.source, l.stage]
        );
      }
      const demoCustomers = [
        { name: 'Delta Trading', email: 'accounts@delta.example.com', phone: '+91 9876543220', segment: 'Enterprise' },
        { name: 'Epsilon Retail', email: 'billing@epsilon.example.com', phone: '+91 9876543221', segment: 'SMB' },
      ];
      for (const c of demoCustomers) {
        await client.query(
          `INSERT INTO customers (tenant_id, company_id, name, email, phone, segment, is_active) VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [tenantId, companyId, c.name, c.email, c.phone, c.segment]
        );
      }
      const demoVendors = [
        { name: 'Office Supplies Ltd', email: 'sales@officesupplies.example.com', phone: '+91 9876543230' },
        { name: 'Tech Gear Inc', email: 'orders@techgear.example.com', phone: '+91 9876543231' },
      ];
      for (const v of demoVendors) {
        await client.query(
          `INSERT INTO vendors (tenant_id, company_id, name, email, phone, is_active) VALUES ($1, $2, $3, $4, $5, true)`,
          [tenantId, companyId, v.name, v.email, v.phone]
        );
      }
      console.log('Demo CRM and vendor data seeded.');
    }

    console.log('Demo users seeded successfully.');
    console.log('Super Admin: superadmin@smebuzz.com (login WITHOUT tenant slug)');
    console.log('Tenant users (login WITH tenant slug: demo): admin@demo.com, sales@demo.com, purchase@demo.com, staff@demo.com, viewer@demo.com');
    console.log('Password for all: ' + DEMO_PASSWORD);
  } finally {
    await client.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
