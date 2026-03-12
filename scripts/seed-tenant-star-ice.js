/**
 * Seed tenant for Star ICE (first client).
 * Matches their delivery challan and consolidated monthly invoice format.
 *
 * - Company: STAR ICE, Bandra address, GSTIN, bank details (Axis Bank)
 * - Items: Ice products per challan (10/KG ICE PORTABLE, TUBE ICE, BLOCK ICE, etc.) with HSN
 * - Customers: e.g. Izumi, JUNOBO HOTELS PVT LTD (SOHO HOUSE)
 * - Users: admin, sales, delivery, viewer (same roles as restaurant_wholesale flow)
 *
 * Run after migrations 001–021 and 004 (permissions).
 * Usage: DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-tenant-star-ice.js
 *
 * Login: tenant slug = star-ice; users: admin@starice.sb, sales@starice.sb, etc.; password = Password123
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';
const TENANT_NAME = 'Star ICE';
const TENANT_SLUG = 'star-ice';
const COMPANY_NAME = 'STAR ICE';

const STAR_ICE_ADDRESS = {
  line1: '41-1/1A, Reclamation, Gen. Arunkumar Marg, Bandra west',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400050',
};
const STAR_ICE_GSTIN = '27AGUP5591QIZG';
const STAR_ICE_EMAIL = 'staricebandra@gmail.com';
const STAR_ICE_PHONE = '98206 44756 / 99676 77266';
const STAR_ICE_BANK = {
  bank_name: 'Axis Bank',
  branch: 'Hill Road Bandra',
  account_no: '916020038348901',
  ifsc: 'UTIB0001621',
};

const tenantAdminPerms = [
  'org.company.create', 'org.company.view', 'org.company.update', 'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'accounting.coa.view', 'accounting.journal.create', 'accounting.journal.view', 'reports.view',
];
const salesManagerPerms = ['crm.lead.create', 'crm.lead.view', 'crm.lead.update', 'crm.customer.create', 'crm.customer.view', 'crm.customer.update', 'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view', 'sales.invoice.create', 'sales.invoice.view', 'reports.view'];
const staffPerms = ['crm.customer.view', 'sales.invoice.create', 'sales.invoice.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'];
const viewerPerms = ['org.company.view', 'org.branch.view', 'crm.customer.view', 'sales.order.view', 'sales.invoice.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view'];

const ICE_ITEMS = [
  { sku: 'ICE-10KG', name: '10/KG ICE PORTABLE', unit: 'kg', hsn_sac: '22019010' },
  { sku: 'ICE-TUBE-NP', name: 'TUBE ICE NON PORTABLE', unit: 'kg', hsn_sac: '22019010' },
  { sku: 'ICE-BLOCK', name: 'BLOCK ICE', unit: 'kg', hsn_sac: '22019010' },
  { sku: 'ICE-TUBE-MP', name: 'TUBE ICE MASTER PACK 1KG', unit: 'kg', hsn_sac: '28112110' },
  { sku: 'ICE-CLASSIC', name: 'CLASSIC SQUARE', unit: 'pcs', hsn_sac: '22019010' },
  { sku: 'ICE-HIGHBALL', name: 'HIGH BALL', unit: 'pcs', hsn_sac: '22019010' },
  { sku: 'ICE-CRYSTAL', name: 'CRYSTAL BALL', unit: 'pcs', hsn_sac: '22019010' },
  { sku: 'ICE-TRAY', name: 'TRAY ICE', unit: 'kg', hsn_sac: '22019010' },
  { sku: 'ICE-DRY', name: 'DRY ICE', unit: 'kg', hsn_sac: '28112110' },
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
      [PLATFORM_ORG_ID, 'SMEBUZE', 'smebuzz', '{}']
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
        `INSERT INTO companies (tenant_id, name, legal_name, gstin, address, bank_details, is_default)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, true)`,
        [
          tenantId,
          COMPANY_NAME,
          'STAR ICE - Authorised Dealer for ICELINGS The PUREfect Ice',
          STAR_ICE_GSTIN,
          JSON.stringify(STAR_ICE_ADDRESS),
          JSON.stringify(STAR_ICE_BANK),
        ]
      );
      companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 AND name = $2 LIMIT 1', [tenantId, COMPANY_NAME]);
    } else {
      await client.query(
        `UPDATE companies SET legal_name = $2, gstin = $3, address = $4::jsonb, bank_details = $5::jsonb WHERE tenant_id = $1 AND name = $6`,
        [tenantId, 'STAR ICE - Authorised Dealer for ICELINGS The PUREfect Ice', STAR_ICE_GSTIN, JSON.stringify(STAR_ICE_ADDRESS), JSON.stringify(STAR_ICE_BANK), COMPANY_NAME]
      );
    }
    const companyId = companyRes.rows[0].id;

    let branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    if (branchRes.rows.length === 0) {
      await client.query(
        `INSERT INTO branches (company_id, name, address, is_default) VALUES ($1, $2, $3::jsonb, true)`,
        [companyId, 'Bandra', JSON.stringify(STAR_ICE_ADDRESS)]
      );
      branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1', [companyId]);
    }
    const branchId = branchRes.rows[0]?.id ?? null;

    const roleSlugs = ['tenant_admin', 'sales_manager', 'staff', 'viewer'];
    const roleNames = ['Tenant Admin', 'Sales Manager', 'Staff', 'Viewer'];
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
      { email: 'admin@starice.sb', name: 'Admin', role: 'tenant_admin' },
      { email: 'sales@starice.sb', name: 'Sales / Order Entry', role: 'sales_manager' },
      { email: 'delivery@starice.sb', name: 'Delivery / Staff', role: 'staff' },
      { email: 'viewer@starice.sb', name: 'Viewer', role: 'viewer' },
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

      for (const it of ICE_ITEMS) {
        await client.query(
          `INSERT INTO items (tenant_id, company_id, sku, name, description, unit, category, hsn_sac, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [tenantId, companyId, it.sku, it.name, it.name, it.unit, 'Ice', it.hsn_sac]
        );
      }

      const customers = [
        { name: 'Izumi', phone: '+91 9876500101', address: { city: 'Mumbai', state: 'Maharashtra' } },
        { name: 'JUNOBO HOTELS PVT LTD (SOHO HOUSE)', phone: '+91 9876500102', gstin: '27AACCJ4959L1Z0', address: { line1: '301, LANDMARK BUILDING, JUHU TARA ROAD, SANTACRUZ WEST', city: 'Mumbai', state: 'Maharashtra', pincode: '400049' } },
      ];
      for (const c of customers) {
        await client.query(
          `INSERT INTO customers (tenant_id, company_id, name, phone, gstin, address, segment, is_active)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, true)`,
          [tenantId, companyId, c.name, c.phone, c.gstin || null, JSON.stringify(c.address || {}), c.gstin ? 'Hotel' : 'Restaurant']
        );
      }

      console.log('Star ICE: company (with bank details), 9 ice items, 2 customers seeded.');
    }

    console.log('');
    console.log('Star ICE tenant seed done.');
    console.log('Login with tenant slug: ' + TENANT_SLUG);
    console.log('Password for all users: ' + DEMO_PASSWORD);
    console.log('Users: admin@starice.sb, sales@starice.sb, delivery@starice.sb, viewer@starice.sb');
    console.log('');
    console.log('Use delivery challans with line items (qty, rate, amount) and signed image; then create consolidated monthly invoice from challans.');
  } finally {
    await client.end();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
