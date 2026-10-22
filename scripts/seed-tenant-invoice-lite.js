/**
 * Invoices-only (Lite) demo — customers, products, GST bill + printer setup path.
 *
 * Login:
 *   Workspace slug: demo-invoice
 *   Email:          admin@demo-invoice.demo
 *   Password:       Invoice@123
 *
 * Safe: only slug demo-invoice. Idempotent.
 * Usage: npm run seed:invoice-lite
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const TENANT_SLUG = 'demo-invoice';
const DEMO_PASSWORD = 'Invoice@123';
const RESET = process.env.SEED_RESET_PASSWORDS === '1' || process.env.SEED_RESET_PASSWORDS === 'true';

const FEATURES = ['crm', 'sales', 'inventory', 'reports'];
const MODULES = ['dashboard', 'crm', 'sales', 'inventory', 'reports', 'onboarding'];

const ADMIN_PERMS = [
  'org.company.create', 'org.company.view', 'org.company.update',
  'org.branch.create', 'org.branch.view', 'org.branch.update',
  'org.user.create', 'org.user.view', 'org.role.manage',
  'crm.lead.create', 'crm.lead.view', 'crm.lead.update',
  'crm.customer.create', 'crm.customer.view', 'crm.customer.update',
  'sales.quotation.create', 'sales.quotation.view', 'sales.order.create', 'sales.order.view',
  'sales.invoice.create', 'sales.invoice.view',
  'inventory.item.create', 'inventory.item.view', 'inventory.stock.view',
  'reports.view',
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

const ITEMS = [
  { sku: 'SVC-001', name: 'Consulting — hour', category: 'Services', unit: 'hr', hsn: '9983', mrp: 1500, sale: 1500, tax: 18 },
  { sku: 'PRD-001', name: 'Office stationery pack', category: 'Products', unit: 'pcs', hsn: '482010', mrp: 450, sale: 420, tax: 12 },
  { sku: 'PRD-002', name: 'Annual maintenance', category: 'Services', unit: 'job', hsn: '9987', mrp: 12000, sale: 12000, tax: 18 },
];

async function run() {
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smebuze',
  });
  await db.connect();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const email = 'admin@demo-invoice.demo';

  try {
    await db.query(
      `INSERT INTO platform_org (id, name, slug, settings) VALUES ($1, 'SMEBUZE', 'smebuzz', '{}') ON CONFLICT (slug) DO NOTHING`,
      [PLATFORM_ORG_ID],
    );

    const settings = JSON.stringify({
      business_type: 'invoicing_lite',
      workspace_configured: true,
      account_kind: 'demo',
      enabled_modules: MODULES,
      branding: {
        primary_color: '#4f46e5',
        accent_color: '#4338ca',
        invoice_template: 'gst',
        display_name: 'Lite Billing Demo',
      },
    });

    let t = await db.query('SELECT id FROM tenants WHERE slug = $1', [TENANT_SLUG]);
    if (!t.rows.length) {
      t = await db.query(
        `INSERT INTO tenants (platform_org_id, name, slug, plan, features, settings, subscription_ends_at, is_active)
         VALUES ($1, $2, $3, 'invoice_lite', $4::jsonb, $5::jsonb, NOW() + INTERVAL '1 year', true) RETURNING id`,
        [PLATFORM_ORG_ID, 'Invoice Lite Demo', TENANT_SLUG, JSON.stringify(FEATURES), settings],
      );
    } else {
      await db.query(
        `UPDATE tenants SET name = $2, plan = 'invoice_lite', features = $3::jsonb, settings = COALESCE(settings, '{}'::jsonb) || $4::jsonb,
           subscription_ends_at = COALESCE(subscription_ends_at, NOW() + INTERVAL '1 year'), is_active = true WHERE id = $1`,
        [t.rows[0].id, 'Invoice Lite Demo', JSON.stringify(FEATURES), settings],
      );
    }
    const tenantId = t.rows[0].id;

    let c = await db.query('SELECT id FROM companies WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (!c.rows.length) {
      c = await db.query(
        `INSERT INTO companies (tenant_id, name, is_default, gstin, address) VALUES ($1, $2, true, $3, $4::jsonb) RETURNING id`,
        [tenantId, 'Lite Billing Co', '27AABCL1234A1Z5', JSON.stringify({ line1: '101 Demo Street', city: 'Pune', state: 'Maharashtra', pincode: '411001' })],
      );
    }
    const companyId = c.rows[0].id;

    let role = await db.query(`SELECT id FROM roles WHERE tenant_id = $1 AND slug = 'tenant_admin'`, [tenantId]);
    if (!role.rows.length) {
      role = await db.query(
        `INSERT INTO roles (tenant_id, name, slug, is_system) VALUES ($1, 'Tenant Admin', 'tenant_admin', false) RETURNING id`,
        [tenantId],
      );
    }
    await db.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions WHERE key = ANY($2::varchar[])
       AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = $1 AND rp.permission_id = permissions.id)`,
      [role.rows[0].id, ADMIN_PERMS],
    );

    let user = await db.query('SELECT id FROM users WHERE tenant_id = $1 AND lower(email) = $2', [tenantId, email]);
    if (!user.rows.length) {
      await db.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, default_company_id, is_active, email_verified)
         VALUES ($1, $2, $3, $4, $5, true, true)`,
        [tenantId, email, hash, 'Lite Admin', companyId],
      );
    } else if (RESET) {
      await db.query(`UPDATE users SET password_hash = $2, email_verified = true, is_active = true WHERE id = $1`, [user.rows[0].id, hash]);
    } else {
      await db.query(`UPDATE users SET password_hash = $2, email_verified = true, is_active = true WHERE id = $1`, [user.rows[0].id, hash]);
    }
    user = await db.query('SELECT id FROM users WHERE tenant_id = $1 AND lower(email) = $2', [tenantId, email]);
    await db.query(
      `INSERT INTO user_roles (user_id, role_id) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2)`,
      [user.rows[0].id, role.rows[0].id],
    );

    for (const it of ITEMS) {
      const row = await db.query('SELECT id FROM items WHERE tenant_id = $1 AND sku = $2 LIMIT 1', [tenantId, it.sku]);
      if (!row.rows.length) {
        await db.query(
          `INSERT INTO items (tenant_id, company_id, sku, name, category, unit, hsn_sac, mrp, sale_price, tax_rate, is_active, for_sale)
           VALUES ($1::uuid, $2::uuid, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::varchar, $8, $9, $10, true, true)`,
          [tenantId, companyId, it.sku, it.name, it.category, it.unit, it.hsn, it.mrp, it.sale, it.tax],
        );
      }
    }

    const cust = await db.query(`SELECT id FROM customers WHERE tenant_id = $1 AND phone = '9876543210' LIMIT 1`, [tenantId]);
    if (!cust.rows.length) {
      await db.query(
        `INSERT INTO customers (tenant_id, company_id, name, phone, email, entity_type, is_active)
         VALUES ($1, $2, 'Sample Buyer Pvt Ltd', '9876543210', 'buyer@example.com', 'company', true)`,
        [tenantId, companyId],
      );
    }

    const site = await db.query('SELECT id FROM storefront_sites WHERE tenant_id = $1', [tenantId]);
    if (!site.rows.length) {
      await db.query(
        `INSERT INTO storefront_sites (tenant_id, slug, is_published, shop_enabled, pages, theme, domain_status)
         VALUES ($1, $2, true, false, $3::jsonb, '{}', 'none')`,
        [
          tenantId,
          TENANT_SLUG,
          JSON.stringify({
            hero_title: 'Lite Billing Demo',
            hero_subtitle: 'GST invoices only — no POS clutter.',
            about: 'Sample public page for this demo workspace.',
          }),
        ],
      );
    }

    console.log('\nInvoice Lite demo ready.');
    console.log('  Slug:     demo-invoice');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log('  After login: Organization → Printers · Invoice theme · New invoice\n');
  } finally {
    await db.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
