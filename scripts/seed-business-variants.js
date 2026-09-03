/**
 * Seed every SMEBUZE business-type variant for local checking:
 * restaurant POS, sweet shop, garment, kirana, department store, trading (demo), services.
 * Idempotent. Password for all: Password123
 *
 * Usage (from repo root, after migrate + seed:demo):
 *   npm run seed:variants
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';

function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    if (process.env[key]) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[key] = v;
  }
}
loadEnv();

const ADMIN_PERMS = [
  'org.company.create', 'org.company.view', 'org.company.update',
  'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update',
  'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view',
  'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'accounting.coa.view', 'accounting.journal.create', 'accounting.journal.view', 'reports.view',
];

const FEATURES = JSON.stringify(['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports']);

const THEMES = {
  dine_restaurant: { primary: '#c2410c', accent: '#9a3412' },
  sweet_shop: { primary: '#db2777', accent: '#be185d' },
  garment_shop: { primary: '#7c3aed', accent: '#6d28d9' },
  retail_shop: { primary: '#15803d', accent: '#166534' },
  department_store: { primary: '#0f766e', accent: '#115e59' },
  trading: { primary: '#0284c7', accent: '#0369a1' },
  services: { primary: '#4f46e5', accent: '#3730a3' },
};

/** @type {{ sku: string, barcode?: string, name: string, category: string, unit: string, hsn_sac: string, mrp: number, cost: number, sale: number, tax: number, qty: number, reorder: number }[]} */
function restaurantItems() {
  return [
    { sku: 'RST-001', name: 'Butter Chicken', category: 'Mains', unit: 'plate', hsn_sac: '996331', mrp: 280, cost: 140, sale: 280, tax: 5, qty: 0, reorder: 0 },
    { sku: 'RST-002', name: 'Dal Makhani', category: 'Mains', unit: 'plate', hsn_sac: '996331', mrp: 180, cost: 70, sale: 180, tax: 5, qty: 0, reorder: 0 },
    { sku: 'RST-003', name: 'Paneer Tikka', category: 'Starters', unit: 'plate', hsn_sac: '996331', mrp: 220, cost: 90, sale: 220, tax: 5, qty: 0, reorder: 0 },
    { sku: 'RST-004', name: 'Butter Naan', category: 'Breads', unit: 'pcs', hsn_sac: '996331', mrp: 45, cost: 12, sale: 45, tax: 5, qty: 0, reorder: 0 },
    { sku: 'RST-005', name: 'Filter Coffee', category: 'Beverages', unit: 'cup', hsn_sac: '996331', mrp: 40, cost: 10, sale: 40, tax: 5, qty: 0, reorder: 0 },
    { sku: 'RST-006', barcode: '8901764012345', name: 'Coke Can 300ml', category: 'Beverages', unit: 'can', hsn_sac: '22021010', mrp: 40, cost: 22, sale: 40, tax: 28, qty: 48, reorder: 12 },
    { sku: 'RST-007', name: 'Gulab Jamun (2 pcs)', category: 'Dessert', unit: 'plate', hsn_sac: '996331', mrp: 80, cost: 25, sale: 80, tax: 5, qty: 0, reorder: 0 },
  ];
}

function sweetItems() {
  return [
    { sku: 'SWT-001', barcode: '8903010001001', name: 'Kaju Katli 250g', category: 'Mithai', unit: 'box', hsn_sac: '21069099', mrp: 450, cost: 280, sale: 450, tax: 5, qty: 40, reorder: 8 },
    { sku: 'SWT-002', barcode: '8903010001002', name: 'Gulab Jamun 1kg', category: 'Mithai', unit: 'kg', hsn_sac: '21069099', mrp: 320, cost: 160, sale: 320, tax: 5, qty: 25, reorder: 5 },
    { sku: 'SWT-003', barcode: '8903010001003', name: 'Rasgulla Tin', category: 'Mithai', unit: 'tin', hsn_sac: '21069099', mrp: 280, cost: 140, sale: 280, tax: 5, qty: 18, reorder: 4 },
    { sku: 'SWT-004', barcode: '8903010001004', name: 'Namkeen Mix 400g', category: 'Namkeen', unit: 'pkt', hsn_sac: '21069099', mrp: 180, cost: 90, sale: 180, tax: 12, qty: 30, reorder: 6 },
    { sku: 'SWT-005', barcode: '8903010001005', name: 'Motichoor Ladoo 500g', category: 'Mithai', unit: 'box', hsn_sac: '21069099', mrp: 400, cost: 220, sale: 400, tax: 5, qty: 20, reorder: 4 },
    { sku: 'SWT-006', barcode: '8903010001006', name: 'Dry Fruit Box', category: 'Gift boxes', unit: 'box', hsn_sac: '0802', mrp: 899, cost: 520, sale: 849, tax: 5, qty: 12, reorder: 3 },
  ];
}

function garmentItems() {
  return [
    { sku: 'GRM-SH40', barcode: '8904010002001', name: "Men's Formal Shirt 40", category: 'Menswear', unit: 'pcs', hsn_sac: '6205', mrp: 1299, cost: 520, sale: 999, tax: 5, qty: 16, reorder: 4 },
    { sku: 'GRM-JN32', barcode: '8904010002002', name: 'Slim Jeans 32', category: 'Menswear', unit: 'pcs', hsn_sac: '6203', mrp: 1899, cost: 780, sale: 1499, tax: 5, qty: 12, reorder: 3 },
    { sku: 'GRM-SR01', barcode: '8904010002003', name: 'Cotton Saree', category: 'Womenswear', unit: 'pcs', hsn_sac: '5007', mrp: 2499, cost: 1100, sale: 2199, tax: 5, qty: 10, reorder: 2 },
    { sku: 'GRM-KT-M', barcode: '8904010002004', name: 'Kurti M', category: 'Womenswear', unit: 'pcs', hsn_sac: '6211', mrp: 899, cost: 360, sale: 799, tax: 5, qty: 18, reorder: 4 },
    { sku: 'GRM-DP01', barcode: '8904010002005', name: 'Dupatta', category: 'Accessories', unit: 'pcs', hsn_sac: '6214', mrp: 399, cost: 140, sale: 349, tax: 5, qty: 22, reorder: 5 },
    { sku: 'GRM-TS-L', barcode: '8904010002006', name: 'Cotton T-Shirt L', category: 'Menswear', unit: 'pcs', hsn_sac: '6109', mrp: 599, cost: 220, sale: 499, tax: 5, qty: 24, reorder: 6 },
  ];
}

function kiranaItems() {
  return [
    { sku: 'KIR-001', barcode: '8901030865990', name: 'Fortune Sunflower Oil 1L', category: 'Grocery', unit: 'ltr', hsn_sac: '1512', mrp: 145, cost: 118, sale: 142, tax: 5, qty: 40, reorder: 10 },
    { sku: 'KIR-002', barcode: '8901725004019', name: 'Aashirvaad Atta 5kg', category: 'Grocery', unit: 'pkt', hsn_sac: '1101', mrp: 285, cost: 240, sale: 275, tax: 5, qty: 20, reorder: 5 },
    { sku: 'KIR-003', barcode: '8901088000013', name: 'Tata Salt 1kg', category: 'Grocery', unit: 'pkt', hsn_sac: '2501', mrp: 28, cost: 18, sale: 26, tax: 5, qty: 60, reorder: 15 },
    { sku: 'KIR-004', barcode: '8901058890123', name: 'Maggi 70g', category: 'Packaged', unit: 'pkt', hsn_sac: '1902', mrp: 14, cost: 10, sale: 14, tax: 18, qty: 80, reorder: 20 },
    { sku: 'KIR-005', barcode: '8901030650015', name: 'Surf Excel 1kg', category: 'Household', unit: 'pkt', hsn_sac: '3402', mrp: 210, cost: 165, sale: 199, tax: 18, qty: 18, reorder: 4 },
    { sku: 'KIR-006', barcode: '8901030861111', name: 'Parle-G 800g', category: 'Packaged', unit: 'pkt', hsn_sac: '1905', mrp: 80, cost: 58, sale: 78, tax: 12, qty: 36, reorder: 8 },
  ];
}

function deptItems() {
  return [
    { sku: 'DEP-G01', barcode: '8901030865990', name: 'Fortune Sunflower Oil 1L', category: 'Grocery', unit: 'ltr', hsn_sac: '1512', mrp: 145, cost: 118, sale: 142, tax: 5, qty: 80, reorder: 20 },
    { sku: 'DEP-G02', barcode: '8901725004019', name: 'Aashirvaad Atta 5kg', category: 'Grocery', unit: 'pkt', hsn_sac: '1101', mrp: 285, cost: 240, sale: 275, tax: 5, qty: 45, reorder: 10 },
    { sku: 'DEP-G03', barcode: '8901088000013', name: 'Tata Salt 1kg', category: 'Grocery', unit: 'pkt', hsn_sac: '2501', mrp: 28, cost: 18, sale: 26, tax: 5, qty: 120, reorder: 24 },
    { sku: 'DEP-G04', barcode: '8901030865123', name: 'Toor Dal 1kg', category: 'Grocery', unit: 'pkt', hsn_sac: '0713', mrp: 165, cost: 128, sale: 159, tax: 5, qty: 50, reorder: 12 },
    { sku: 'DEP-H01', barcode: '8901030650015', name: 'Surf Excel 1kg', category: 'Household', unit: 'pkt', hsn_sac: '3402', mrp: 210, cost: 165, sale: 199, tax: 18, qty: 36, reorder: 8 },
    { sku: 'DEP-H02', barcode: '8901314001234', name: 'Harpic 500ml', category: 'Household', unit: 'btl', hsn_sac: '3402', mrp: 99, cost: 68, sale: 95, tax: 18, qty: 28, reorder: 6 },
    { sku: 'DEP-H03', barcode: '8901030700123', name: 'Vim Bar', category: 'Household', unit: 'pcs', hsn_sac: '3401', mrp: 12, cost: 7, sale: 12, tax: 18, qty: 90, reorder: 20 },
    { sku: 'DEP-P01', barcode: '8901314123456', name: 'Colgate 200g', category: 'Personal Care', unit: 'pcs', hsn_sac: '3306', mrp: 95, cost: 62, sale: 89, tax: 18, qty: 40, reorder: 10 },
    { sku: 'DEP-P02', barcode: '8901030789012', name: 'Dove Soap', category: 'Personal Care', unit: 'pcs', hsn_sac: '3401', mrp: 55, cost: 32, sale: 52, tax: 18, qty: 48, reorder: 12 },
    { sku: 'DEP-P03', barcode: '8901030867777', name: 'Clinic Plus 180ml', category: 'Personal Care', unit: 'btl', hsn_sac: '3305', mrp: 120, cost: 78, sale: 115, tax: 18, qty: 22, reorder: 6 },
    { sku: 'DEP-B01', barcode: '8901764012345', name: 'Coca-Cola 750ml', category: 'Beverages', unit: 'btl', hsn_sac: '2202', mrp: 40, cost: 28, sale: 40, tax: 28, qty: 72, reorder: 18 },
    { sku: 'DEP-B02', barcode: '8901499100100', name: 'Real Juice 1L', category: 'Beverages', unit: 'pkt', hsn_sac: '2009', mrp: 110, cost: 78, sale: 105, tax: 12, qty: 30, reorder: 8 },
    { sku: 'DEP-B03', barcode: '8906006450019', name: 'Bisleri 1L', category: 'Beverages', unit: 'btl', hsn_sac: '2201', mrp: 20, cost: 10, sale: 20, tax: 18, qty: 100, reorder: 24 },
    { sku: 'DEP-S01', barcode: '8901491502012', name: 'Lays Classic', category: 'Snacks', unit: 'pkt', hsn_sac: '1905', mrp: 20, cost: 12, sale: 20, tax: 12, qty: 60, reorder: 15 },
    { sku: 'DEP-S02', barcode: '8901030861111', name: 'Parle-G 800g', category: 'Snacks', unit: 'pkt', hsn_sac: '1905', mrp: 80, cost: 58, sale: 78, tax: 12, qty: 40, reorder: 8 },
    { sku: 'DEP-S03', barcode: '8901058890123', name: 'Maggi 70g', category: 'Snacks', unit: 'pkt', hsn_sac: '1902', mrp: 14, cost: 10, sale: 14, tax: 18, qty: 90, reorder: 20 },
    { sku: 'DEP-E01', barcode: '5000394058693', name: 'Duracell AA 4pc', category: 'Electronics', unit: 'pkt', hsn_sac: '8506', mrp: 149, cost: 95, sale: 139, tax: 18, qty: 24, reorder: 6 },
    { sku: 'DEP-A01', barcode: '8902000001001', name: 'Cotton T-Shirt M', category: 'Apparel', unit: 'pcs', hsn_sac: '6109', mrp: 499, cost: 180, sale: 449, tax: 5, qty: 20, reorder: 4 },
    { sku: 'DEP-A02', barcode: '8902000001002', name: 'Socks Pack', category: 'Apparel', unit: 'pkt', hsn_sac: '6115', mrp: 149, cost: 55, sale: 129, tax: 5, qty: 30, reorder: 6 },
    { sku: 'DEP-M01', barcode: '8902000002001', name: 'Bedsheet Queen', category: 'Home', unit: 'pcs', hsn_sac: '6304', mrp: 899, cost: 380, sale: 799, tax: 12, qty: 14, reorder: 3 },
    { sku: 'DEP-M02', barcode: '8902000002002', name: 'Pillow', category: 'Home', unit: 'pcs', hsn_sac: '9404', mrp: 349, cost: 140, sale: 329, tax: 12, qty: 18, reorder: 4 },
  ];
}

function servicesItems() {
  return [
    { sku: 'SRV-001', name: 'Consulting hour', category: 'Services', unit: 'hr', hsn_sac: '9983', mrp: 2500, cost: 0, sale: 2500, tax: 18, qty: 0, reorder: 0 },
    { sku: 'SRV-002', name: 'AMC — annual', category: 'AMC', unit: 'yr', hsn_sac: '9983', mrp: 18000, cost: 0, sale: 18000, tax: 18, qty: 0, reorder: 0 },
    { sku: 'SRV-003', name: 'On-site visit', category: 'Services', unit: 'visit', hsn_sac: '9983', mrp: 1500, cost: 0, sale: 1500, tax: 18, qty: 0, reorder: 0 },
  ];
}

const VARIANTS = [
  {
    slug: 'pos-restaurant',
    name: 'Demo Restaurant',
    email: 'restaurant@smebuze.local',
    type: 'dine_restaurant',
    company: 'Spice Kitchen',
    warehouse: 'Kitchen',
    items: restaurantItems,
    pos: true,
  },
  {
    slug: 'pos-sweets',
    name: 'Demo Sweet Shop',
    email: 'sweets@smebuze.local',
    type: 'sweet_shop',
    company: 'Mithai House',
    warehouse: 'Shop counter',
    items: sweetItems,
    pos: true,
  },
  {
    slug: 'pos-garment',
    name: 'Demo Garment Shop',
    email: 'garment@smebuze.local',
    type: 'garment_shop',
    company: 'Style Rack',
    warehouse: 'Shop floor',
    items: garmentItems,
    pos: true,
  },
  {
    slug: 'pos-kirana',
    name: 'Demo Kirana',
    email: 'kirana@smebuze.local',
    type: 'retail_shop',
    company: 'Neighbourhood Store',
    warehouse: 'Shop counter',
    items: kiranaItems,
    pos: true,
  },
  {
    slug: 'pos-dept',
    name: 'Demo Department Store',
    email: 'dept@smebuze.local',
    type: 'department_store',
    company: 'City Mart',
    warehouse: 'Main floor',
    items: deptItems,
    pos: true,
  },
  {
    slug: 'demo-services',
    name: 'Demo Services',
    email: 'services@smebuze.local',
    type: 'services',
    company: 'Service Desk',
    warehouse: 'Office',
    items: servicesItems,
    pos: false,
  },
];

async function ensurePlatform(db) {
  await db.query(
    `INSERT INTO platform_org (id, name, slug, settings) VALUES ($1, 'SMEBUZE', 'smebuzz', '{}')
     ON CONFLICT (slug) DO NOTHING`,
    [PLATFORM_ORG_ID],
  );
}

async function seedVariant(db, hash, v) {
  const theme = THEMES[v.type] || THEMES.trading;
  const patch = {
    business_type: v.type,
    branding: { primary_color: theme.primary, accent_color: theme.accent },
  };
  const settings = JSON.stringify(patch);
  let t = await db.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [v.slug]);
  if (!t.rows.length) {
    t = await db.query(
      `INSERT INTO tenants (platform_org_id, name, slug, plan, features, settings, subscription_ends_at, is_active)
       VALUES ($1, $2, $3, 'advanced', $4::jsonb, $5::jsonb, NOW() + INTERVAL '1 year', true)
       RETURNING id`,
      [PLATFORM_ORG_ID, v.name, v.slug, FEATURES, settings],
    );
  } else {
    await db.query(
      `UPDATE tenants SET name = $2, plan = 'advanced', features = $3::jsonb,
         settings = COALESCE(settings, '{}'::jsonb) || $4::jsonb,
         subscription_ends_at = COALESCE(subscription_ends_at, NOW() + INTERVAL '1 year'), is_active = true
       WHERE id = $1`,
      [t.rows[0].id, v.name, FEATURES, settings],
    );
  }
  const tenantId = t.rows[0].id;

  let c = await db.query('SELECT id FROM companies WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  if (!c.rows.length) {
    c = await db.query(
      `INSERT INTO companies (tenant_id, name, is_default) VALUES ($1, $2, true) RETURNING id`,
      [tenantId, v.company],
    );
  }
  const companyId = c.rows[0].id;

  let b = await db.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
  if (!b.rows.length) {
    b = await db.query(
      `INSERT INTO branches (company_id, name, is_default) VALUES ($1, 'Main', true) RETURNING id`,
      [companyId],
    );
  }
  const branchId = b.rows[0].id;

  let w = await db.query('SELECT id FROM warehouses WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  if (!w.rows.length) {
    w = await db.query(
      `INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default)
       VALUES ($1, $2, $3, $4, 'MAIN', true) RETURNING id`,
      [tenantId, companyId, branchId, v.warehouse],
    );
  }
  const warehouseId = w.rows[0].id;

  let role = await db.query(`SELECT id FROM roles WHERE tenant_id = $1 AND slug = 'tenant_admin'`, [tenantId]);
  if (!role.rows.length) {
    role = await db.query(
      `INSERT INTO roles (tenant_id, name, slug, is_system) VALUES ($1, 'Tenant Admin', 'tenant_admin', false) RETURNING id`,
      [tenantId],
    );
  }
  const roleId = role.rows[0].id;
  await db.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT $1, id FROM permissions WHERE key = ANY($2::varchar[])
     AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = $1 AND rp.permission_id = permissions.id)`,
    [roleId, ADMIN_PERMS],
  );

  let user = await db.query('SELECT id FROM users WHERE tenant_id = $1 AND lower(email) = $2 LIMIT 1', [tenantId, v.email]);
  if (!user.rows.length) {
    user = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, default_company_id, default_branch_id, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING id`,
      [tenantId, v.email, hash, v.name + ' Admin', companyId, branchId],
    );
  } else {
    await db.query(
      `UPDATE users SET password_hash = $2, name = $3, default_company_id = $4, default_branch_id = $5, is_active = true, email_verified = true WHERE id = $1`,
      [user.rows[0].id, hash, v.name + ' Admin', companyId, branchId],
    );
  }
  const ur = await db.query('SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2', [user.rows[0].id, roleId]);
  if (!ur.rows.length) {
    await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [user.rows[0].id, roleId]);
  }

  if (v.pos) {
    const walk = await db.query(
      `SELECT id FROM customers WHERE tenant_id = $1 AND (tags @> $2::jsonb OR name ILIKE '%walk%') LIMIT 1`,
      [tenantId, JSON.stringify(['walk_in'])],
    );
    if (!walk.rows.length) {
      await db.query(
        `INSERT INTO customers (tenant_id, company_id, name, entity_type, tags, segment, is_active)
         VALUES ($1, $2, 'Walk-in / Counter', 'individual', $3::jsonb, 'counter', true)`,
        [tenantId, companyId, JSON.stringify(['walk_in'])],
      );
    }
  }

  const catalog = v.items();
  const cats = [...new Set(catalog.map((i) => i.category))];
  for (const name of cats) {
    await db.query(
      `INSERT INTO item_categories (tenant_id, name)
       SELECT $1::uuid, $2::varchar WHERE NOT EXISTS (SELECT 1 FROM item_categories WHERE tenant_id = $1::uuid AND name = $2::varchar)`,
      [tenantId, name],
    );
  }

  for (const it of catalog) {
    let row = await db.query('SELECT id FROM items WHERE tenant_id = $1 AND sku = $2 LIMIT 1', [tenantId, it.sku]);
    if (!row.rows.length) {
      row = await db.query(
        `INSERT INTO items (tenant_id, company_id, sku, barcode, name, category, unit, hsn_sac, mrp, cost_price, sale_price, tax_rate, reorder_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
         RETURNING id`,
        [tenantId, companyId, it.sku, it.barcode || null, it.name, it.category, it.unit, it.hsn_sac, it.mrp, it.cost, it.sale, it.tax, it.reorder],
      );
    } else {
      await db.query(
        `UPDATE items SET barcode = $3, name = $4, category = $5, unit = $6, hsn_sac = $7, mrp = $8, cost_price = $9, sale_price = $10, tax_rate = $11, reorder_level = $12
         WHERE tenant_id = $1 AND sku = $2`,
        [tenantId, it.sku, it.barcode || null, it.name, it.category, it.unit, it.hsn_sac, it.mrp, it.cost, it.sale, it.tax, it.reorder],
      );
    }
    const itemId = row.rows[0].id;
    if (it.qty > 0) {
      const stock = await db.query(
        `SELECT id FROM stock WHERE warehouse_id = $1 AND item_id = $2 LIMIT 1`,
        [warehouseId, itemId],
      );
      if (!stock.rows.length) {
        await db.query(
          `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved) VALUES ($1, $2, $3, $4, 0)`,
          [tenantId, warehouseId, itemId, it.qty],
        );
      } else {
        await db.query(`UPDATE stock SET quantity = $2 WHERE id = $1`, [stock.rows[0].id, it.qty]);
      }
    }
  }

  console.log(`  ${v.slug.padEnd(16)}  ${v.email.padEnd(28)}  type=${v.type}`);
}

async function run() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smebuze',
  });
  await db.connect();
  try {
    await ensurePlatform(db);
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    console.log('Seeding business-type variants (password for all: Password123)\n');
    console.log('  slug              email                         type');
    for (const v of VARIANTS) {
      await seedVariant(db, hash, v);
    }
    console.log('\nExisting ERP demo stays as tenant slug `demo` (admin@demo.com).');
    console.log('POS tenants open /pos after login. Department store: dept@smebuze.local / pos-dept.');
  } finally {
    await db.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
