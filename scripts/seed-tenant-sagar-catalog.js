/**
 * Expand Sagar General Store with a full department-store catalog:
 * parent categories → subcategories → many SKUs + stock.
 *
 * Idempotent for slug sagar-general-store. Skips SKUs that already exist.
 * Also widens modules/permissions so the shop can bill, stock, purchase, and report.
 *
 * Login: tenant sagar-general-store / admin@sagargeneral.store / Password123
 *
 * Usage: npm run seed:sagar-catalog
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TENANT_SLUG = 'sagar-general-store';

const MODULES = [
  'dashboard', 'sales', 'inventory', 'crm', 'purchase', 'reports', 'organization', 'onboarding', 'help',
];
const FEATURES = ['sales', 'inventory', 'crm', 'purchase', 'reports'];

const ADMIN_PERMS = [
  'org.company.create', 'org.company.view', 'org.company.update',
  'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.invoice.create', 'sales.invoice.view',
  'purchase.vendor.create', 'purchase.vendor.view', 'purchase.order.create', 'purchase.order.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'reports.view',
];

/** Department → subcategories → items */
const TREE = [
  {
    name: 'Grocery',
    subs: [
      {
        name: 'Staples',
        items: [
          { sku: 'SAG-G-RICE-1', barcode: '8901100100001', name: 'Kolam Rice 1kg', unit: 'pkt', hsn: '1006', mrp: 78, cost: 58, sale: 72, tax: 5, qty: 80 },
          { sku: 'SAG-G-RICE-5', barcode: '8901100100002', name: 'Kolam Rice 5kg', unit: 'pkt', hsn: '1006', mrp: 360, cost: 280, sale: 345, tax: 5, qty: 40 },
          { sku: 'SAG-G-ATTA-5', barcode: '8901725004019', name: 'Aashirvaad Atta 5kg', unit: 'pkt', hsn: '1101', mrp: 285, cost: 240, sale: 275, tax: 5, qty: 45 },
          { sku: 'SAG-G-SUGAR-1', barcode: '8901100100003', name: 'Sugar 1kg', unit: 'pkt', hsn: '1701', mrp: 48, cost: 38, sale: 45, tax: 5, qty: 90 },
          { sku: 'SAG-G-SALT-1', barcode: '8901088000013', name: 'Tata Salt 1kg', unit: 'pkt', hsn: '2501', mrp: 28, cost: 18, sale: 26, tax: 5, qty: 120 },
          { sku: 'SAG-G-TOOR-1', barcode: '8901100100004', name: 'Toor Dal 1kg', unit: 'pkt', hsn: '0713', mrp: 165, cost: 128, sale: 159, tax: 5, qty: 50 },
          { sku: 'SAG-G-MOONG-1', barcode: '8901100100005', name: 'Moong Dal 1kg', unit: 'pkt', hsn: '0713', mrp: 155, cost: 118, sale: 149, tax: 5, qty: 40 },
          { sku: 'SAG-G-CHANA-1', barcode: '8901100100006', name: 'Chana Dal 1kg', unit: 'pkt', hsn: '0713', mrp: 95, cost: 72, sale: 89, tax: 5, qty: 45 },
        ],
      },
      {
        name: 'Oils & ghee',
        items: [
          { sku: 'SAG-G-OIL-1', barcode: '8901030865990', name: 'Fortune Sunflower Oil 1L', unit: 'ltr', hsn: '1512', mrp: 145, cost: 118, sale: 142, tax: 5, qty: 80 },
          { sku: 'SAG-G-OIL-5', barcode: '8901100100010', name: 'Fortune Sunflower Oil 5L', unit: 'can', hsn: '1512', mrp: 720, cost: 590, sale: 699, tax: 5, qty: 24 },
          { sku: 'SAG-G-MUST-1', barcode: '8901100100011', name: 'Mustard Oil 1L', unit: 'ltr', hsn: '1514', mrp: 175, cost: 140, sale: 169, tax: 5, qty: 36 },
          { sku: 'SAG-G-GHEE-1', barcode: '8901100100012', name: 'Amul Ghee 1L', unit: 'tin', hsn: '0405', mrp: 620, cost: 520, sale: 599, tax: 12, qty: 18 },
        ],
      },
      {
        name: 'Spices',
        items: [
          { sku: 'SAG-G-TUR-200', barcode: '8901100100020', name: 'Turmeric Powder 200g', unit: 'pkt', hsn: '0910', mrp: 55, cost: 32, sale: 49, tax: 5, qty: 60 },
          { sku: 'SAG-G-CHI-100', barcode: '8901100100021', name: 'Red Chilli Powder 100g', unit: 'pkt', hsn: '0904', mrp: 48, cost: 28, sale: 45, tax: 5, qty: 55 },
          { sku: 'SAG-G-COR-100', barcode: '8901100100022', name: 'Coriander Powder 100g', unit: 'pkt', hsn: '0909', mrp: 42, cost: 24, sale: 39, tax: 5, qty: 50 },
          { sku: 'SAG-G-GAR-100', barcode: '8901100100023', name: 'Garam Masala 100g', unit: 'pkt', hsn: '0910', mrp: 65, cost: 38, sale: 59, tax: 5, qty: 40 },
        ],
      },
    ],
  },
  {
    name: 'Packaged food',
    subs: [
      {
        name: 'Noodles & pasta',
        items: [
          { sku: 'SAG-P-MAG-70', barcode: '8901058890123', name: 'Maggi 70g', unit: 'pkt', hsn: '1902', mrp: 14, cost: 10, sale: 14, tax: 18, qty: 120 },
          { sku: 'SAG-P-MAG-4', barcode: '8901100200001', name: 'Maggi Family Pack', unit: 'pkt', hsn: '1902', mrp: 56, cost: 40, sale: 52, tax: 18, qty: 48 },
          { sku: 'SAG-P-YIP-70', barcode: '8901100200002', name: 'Yippee Noodles 70g', unit: 'pkt', hsn: '1902', mrp: 14, cost: 9, sale: 14, tax: 18, qty: 80 },
          { sku: 'SAG-P-PASTA', barcode: '8901100200003', name: 'Bambino Pasta 500g', unit: 'pkt', hsn: '1902', mrp: 85, cost: 55, sale: 79, tax: 12, qty: 30 },
        ],
      },
      {
        name: 'Biscuits & snacks',
        items: [
          { sku: 'SAG-P-PG-800', barcode: '8901030861111', name: 'Parle-G 800g', unit: 'pkt', hsn: '1905', mrp: 80, cost: 58, sale: 78, tax: 12, qty: 40 },
          { sku: 'SAG-P-LAYS', barcode: '8901491502012', name: 'Lays Classic', unit: 'pkt', hsn: '1905', mrp: 20, cost: 12, sale: 20, tax: 12, qty: 90 },
          { sku: 'SAG-P-KUR', barcode: '8901100200010', name: 'Kurkure Masala', unit: 'pkt', hsn: '1905', mrp: 20, cost: 12, sale: 20, tax: 12, qty: 70 },
          { sku: 'SAG-P-BRIT', barcode: '8901100200011', name: 'Britannia Good Day', unit: 'pkt', hsn: '1905', mrp: 30, cost: 20, sale: 28, tax: 12, qty: 55 },
          { sku: 'SAG-P-HAL', barcode: '8901100200012', name: 'Haldiram Bhujia 400g', unit: 'pkt', hsn: '2106', mrp: 110, cost: 78, sale: 105, tax: 12, qty: 28 },
        ],
      },
      {
        name: 'Dairy & cold',
        items: [
          { sku: 'SAG-P-MILK-1', barcode: '8901100200020', name: 'Amul Milk 1L', unit: 'pkt', hsn: '0401', mrp: 68, cost: 58, sale: 66, tax: 5, qty: 60 },
          { sku: 'SAG-P-CURD', barcode: '8901100200021', name: 'Amul Masti Dahi 400g', unit: 'cup', hsn: '0403', mrp: 30, cost: 22, sale: 28, tax: 5, qty: 40 },
          { sku: 'SAG-P-BUTTER', barcode: '8901100200022', name: 'Amul Butter 100g', unit: 'pcs', hsn: '0405', mrp: 58, cost: 48, sale: 56, tax: 12, qty: 36 },
          { sku: 'SAG-P-PANEER', barcode: '8901100200023', name: 'Amul Paneer 200g', unit: 'pkt', hsn: '0406', mrp: 95, cost: 78, sale: 92, tax: 5, qty: 24 },
        ],
      },
    ],
  },
  {
    name: 'Beverages',
    subs: [
      {
        name: 'Soft drinks',
        items: [
          { sku: 'SAG-B-COKE-750', barcode: '8901764012345', name: 'Coca-Cola 750ml', unit: 'btl', hsn: '2202', mrp: 40, cost: 28, sale: 40, tax: 28, qty: 72 },
          { sku: 'SAG-B-THUMS', barcode: '8901100300001', name: 'Thums Up 750ml', unit: 'btl', hsn: '2202', mrp: 40, cost: 28, sale: 40, tax: 28, qty: 60 },
          { sku: 'SAG-B-SPRITE', barcode: '8901100300002', name: 'Sprite 750ml', unit: 'btl', hsn: '2202', mrp: 40, cost: 28, sale: 40, tax: 28, qty: 48 },
          { sku: 'SAG-B-FANTA', barcode: '8901100300003', name: 'Fanta 750ml', unit: 'btl', hsn: '2202', mrp: 40, cost: 28, sale: 40, tax: 28, qty: 36 },
        ],
      },
      {
        name: 'Juices & water',
        items: [
          { sku: 'SAG-B-REAL', barcode: '8901499100100', name: 'Real Juice 1L', unit: 'pkt', hsn: '2009', mrp: 110, cost: 78, sale: 105, tax: 12, qty: 30 },
          { sku: 'SAG-B-MAZA', barcode: '8901100300010', name: 'Maaza 1.2L', unit: 'btl', hsn: '2009', mrp: 60, cost: 42, sale: 58, tax: 12, qty: 40 },
          { sku: 'SAG-B-BIS', barcode: '8906006450019', name: 'Bisleri 1L', unit: 'btl', hsn: '2201', mrp: 20, cost: 10, sale: 20, tax: 18, qty: 100 },
          { sku: 'SAG-B-KIN', barcode: '8901100300011', name: 'Kinley Soda 750ml', unit: 'btl', hsn: '2201', mrp: 25, cost: 14, sale: 25, tax: 18, qty: 48 },
        ],
      },
      {
        name: 'Tea & coffee',
        items: [
          { sku: 'SAG-B-TEA-250', barcode: '8901100300020', name: 'Red Label 250g', unit: 'pkt', hsn: '0902', mrp: 145, cost: 110, sale: 139, tax: 5, qty: 32 },
          { sku: 'SAG-B-TEA-500', barcode: '8901100300021', name: 'Tata Tea Gold 500g', unit: 'pkt', hsn: '0902', mrp: 290, cost: 230, sale: 279, tax: 5, qty: 20 },
          { sku: 'SAG-B-COF-50', barcode: '8901100300022', name: 'Nescafe Classic 50g', unit: 'jar', hsn: '0901', mrp: 185, cost: 140, sale: 179, tax: 5, qty: 22 },
        ],
      },
    ],
  },
  {
    name: 'Household',
    subs: [
      {
        name: 'Detergent',
        items: [
          { sku: 'SAG-H-SURF-1', barcode: '8901030650015', name: 'Surf Excel 1kg', unit: 'pkt', hsn: '3402', mrp: 210, cost: 165, sale: 199, tax: 18, qty: 36 },
          { sku: 'SAG-H-RIN', barcode: '8901100400001', name: 'Rin Bar', unit: 'pcs', hsn: '3401', mrp: 10, cost: 6, sale: 10, tax: 18, qty: 100 },
          { sku: 'SAG-H-ARIEL', barcode: '8901100400002', name: 'Ariel 1kg', unit: 'pkt', hsn: '3402', mrp: 225, cost: 175, sale: 215, tax: 18, qty: 24 },
          { sku: 'SAG-H-WHEEL', barcode: '8901100400003', name: 'Wheel Active 1kg', unit: 'pkt', hsn: '3402', mrp: 85, cost: 58, sale: 79, tax: 18, qty: 40 },
        ],
      },
      {
        name: 'Cleaners',
        items: [
          { sku: 'SAG-H-HAR', barcode: '8901314001234', name: 'Harpic 500ml', unit: 'btl', hsn: '3402', mrp: 99, cost: 68, sale: 95, tax: 18, qty: 28 },
          { sku: 'SAG-H-VIM', barcode: '8901030700123', name: 'Vim Bar', unit: 'pcs', hsn: '3401', mrp: 12, cost: 7, sale: 12, tax: 18, qty: 90 },
          { sku: 'SAG-H-LIZ', barcode: '8901100400010', name: 'Lizol 500ml', unit: 'btl', hsn: '3808', mrp: 110, cost: 75, sale: 105, tax: 18, qty: 22 },
          { sku: 'SAG-H-SCO', barcode: '8901100400011', name: 'Scotch-Brite Scrub', unit: 'pcs', hsn: '9603', mrp: 35, cost: 18, sale: 32, tax: 18, qty: 50 },
        ],
      },
    ],
  },
  {
    name: 'Personal care',
    subs: [
      {
        name: 'Oral care',
        items: [
          { sku: 'SAG-C-COL-200', barcode: '8901314123456', name: 'Colgate 200g', unit: 'pcs', hsn: '3306', mrp: 95, cost: 62, sale: 89, tax: 18, qty: 40 },
          { sku: 'SAG-C-SEN', barcode: '8901100500001', name: 'Sensodyne 70g', unit: 'pcs', hsn: '3306', mrp: 145, cost: 95, sale: 139, tax: 18, qty: 20 },
          { sku: 'SAG-C-BRUSH', barcode: '8901100500002', name: 'Colgate Toothbrush', unit: 'pcs', hsn: '9603', mrp: 35, cost: 15, sale: 32, tax: 18, qty: 60 },
        ],
      },
      {
        name: 'Soap & shampoo',
        items: [
          { sku: 'SAG-C-DOVE', barcode: '8901030789012', name: 'Dove Soap', unit: 'pcs', hsn: '3401', mrp: 55, cost: 32, sale: 52, tax: 18, qty: 48 },
          { sku: 'SAG-C-LUX', barcode: '8901100500010', name: 'Lux Soft Touch', unit: 'pcs', hsn: '3401', mrp: 40, cost: 24, sale: 38, tax: 18, qty: 55 },
          { sku: 'SAG-C-CLI', barcode: '8901030867777', name: 'Clinic Plus 180ml', unit: 'btl', hsn: '3305', mrp: 120, cost: 78, sale: 115, tax: 18, qty: 22 },
          { sku: 'SAG-C-HNS', barcode: '8901100500011', name: 'Head & Shoulders 180ml', unit: 'btl', hsn: '3305', mrp: 165, cost: 110, sale: 159, tax: 18, qty: 18 },
        ],
      },
      {
        name: 'Skin & hygiene',
        items: [
          { sku: 'SAG-C-PON', barcode: '8901100500020', name: 'Ponds Cold Cream 55g', unit: 'jar', hsn: '3304', mrp: 110, cost: 72, sale: 105, tax: 18, qty: 16 },
          { sku: 'SAG-C-VASE', barcode: '8901100500021', name: 'Vaseline 50ml', unit: 'tube', hsn: '3304', mrp: 85, cost: 52, sale: 79, tax: 18, qty: 24 },
          { sku: 'SAG-C-DET', barcode: '8901100500022', name: 'Dettol Liquid 250ml', unit: 'btl', hsn: '3808', mrp: 125, cost: 85, sale: 119, tax: 18, qty: 20 },
        ],
      },
    ],
  },
  {
    name: 'Baby & kids',
    subs: [
      {
        name: 'Baby care',
        items: [
          { sku: 'SAG-K-JHN', barcode: '8901100600001', name: 'Johnson Baby Soap', unit: 'pcs', hsn: '3401', mrp: 55, cost: 35, sale: 52, tax: 18, qty: 24 },
          { sku: 'SAG-K-POW', barcode: '8901100600002', name: 'Johnson Baby Powder 100g', unit: 'btl', hsn: '3304', mrp: 95, cost: 62, sale: 89, tax: 18, qty: 18 },
          { sku: 'SAG-K-PAM', barcode: '8901100600003', name: 'Pampers S 10s', unit: 'pkt', hsn: '9619', mrp: 199, cost: 145, sale: 189, tax: 12, qty: 20 },
        ],
      },
      {
        name: 'Stationery',
        items: [
          { sku: 'SAG-K-NOTE', barcode: '8901100600010', name: 'Classmate Notebook 172p', unit: 'pcs', hsn: '4820', mrp: 60, cost: 38, sale: 55, tax: 12, qty: 40 },
          { sku: 'SAG-K-PEN', barcode: '8901100600011', name: 'Reynolds Ball Pen Blue', unit: 'pcs', hsn: '9608', mrp: 10, cost: 5, sale: 10, tax: 12, qty: 100 },
          { sku: 'SAG-K-PENCIL', barcode: '8901100600012', name: 'Apsara Pencil Pack 10', unit: 'pkt', hsn: '9609', mrp: 40, cost: 22, sale: 38, tax: 12, qty: 35 },
        ],
      },
    ],
  },
  {
    name: 'Electronics',
    subs: [
      {
        name: 'Batteries & bulbs',
        items: [
          { sku: 'SAG-E-DUR', barcode: '5000394058693', name: 'Duracell AA 4pc', unit: 'pkt', hsn: '8506', mrp: 149, cost: 95, sale: 139, tax: 18, qty: 24 },
          { sku: 'SAG-E-EVE', barcode: '8901100700001', name: 'Eveready AAA 4pc', unit: 'pkt', hsn: '8506', mrp: 80, cost: 48, sale: 75, tax: 18, qty: 30 },
          { sku: 'SAG-E-LED9', barcode: '8901100700002', name: 'LED Bulb 9W', unit: 'pcs', hsn: '8539', mrp: 89, cost: 38, sale: 79, tax: 18, qty: 40 },
          { sku: 'SAG-E-EXT', barcode: '8901100700003', name: 'Extension Board 4 Socket', unit: 'pcs', hsn: '8536', mrp: 349, cost: 180, sale: 329, tax: 18, qty: 12 },
        ],
      },
    ],
  },
  {
    name: 'Apparel',
    subs: [
      {
        name: 'Men',
        items: [
          { sku: 'SAG-A-TEE-M', barcode: '8902000001001', name: 'Cotton T-Shirt M', unit: 'pcs', hsn: '6109', mrp: 499, cost: 180, sale: 449, tax: 5, qty: 20 },
          { sku: 'SAG-A-TEE-L', barcode: '8901100800001', name: 'Cotton T-Shirt L', unit: 'pcs', hsn: '6109', mrp: 499, cost: 180, sale: 449, tax: 5, qty: 18 },
          { sku: 'SAG-A-SOCK', barcode: '8902000001002', name: 'Socks Pack 3', unit: 'pkt', hsn: '6115', mrp: 149, cost: 55, sale: 129, tax: 5, qty: 30 },
        ],
      },
      {
        name: 'Women & home textile',
        items: [
          { sku: 'SAG-A-DUP', barcode: '8901100800010', name: 'Cotton Dupatta', unit: 'pcs', hsn: '6214', mrp: 299, cost: 110, sale: 279, tax: 5, qty: 16 },
          { sku: 'SAG-A-BED', barcode: '8902000002001', name: 'Bedsheet Queen', unit: 'pcs', hsn: '6304', mrp: 899, cost: 380, sale: 799, tax: 12, qty: 14 },
          { sku: 'SAG-A-PIL', barcode: '8902000002002', name: 'Pillow', unit: 'pcs', hsn: '9404', mrp: 349, cost: 140, sale: 329, tax: 12, qty: 18 },
        ],
      },
    ],
  },
];

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

async function ensureCategory(client, tenantId, name, parentId, sortOrder) {
  const existing = await client.query(
    `SELECT id FROM item_categories
     WHERE tenant_id = $1 AND lower(name) = lower($2)
       AND COALESCE(parent_id::text, '') = COALESCE($3::text, '')
     LIMIT 1`,
    [tenantId, name, parentId],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await client.query(
    `INSERT INTO item_categories (tenant_id, name, sort_order, parent_id)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [tenantId, name, sortOrder, parentId],
  );
  return ins.rows[0].id;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smebuze',
  });
  await client.connect();

  try {
    const tRes = await client.query(
      `SELECT id, settings FROM tenants WHERE slug = $1 LIMIT 1`,
      [TENANT_SLUG],
    );
    if (!tRes.rows[0]) {
      throw new Error(`Tenant ${TENANT_SLUG} not found. Deploy migration 043 first.`);
    }
    const tenantId = tRes.rows[0].id;
    const settings = tRes.rows[0].settings || {};

    const co = await client.query(
      `SELECT id FROM companies WHERE tenant_id = $1 ORDER BY is_default DESC NULLS LAST LIMIT 1`,
      [tenantId],
    );
    const companyId = co.rows[0]?.id;
    if (!companyId) throw new Error('No company for Sagar tenant');

    const wh = await client.query(
      `SELECT id FROM warehouses WHERE tenant_id = $1 ORDER BY is_default DESC NULLS LAST LIMIT 1`,
      [tenantId],
    );
    const warehouseId = wh.rows[0]?.id;
    if (!warehouseId) throw new Error('No warehouse for Sagar tenant');

    // Widen modules for a full counter + stock + purchase desk
    const nextSettings = {
      ...settings,
      business_type: 'department_store',
      account_kind: settings.account_kind || 'real',
      workspace_configured: true,
      brand_name: settings.brand_name || 'Sagar General Store',
      enabled_modules: MODULES,
    };
    await client.query(
      `UPDATE tenants SET
         features = $2::jsonb,
         settings = $3::jsonb,
         plan = COALESCE(NULLIF(plan, ''), 'advanced')
       WHERE id = $1`,
      [tenantId, JSON.stringify(FEATURES), JSON.stringify(nextSettings)],
    );

    // Expand store admin permissions
    const role = await client.query(
      `SELECT id FROM roles WHERE tenant_id = $1 AND slug = 'tenant_admin' LIMIT 1`,
      [tenantId],
    );
    if (role.rows[0]) {
      const roleId = role.rows[0].id;
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p
         WHERE p.key = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [roleId, ADMIN_PERMS],
      );
    }

    let catCount = 0;
    let subCount = 0;
    let itemCount = 0;
    let stockCount = 0;

    for (let di = 0; di < TREE.length; di++) {
      const dept = TREE[di];
      const parentId = await ensureCategory(client, tenantId, dept.name, null, di + 1);
      catCount += 1;

      for (let si = 0; si < dept.subs.length; si++) {
        const sub = dept.subs[si];
        await ensureCategory(client, tenantId, sub.name, parentId, si + 1);
        subCount += 1;

        for (const it of sub.items) {
          const exists = await client.query(
            `SELECT id FROM items WHERE tenant_id = $1 AND sku = $2 LIMIT 1`,
            [tenantId, it.sku],
          );
          let itemId = exists.rows[0]?.id;
          if (!itemId) {
            const half = Number(it.tax) / 2;
            const ins = await client.query(
              `INSERT INTO items (
                 tenant_id, company_id, sku, barcode, name, unit, category, subcategory,
                 hsn_sac, mrp, cost_price, sale_price, tax_rate, cgst_rate, sgst_rate,
                 for_sale, for_consume, is_active, reorder_level
               ) VALUES (
                 $1,$2,$3,$4,$5,$6,$7,$8,
                 $9,$10,$11,$12,$13,$14,$15,
                 true,false,true,$16
               ) RETURNING id`,
              [
                tenantId, companyId, it.sku, it.barcode || null, it.name, it.unit,
                dept.name, sub.name, it.hsn,
                String(it.mrp), String(it.cost), String(it.sale),
                String(it.tax), String(half), String(half),
                it.qty > 10 ? Math.floor(it.qty / 5) : 2,
              ],
            );
            itemId = ins.rows[0].id;
            itemCount += 1;
          }

          try {
            const st = await client.query(
              `SELECT id, quantity FROM stock
               WHERE tenant_id = $1 AND warehouse_id = $2 AND item_id = $3 AND batch_code IS NULL
               LIMIT 1`,
              [tenantId, warehouseId, itemId],
            );
            if (!st.rows[0]) {
              await client.query(
                `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved)
                 VALUES ($1,$2,$3,$4,0)`,
                [tenantId, warehouseId, itemId, it.qty],
              );
              stockCount += 1;
            } else if (Number(st.rows[0].quantity) < Number(it.qty)) {
              await client.query(
                `UPDATE stock SET quantity = $1 WHERE id = $2`,
                [it.qty, st.rows[0].id],
              );
              stockCount += 1;
            }
          } catch (e) {
            // ignore unique races
          }
        }
      }
    }

    // Walk-in + credit customers if missing
    await client.query(
      `INSERT INTO customers (tenant_id, company_id, name, phone, credit_limit, tags, segment, is_active)
       SELECT $1, $2, 'Walk-in cash', NULL, 0, '["walk_in"]'::jsonb, 'cash', true
       WHERE NOT EXISTS (
         SELECT 1 FROM customers WHERE tenant_id = $1 AND name = 'Walk-in cash'
       )`,
      [tenantId, companyId],
    );
    await client.query(
      `INSERT INTO customers (tenant_id, company_id, name, phone, credit_limit, tags, segment, is_active)
       SELECT $1, $2, 'Monthly credit', NULL, 50000, '["credit"]'::jsonb, 'credit', true
       WHERE NOT EXISTS (
         SELECT 1 FROM customers WHERE tenant_id = $1 AND name = 'Monthly credit'
       )`,
      [tenantId, companyId],
    );

    const totals = await client.query(
      `SELECT
         (SELECT count(*)::int FROM item_categories WHERE tenant_id = $1 AND parent_id IS NULL) AS departments,
         (SELECT count(*)::int FROM item_categories WHERE tenant_id = $1 AND parent_id IS NOT NULL) AS subcategories,
         (SELECT count(*)::int FROM items WHERE tenant_id = $1 AND is_active) AS items`,
      [tenantId],
    );

    console.log('\nSagar General Store catalog ready:');
    console.log(`  Added this run: ${catCount} dept touches, ${subCount} subs, ${itemCount} new SKUs, ${stockCount} stock rows`);
    console.log(`  Totals now: ${totals.rows[0].departments} departments, ${totals.rows[0].subcategories} subcategories, ${totals.rows[0].items} items`);
    console.log('  Modules: sales, inventory, crm, purchase, reports');
    console.log('\n──────── Login ────────');
    console.log('  URL:    https://smebuze.com/login');
    console.log('  Tenant: sagar-general-store');
    console.log('  Email:  admin@sagargeneral.store');
    console.log('  Pass:   Password123');
    console.log('───────────────────────\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
