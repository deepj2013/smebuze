/**
 * B2B garments / multi-cloth wholesale demo for sales pitches.
 *
 * Tenant slug: demo-b2b-garments
 * business_type: b2b
 * ~3–4 months of quotations, portal orders, invoices and payments.
 *
 * Login (password Password123 for all):
 *   Tenant slug: demo-b2b-garments
 *   admin@demo-b2b-garments.demo
 *   sales@demo-b2b-garments.demo
 *   staff@demo-b2b-garments.demo
 *
 * Safe: only creates/updates this demo slug. Idempotent — re-run skips data if invoices exist.
 *
 * Usage: npm run seed:b2b-garments
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_PASSWORD = 'Password123';
const TENANT_SLUG = 'demo-b2b-garments';
const TENANT_NAME = 'ClothKart Wholesale (B2B Demo)';
const COMPANY_NAME = 'ClothKart Wholesale Pvt Ltd';

const FEATURES = [
  'crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports',
  'storefront', 'catalog', 'lead_hub', 'whatsapp',
];
const MODULES = ['dashboard', 'crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'onboarding'];

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

function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
/** Indian FY label for invoice suffix, e.g. 2026-27 */
function fyLabel(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

const CATALOG = [
  { sku: 'CK-MSH-40', name: "Men's Formal Shirt 40", category: 'Menswear', unit: 'pcs', hsn: '6205', mrp: 1299, cost: 520, sale: 890, tax: 5, qty: 180 },
  { sku: 'CK-MSH-42', name: "Men's Formal Shirt 42", category: 'Menswear', unit: 'pcs', hsn: '6205', mrp: 1299, cost: 520, sale: 890, tax: 5, qty: 140 },
  { sku: 'CK-JN-32', name: 'Slim Jeans 32', category: 'Menswear', unit: 'pcs', hsn: '6203', mrp: 1899, cost: 780, sale: 1250, tax: 5, qty: 120 },
  { sku: 'CK-JN-34', name: 'Slim Jeans 34', category: 'Menswear', unit: 'pcs', hsn: '6203', mrp: 1899, cost: 780, sale: 1250, tax: 5, qty: 110 },
  { sku: 'CK-TS-L', name: 'Cotton T-Shirt L (pack of 6)', category: 'Menswear', unit: 'pack', hsn: '6109', mrp: 2999, cost: 1100, sale: 2100, tax: 5, qty: 90 },
  { sku: 'CK-SR-CT', name: 'Cotton Saree Assorted', category: 'Womenswear', unit: 'pcs', hsn: '5007', mrp: 2499, cost: 1100, sale: 1650, tax: 5, qty: 80 },
  { sku: 'CK-KT-M', name: 'Kurti M (pack of 4)', category: 'Womenswear', unit: 'pack', hsn: '6211', mrp: 3200, cost: 1200, sale: 2200, tax: 5, qty: 70 },
  { sku: 'CK-KT-L', name: 'Kurti L (pack of 4)', category: 'Womenswear', unit: 'pack', hsn: '6211', mrp: 3200, cost: 1200, sale: 2200, tax: 5, qty: 65 },
  { sku: 'CK-DP-01', name: 'Dupatta Assorted (pack of 10)', category: 'Accessories', unit: 'pack', hsn: '6214', mrp: 2499, cost: 900, sale: 1600, tax: 5, qty: 100 },
  { sku: 'CK-KD-SET', name: 'Kids Wear Set (pack of 6)', category: 'Kidswear', unit: 'pack', hsn: '6111', mrp: 3599, cost: 1400, sale: 2400, tax: 5, qty: 60 },
  { sku: 'CK-FAB-CT', name: 'Cotton Fabric Roll 50m', category: 'Fabrics', unit: 'roll', hsn: '5208', mrp: 4500, cost: 2200, sale: 3200, tax: 5, qty: 40 },
  { sku: 'CK-FAB-PL', name: 'Polyester Blend Roll 50m', category: 'Fabrics', unit: 'roll', hsn: '5407', mrp: 3800, cost: 1800, sale: 2700, tax: 5, qty: 35 },
  { sku: 'CK-UNF-M', name: 'School Uniform Set M (pack of 10)', category: 'Uniforms', unit: 'pack', hsn: '6203', mrp: 8999, cost: 4200, sale: 6200, tax: 5, qty: 45 },
  { sku: 'CK-BED-Q', name: 'Bedsheet Queen (pack of 5)', category: 'Home textile', unit: 'pack', hsn: '6304', mrp: 4499, cost: 1800, sale: 3100, tax: 12, qty: 50 },
];

const BUYERS = [
  { name: 'StyleHub Multi Brand — Andheri', phone: '+91 98200 11001', gstin: '27AABCS1111A1Z5', city: 'Mumbai', segment: 'Multi-brand retail' },
  { name: 'Fashion Lane Boutique', phone: '+91 98110 22002', gstin: '07AABCF2222B1Z8', city: 'Delhi', segment: 'Boutique' },
  { name: 'Kids World Garments', phone: '+91 98860 33003', gstin: '29AABCK3333C1Z1', city: 'Bengaluru', segment: 'Kids retail' },
  { name: 'Uniform Mart India', phone: '+91 98720 44004', gstin: '03AABCU4444D1Z2', city: 'Chandigarh', segment: 'Institutional' },
  { name: 'Saree Mandir — Surat', phone: '+91 98250 55005', gstin: '24AABCS5555E1Z3', city: 'Surat', segment: 'Ethnic wholesale buyer' },
  { name: 'Thread & Needle Retail Chain', phone: '+91 99000 66006', gstin: '36AABCT6666F1Z4', city: 'Hyderabad', segment: 'Chain store' },
];

const VENDORS = [
  { name: 'Tirupur Knit Mills', phone: '+91 98400 77001', gstin: '33AABCT7777G1Z5' },
  { name: 'Surat Textile House', phone: '+91 98250 88002', gstin: '24AABCS8888H1Z6' },
  { name: 'Ichalkaranji Weavers Co-op', phone: '+91 98900 99003', gstin: '27AABCI9999I1Z7' },
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
  const ends = new Date();
  ends.setFullYear(ends.getFullYear() + 1);

  try {
    await client.query(
      `INSERT INTO platform_org (id, name, slug, settings) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [PLATFORM_ORG_ID, 'SMEBUZE', 'smebuzz', '{}'],
    );

    const settings = {
      business_type: 'b2b',
      account_kind: 'demo',
      workspace_configured: true,
      enabled_modules: MODULES,
      branding: { primary_color: '#1d4ed8', accent_color: '#1e40af', display_name: 'ClothKart Wholesale' },
      billing: { interval: 'yearly', trial: false, auto_renew: false },
    };

    let tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1 LIMIT 1', [TENANT_SLUG]);
    if (tenantRow.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (platform_org_id, name, slug, plan, features, settings, subscription_ends_at, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7, true)`,
        [PLATFORM_ORG_ID, TENANT_NAME, TENANT_SLUG, 'advanced', JSON.stringify(FEATURES), JSON.stringify(settings), ends],
      );
      tenantRow = await client.query('SELECT id FROM tenants WHERE slug = $1', [TENANT_SLUG]);
    } else {
      await client.query(
        `UPDATE tenants SET name = $2, plan = $3, features = $4::jsonb, settings = COALESCE(settings,'{}'::jsonb) || $5::jsonb,
         subscription_ends_at = GREATEST(COALESCE(subscription_ends_at, NOW()), $6), is_active = true
         WHERE slug = $1`,
        [TENANT_SLUG, TENANT_NAME, 'advanced', JSON.stringify(FEATURES), JSON.stringify(settings), ends],
      );
    }
    const tenantId = tenantRow.rows[0].id;

    let companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (companyRes.rows.length === 0) {
      await client.query(
        `INSERT INTO companies (tenant_id, name, legal_name, gstin, address, is_default)
         VALUES ($1, $2, $3, $4, $5::jsonb, true)`,
        [
          tenantId,
          COMPANY_NAME,
          COMPANY_NAME,
          '27AABCC1234D1Z9',
          JSON.stringify({ line1: 'Unit 12, Textile Hub', city: 'Bhiwandi', state: 'Maharashtra', pincode: '421302' }),
        ],
      );
      companyRes = await client.query('SELECT id FROM companies WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    }
    const companyId = companyRes.rows[0].id;

    let branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    if (branchRes.rows.length === 0) {
      await client.query(
        `INSERT INTO branches (company_id, name, address, is_default) VALUES ($1, $2, $3::jsonb, true)`,
        [companyId, 'Bhiwandi Godown', JSON.stringify({ line1: 'Unit 12, Textile Hub', city: 'Bhiwandi', state: 'Maharashtra', pincode: '421302' })],
      );
      branchRes = await client.query('SELECT id FROM branches WHERE company_id = $1 LIMIT 1', [companyId]);
    }
    const branchId = branchRes.rows[0].id;

    const roleDefs = [
      { slug: 'tenant_admin', name: 'Tenant Admin', keys: ADMIN_PERMS },
      {
        slug: 'sales_manager',
        name: 'Sales Manager',
        keys: [
          'crm.lead.create', 'crm.lead.view', 'crm.lead.update',
          'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
          'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view',
          'sales.invoice.create', 'sales.invoice.view', 'reports.view',
        ],
      },
      {
        slug: 'staff',
        name: 'Staff',
        keys: [
          'crm.customer.view', 'sales.invoice.create', 'sales.invoice.view',
          'sales.order.view', 'inventory.item.view', 'inventory.stock.view', 'reports.view',
        ],
      },
    ];
    const roleIds = {};
    for (const r of roleDefs) {
      let row = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, r.slug]);
      if (row.rows.length === 0) {
        await client.query(
          `INSERT INTO roles (tenant_id, name, slug, is_system) VALUES ($1, $2, $3, false)`,
          [tenantId, r.name, r.slug],
        );
        row = await client.query('SELECT id FROM roles WHERE tenant_id = $1 AND slug = $2', [tenantId, r.slug]);
      }
      roleIds[r.slug] = row.rows[0].id;
      const perms = await client.query('SELECT id FROM permissions WHERE key = ANY($1::varchar[])', [r.keys]);
      for (const p of perms.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING',
          [roleIds[r.slug], p.id],
        );
      }
    }

    const users = [
      { email: 'admin@demo-b2b-garments.demo', name: 'ClothKart Admin', role: 'tenant_admin' },
      { email: 'sales@demo-b2b-garments.demo', name: 'Wholesale Sales', role: 'sales_manager' },
      { email: 'staff@demo-b2b-garments.demo', name: 'Dispatch Staff', role: 'staff' },
    ];
    const userIds = {};
    for (const u of users) {
      let uRow = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email]);
      if (uRow.rows.length === 0) {
        await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, name, default_company_id, is_active, email_verified)
           VALUES ($1, $2, $3, $4, $5, true, true)`,
          [tenantId, u.email, passwordHash, u.name, companyId],
        );
        uRow = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, u.email]);
      } else if (process.env.SEED_RESET_PASSWORDS === '1' || process.env.SEED_RESET_PASSWORDS === 'true') {
        await client.query(
          `UPDATE users SET password_hash = $1, name = $2, email_verified = true, default_company_id = $3 WHERE id = $4`,
          [passwordHash, u.name, companyId, uRow.rows[0].id],
        );
      } else {
        await client.query(
          `UPDATE users SET name = $1, email_verified = true, default_company_id = $2 WHERE id = $3`,
          [u.name, companyId, uRow.rows[0].id],
        );
      }
      userIds[u.role] = uRow.rows[0].id;
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
        [userIds[u.role], roleIds[u.role]],
      );
    }

    // Public storefront site (buyer portal)
    const siteSlug = 'clothkart-wholesale';
    const siteExists = await client.query('SELECT id FROM storefront_sites WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (siteExists.rows.length === 0) {
      try {
        await client.query(
          `INSERT INTO storefront_sites (tenant_id, slug, is_published, shop_enabled, pages)
           VALUES ($1, $2, true, true, $3::jsonb)`,
          [
            tenantId,
            siteSlug,
            JSON.stringify({
              home: {
                hero_title: 'Order garments for your store',
                hero_subtitle: 'Wholesale packs for multi-brand, boutique and uniform buyers. GST invoice and delivery challan.',
                about: 'ClothKart supplies ready garments and fabric rolls to retail cloth businesses across India.',
              },
            }),
          ],
        );
      } catch (e) {
        if (!String(e.message || '').toLowerCase().includes('unique')) throw e;
      }
    }

    const hasInvoices = await client.query('SELECT 1 FROM sales_invoices WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (hasInvoices.rows.length > 0) {
      console.log('');
      console.log('B2B garments demo already has invoices — skipped re-seeding transactional data.');
      printLogin();
      return;
    }

    let wh = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (wh.rows.length === 0) {
      await client.query(
        `INSERT INTO warehouses (tenant_id, company_id, branch_id, name, code, is_default)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [tenantId, companyId, branchId, 'Main godown', 'MAIN'],
      );
      wh = await client.query('SELECT id FROM warehouses WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    }
    const warehouseId = wh.rows[0].id;

    const itemIds = [];
    for (const it of CATALOG) {
      const r = await client.query(
        `INSERT INTO items (
           tenant_id, company_id, sku, name, description, unit, category, hsn_sac,
           mrp, cost_price, sale_price, tax_rate, cgst_rate, sgst_rate,
           for_sale, for_consume, portal_listed, is_active, reorder_level
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,true,true,true,$15
         ) RETURNING id`,
        [
          tenantId, companyId, it.sku, it.name, it.name, it.unit, it.category, it.hsn,
          it.mrp, it.cost, it.sale, it.tax, it.tax / 2, it.tax / 2, Math.max(10, Math.round(it.qty / 10)),
        ],
      );
      itemIds.push({ id: r.rows[0].id, ...it });
      try {
        await client.query(
          `INSERT INTO stock (tenant_id, warehouse_id, item_id, quantity, reserved, batch_code)
           VALUES ($1, $2, $3, $4, 0, $5)`,
          [tenantId, warehouseId, r.rows[0].id, it.qty, 'OPENING'],
        );
      } catch (e) {
        if (!String(e.message || '').toLowerCase().includes('unique')) throw e;
      }
    }

    const customerIds = [];
    for (const c of BUYERS) {
      const r = await client.query(
        `INSERT INTO customers (tenant_id, company_id, name, phone, gstin, segment, address, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true) RETURNING id`,
        [
          tenantId, companyId, c.name, c.phone, c.gstin, c.segment,
          JSON.stringify({ city: c.city, state: 'India' }),
        ],
      );
      customerIds.push(r.rows[0].id);
    }

    const vendorIds = [];
    for (const v of VENDORS) {
      const r = await client.query(
        `INSERT INTO vendors (tenant_id, company_id, name, phone, gstin, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [tenantId, companyId, v.name, v.phone, v.gstin],
      );
      vendorIds.push(r.rows[0].id);
    }

    // Start ~110 days ago so reports show ~3.5 months of activity.
    const start = addDays(new Date(), -110);
    const salesId = userIds.sales_manager;
    const staffId = userIds.staff;

    // Quotations (8)
    for (let i = 0; i < 8; i++) {
      const issue = addDays(start, 5 + i * 12);
      const item = itemIds[i % itemIds.length];
      const qty = 10 + (i % 5) * 4;
      const taxable = round2(qty * item.sale);
      const tax = round2(taxable * (item.tax / 100));
      const total = round2(taxable + tax);
      const number = `QTN/${String(i + 1).padStart(4, '0')}/2627`;
      const r = await client.query(
        `INSERT INTO quotations (tenant_id, company_id, branch_id, number, customer_id, issue_date, valid_until, status, total, tax_amount, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          tenantId, companyId, branchId, number, customerIds[i % customerIds.length],
          toDateStr(issue), toDateStr(addDays(issue, 21)),
          i < 5 ? 'accepted' : 'sent', total, tax, salesId,
        ],
      );
      await client.query(
        `INSERT INTO quotation_items (quotation_id, item_id, description, qty, unit, rate, amount, tax_rate, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)`,
        [r.rows[0].id, item.id, item.name, qty, item.unit, item.sale, taxable, item.tax],
      );
    }

    // Sales orders — mix of portal + manual (12)
    const soIds = [];
    for (let i = 0; i < 12; i++) {
      const orderDate = addDays(start, 10 + i * 8);
      const item = itemIds[(i + 2) % itemIds.length];
      const qty = 8 + (i % 6) * 3;
      const taxable = round2(qty * item.sale);
      const tax = round2(taxable * (item.tax / 100));
      const total = round2(taxable + tax);
      const number = `SO/${String(i + 1).padStart(4, '0')}/2627`;
      const channel = i % 3 === 0 ? 'buyer_portal' : 'manual';
      const r = await client.query(
        `INSERT INTO sales_orders (tenant_id, company_id, branch_id, number, customer_id, order_date, status, total, tax_amount, created_by, channel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          tenantId, companyId, branchId, number, customerIds[i % customerIds.length],
          toDateStr(orderDate), i < 10 ? 'confirmed' : 'draft', total, tax, salesId, channel,
        ],
      );
      soIds.push(r.rows[0].id);
      try {
        await client.query(
          `INSERT INTO sales_order_lines (sales_order_id, item_id, description, quantity, unit, rate, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,0)`,
          [r.rows[0].id, item.id, item.name, qty, item.unit, item.sale],
        );
      } catch {
        // older schema variant
      }
    }

    // Invoices across ~3.5 months (24 bills)
    let invSeq = 1;
    for (let week = 0; week < 14; week++) {
      const billsThisWeek = week % 2 === 0 ? 2 : 1;
      for (let b = 0; b < billsThisWeek; b++) {
        const invDate = addDays(start, 12 + week * 7 + b * 2);
        const custId = customerIds[(week + b) % customerIds.length];
        const lineCount = 2 + ((week + b) % 3);
        const lines = [];
        let subtotal = 0;
        let taxAmount = 0;
        for (let L = 0; L < lineCount; L++) {
          const item = itemIds[(week + b + L) % itemIds.length];
          const qty = 4 + ((week + L) % 8) * 2;
          const taxable = round2(qty * item.sale);
          const cgstRate = item.tax / 2;
          const sgstRate = item.tax / 2;
          const cgst = round2(taxable * (cgstRate / 100));
          const sgst = round2(taxable * (sgstRate / 100));
          subtotal = round2(subtotal + taxable);
          taxAmount = round2(taxAmount + cgst + sgst);
          lines.push({ item, qty, taxable, cgstRate, sgstRate, cgst, sgst });
        }
        const total = round2(subtotal + taxAmount);
        const number = `${String(invSeq).padStart(4, '0')}/${fyLabel(invDate)}`;
        invSeq += 1;
        const fullyPaid = week < 8;
        const partial = week >= 8 && week < 11;
        const paid = fullyPaid ? total : partial ? round2(total * 0.5) : 0;
        const status = week < 13 ? 'issued' : 'draft';
        const r = await client.query(
          `INSERT INTO sales_invoices (
             tenant_id, company_id, branch_id, number, customer_id, invoice_date, due_date,
             status, subtotal, tax_amount, total, paid_amount, gst_applicable, created_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13) RETURNING id`,
          [
            tenantId, companyId, branchId, number, custId,
            toDateStr(invDate), toDateStr(addDays(invDate, 30)),
            status, subtotal, taxAmount, total, paid, staffId,
          ],
        );
        for (let li = 0; li < lines.length; li++) {
          const ln = lines[li];
          await client.query(
            `INSERT INTO sales_invoice_lines (
               invoice_id, item_id, hsn_sac, description, qty, unit, rate, taxable_value,
               cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, sort_order
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,0,$13)`,
            [
              r.rows[0].id, ln.item.id, ln.item.hsn, ln.item.name, ln.qty, ln.item.unit, ln.item.sale, ln.taxable,
              ln.cgstRate, ln.cgst, ln.sgstRate, ln.sgst, li,
            ],
          );
        }
        if (paid > 0) {
          await client.query(
            `INSERT INTO invoice_payments (invoice_id, amount, payment_date, mode, reference)
             VALUES ($1,$2,$3,$4,$5)`,
            [r.rows[0].id, paid, toDateStr(addDays(invDate, 5 + (week % 7))), week % 2 === 0 ? 'upi' : 'bank_transfer', `UPI-${number}`],
          );
        }
      }
    }

    // Purchase orders from mills (6)
    for (let i = 0; i < 6; i++) {
      const orderDate = addDays(start, 3 + i * 15);
      const item = itemIds[i % itemIds.length];
      const qty = 40 + i * 10;
      const taxable = round2(qty * item.cost);
      const tax = round2(taxable * 0.05);
      const total = round2(taxable + tax);
      await client.query(
        `INSERT INTO purchase_orders (tenant_id, company_id, branch_id, number, vendor_id, order_date, status, total, tax_amount, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          tenantId, companyId, branchId, `PO/${String(i + 1).padStart(4, '0')}/2627`,
          vendorIds[i % vendorIds.length], toDateStr(orderDate),
          i < 5 ? 'confirmed' : 'draft', total, tax, salesId,
        ],
      );
    }

    // A few CRM leads
    const leads = [
      { name: 'New Boutique — Pune', stage: 'new' },
      { name: 'School tender — uniforms', stage: 'qualified' },
      { name: 'Franchise enquiry — Indore', stage: 'contacted' },
    ];
    for (const l of leads) {
      await client.query(
        `INSERT INTO leads (tenant_id, company_id, name, stage, source, assigned_to)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [tenantId, companyId, l.name, l.stage, 'website', salesId],
      ).catch(() => undefined);
    }

    console.log('');
    console.log('Seeded ClothKart B2B garments demo:');
    console.log(`  ${CATALOG.length} catalog SKUs (portal listed), ${BUYERS.length} cloth buyers, ${VENDORS.length} mills`);
    console.log('  ~3–4 months of quotations, portal/manual orders, GST invoices and payments');
    printLogin();
  } finally {
    await client.end();
  }
}

function printLogin() {
  console.log('');
  console.log('──────── Share this demo login ────────');
  console.log(`  URL:           https://smebuze.com/login`);
  console.log(`  Tenant slug:   ${TENANT_SLUG}`);
  console.log(`  Admin email:   admin@demo-b2b-garments.demo`);
  console.log(`  Sales email:   sales@demo-b2b-garments.demo`);
  console.log(`  Staff email:   staff@demo-b2b-garments.demo`);
  console.log(`  Password:      ${DEMO_PASSWORD}`);
  console.log('  (Reset passwords on re-seed with SEED_RESET_PASSWORDS=1)');
  console.log('───────────────────────────────────────');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
