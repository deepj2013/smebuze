/**
 * Seed tenant for "Restaurant / Wholesale" business type.
 *
 * Use case: One company receives stock (e.g. truck → warehouse), sells to restaurants and
 * retail buyers. Orders come via WhatsApp/call; requirements are registered as sales orders;
 * delivery is done with client approval (delivery challan); monthly consolidated invoice from
 * delivery challans. Per-customer pricing at delivery; signed challan image for proof.
 *
 * Run after migrations 001–020 and 004 (permissions).
 * Usage: DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-tenant-restaurant-wholesale.js
 *
 * Login: tenant slug = restaurant-wholesale. Users: admin@, sales@, delivery@, viewer@restaurant-wholesale.demo; password = Password123
 *
 * This tenant uses tenant.settings.business_type = 'restaurant_wholesale'. UI/API can gate
 * delivery challan lines (per-customer price), signed challan image upload, consolidated
 * invoice from challans, and daily reports (requirement vs delivery, stock vs sold,
 * invoice vs payment) so only this tenant sees those flows. No change to other tenants.
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';
const TENANT_NAME = 'Restaurant Wholesale Demo';
const TENANT_SLUG = 'restaurant-wholesale';
const COMPANY_NAME = 'Fresh Supplies Co';

const tenantAdminPerms = [
  'org.company.create', 'org.company.view', 'org.company.update', 'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'accounting.coa.view', 'accounting.journal.create', 'accounting.journal.view', 'reports.view',
];

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
        `INSERT INTO tenants (platform_org_id, name, slug, plan, features, settings)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb)`,
        [
          PLATFORM_ORG_ID,
          TENANT_NAME,
          TENANT_SLUG,
          'advanced',
          JSON.stringify(['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports']),
          JSON.stringify({ business_type: 'restaurant_wholesale' }),
        ]
      );
      tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1', [TENANT_SLUG]);
    } else {
      await client.query(
        `UPDATE tenants SET settings = $2::jsonb WHERE slug = $1`,
        [TENANT_SLUG, JSON.stringify({ business_type: 'restaurant_wholesale' })]
      );
    }
    const tenantId = tenantRow.rows[0].id;

    let companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, COMPANY_NAME]);
    if (companyRes.rows.length === 0) {
      await client.query(
        `INSERT INTO companies (tenant_id, name, is_default) VALUES ($1, $2, true)`,
        [tenantId, COMPANY_NAME]
      );
      companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, COMPANY_NAME]);
    }
    const companyId = companyRes.rows[0].id;

    let branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    if (branchRes.rows.length === 0) {
      await client.query(
        `INSERT INTO branches (company_id, name, is_default) VALUES ($1, $2, true)`,
        [companyId, 'Main']
      );
      branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1', [companyId]);
    }
    const branchId = branchRes.rows[0]?.id ?? null;

    const roleSlugs = ['tenant_admin', 'sales_manager', 'staff', 'viewer'];
    const roleNames = ['Tenant Admin', 'Sales Manager', 'Staff', 'Viewer'];
    const salesManagerPerms = ['crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update', 'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view', 'reports.view'];
    const staffPerms = ['crm.customer.view', 'sales.invoice.create', 'sales.invoice.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'];
    const viewerPerms = ['org.company.view', 'org.branch.view', 'crm.customer.view', 'sales.order.view', 'sales.invoice.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'];
    const rolePermKeys = [tenantAdminPerms, salesManagerPerms, staffPerms, viewerPerms];
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

    const tenantUsers = [
      { email: 'admin@restaurant-wholesale.demo', name: 'Admin', role: 'tenant_admin' },
      { email: 'sales@restaurant-wholesale.demo', name: 'Sales / Order Entry', role: 'sales_manager' },
      { email: 'delivery@restaurant-wholesale.demo', name: 'Delivery / Staff', role: 'staff' },
      { email: 'viewer@restaurant-wholesale.demo', name: 'Viewer', role: 'viewer' },
    ];
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
        await client.query(
          `UPDATE users SET password_hash = $2, name = $3, default_company_id = $4 WHERE tenant_id = $1 AND email = $5`,
          [tenantId, passwordHash, u.name, companyId, u.email]
        );
      }
      const userId = uRow.rows[0].id;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING', [userId, roleIds[u.role]]);
    }

    const existingItems = await client.query('SELECT 1 FROM items WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existingItems.rows.length === 0) {
      let whRes = await client.query(
        `INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default) VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [tenantId, companyId, branchId, 'Main Warehouse', 'WH-MAIN']
      );
      const warehouseId = whRes.rows[0].id;

      const items = [
        { sku: 'RW-RICE-01', name: 'Rice (Basmati)', unit: 'kg', category: 'Grains', hsn_sac: '10063010' },
        { sku: 'RW-FLOUR-01', name: 'Wheat Flour', unit: 'kg', category: 'Grains', hsn_sac: '11010010' },
        { sku: 'RW-OIL-01', name: 'Cooking Oil', unit: 'L', category: 'Oils', hsn_sac: '15079000' },
        { sku: 'RW-SUGAR-01', name: 'Sugar', unit: 'kg', category: 'Groceries', hsn_sac: '17019900' },
        { sku: 'RW-DAL-01', name: 'Toor Dal', unit: 'kg', category: 'Pulses', hsn_sac: '07132000' },
        { sku: 'RW-SPICE-01', name: 'Spices Mix', unit: 'kg', category: 'Spices', hsn_sac: '09109900' },
      ];
      const itemIds = [];
      for (const it of items) {
        const r = await client.query(
          `INSERT INTO items (tenant_id, company_id, sku, name, description, unit, category, hsn_sac, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
          [tenantId, companyId, it.sku, it.name, it.name, it.unit, it.category, it.hsn_sac]
        );
        itemIds.push(r.rows[0].id);
      }

      const quantities = [2000, 500, 200, 300, 150, 100];
      const batchCode = 'TRUCK-001';
      for (let i = 0; i < itemIds.length; i++) {
        const qty = quantities[i] ?? 100;
        try {
          await client.query(
            `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved, batch_code)
             VALUES ($1, $2, $3, $4, 0, $5)`,
            [tenantId, warehouseId, itemIds[i], qty, batchCode]
          );
        } catch (e) {
          if (!e.message?.includes('unique')) throw e;
        }
      }

      const restaurants = [
        { name: 'Spice Garden Restaurant', phone: '+91 9876500001', segment: 'Restaurant' },
        { name: 'Urban Bites Cafe', phone: '+91 9876500002', segment: 'Restaurant' },
        { name: 'Tandoori House', phone: '+91 9876500003', segment: 'Restaurant' },
        { name: 'Quick Bite Retail', phone: '+91 9876500004', segment: 'Retail' },
      ];
      for (const c of restaurants) {
        await client.query(
          `INSERT INTO customers (tenant_id, company_id, name, phone, segment, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [tenantId, companyId, c.name, c.phone, c.segment]
        );
      }

      console.log('Restaurant Wholesale tenant: items, warehouse, stock (e.g. truck receipt), and 4 customers seeded.');
    }

    console.log('');
    console.log('Restaurant Wholesale tenant seed done.');
    console.log('Login with tenant slug: ' + TENANT_SLUG);
    console.log('Password for all users: ' + DEMO_PASSWORD);
    console.log('Users:');
    console.log('  - admin@restaurant-wholesale.demo (Admin)');
    console.log('  - sales@restaurant-wholesale.demo (Sales / Order Entry)');
    console.log('  - delivery@restaurant-wholesale.demo (Delivery / Staff)');
    console.log('  - viewer@restaurant-wholesale.demo (Viewer)');
    console.log('');
    console.log('This tenant has settings.business_type = "restaurant_wholesale". Use it to show:');
    console.log('- Delivery challan lines with per-customer price, signed challan image upload');
    console.log('- Consolidated invoice from multiple delivery challans; daily reports (requirement vs delivery, stock vs sold, invoice vs payment).');
  } finally {
    await client.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
