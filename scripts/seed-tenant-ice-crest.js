/** Idempotent Ice Crest custom tenant seed. Run after npm run db:migrate. */
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const PLATFORM_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
const password = process.env.ICE_CREST_ADMIN_PASSWORD || 'Password123';
const ADMIN_EMAIL = (process.env.ICE_CREST_ADMIN_EMAIL || 'info@icecrest.in').trim().toLowerCase();
const OLD_ADMIN_EMAILS = ['admin@icecrest.in', 'admin@ice-crest.in', 'support@smebuze.com'];
const products = [
  ['ICE-2X2X2', 'Ice Cube 2 × 2 × 2 inch', 'pcs'],
  ['ICE-2X2X25', 'Ice Cube 2 × 2 × 2.5 inch', 'pcs'],
  ['ICE-16X16X46', 'Highball Ice 1.6 × 1.6 × 4.6 inch', 'pcs'],
  ['ICE-16X16X48', 'Highball Ice 1.6 × 1.6 × 4.8 inch', 'pcs'],
  ['ICE-SPHERE', 'Ice Ball / Sphere', 'pcs'],
  ['ICE-CUSTOM', 'Custom Ice Size', 'pcs'],
];
const permissions = ['org.company.create','org.company.view','org.company.update','org.branch.create','org.branch.view','org.branch.update','org.user.create','org.user.view','org.role.manage','crm.lead.create','crm.lead.view','crm.lead.update','crm.customer.create','crm.customer.view','crm.customer.update','sales.quotation.create','sales.quotation.view','sales.order.create','sales.order.view','sales.invoice.create','sales.invoice.view','purchase.vendor.create','purchase.vendor.view','purchase.order.create','purchase.order.view','inventory.item.create','inventory.item.view','inventory.stock.view','reports.view'];
async function run() {
  const db = new Client({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres', database: process.env.DB_NAME || 'smebuze' });
  await db.connect();
  try {
    await db.query(`INSERT INTO platform_org(id,name,slug,settings) VALUES($1,'SMEBUZE','smebuzz','{}') ON CONFLICT(slug) DO NOTHING`, [PLATFORM_ORG_ID]);
    const featureJson = JSON.stringify(['crm','sales','inventory','reports','whatsapp','ice_crest']);
    const settingsJson = JSON.stringify({
      business_type: 'ice_crest',
      brand_name: 'Ice Crest',
      custom_dashboard: true,
      terms: 'Prices are valid for 7 days. Payment due within 15 days of invoice. Goods once delivered cannot be returned. Ice quality must be checked at delivery. Subject to Mumbai jurisdiction.',
    });
    let t = await db.query(`SELECT id FROM tenants WHERE slug='ice-crest' LIMIT 1`);
    if (!t.rows.length) t = await db.query(`INSERT INTO tenants(platform_org_id,name,slug,plan,features,settings) VALUES($1,'Ice Crest','ice-crest','enterprise',$2::jsonb,$3::jsonb) RETURNING id`, [PLATFORM_ORG_ID, featureJson, settingsJson]);
    else await db.query(`UPDATE tenants SET name='Ice Crest',plan='enterprise',features=$2::jsonb,settings=$3::jsonb WHERE id=$1`, [t.rows[0].id, featureJson, settingsJson]);
    const tenantId = t.rows[0].id;
    const companyAddress = JSON.stringify({
      line1: 'Plot 12, Ice Factory Lane, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400069',
      email: 'info@icecrest.in',
      phone: '+91 98765 43210',
    });
    const bankDetails = JSON.stringify({
      bank_name: 'HDFC Bank',
      branch: 'Andheri East, Mumbai',
      account_no: '50200012345678',
      ifsc: 'HDFC0001234',
    });
    let c = await db.query(`SELECT id FROM companies WHERE tenant_id=$1 AND name='Ice Crest' LIMIT 1`, [tenantId]);
    if (!c.rows.length) {
      c = await db.query(
        `INSERT INTO companies(tenant_id,name,legal_name,gstin,address,bank_details,logo_url,is_default) VALUES($1,'Ice Crest','Ice Crest Premium Ice Pvt Ltd','27AABCI1234A1Z5',$2::jsonb,$3::jsonb,'/uploads/logos/ice-crest.svg',true) RETURNING id`,
        [tenantId, companyAddress, bankDetails],
      );
    } else {
      await db.query(
        `UPDATE companies SET legal_name='Ice Crest Premium Ice Pvt Ltd', gstin='27AABCI1234A1Z5', address=$2::jsonb, bank_details=$3::jsonb, logo_url='/uploads/logos/ice-crest.svg' WHERE id=$1`,
        [c.rows[0].id, companyAddress, bankDetails],
      );
    }
    const companyId = c.rows[0].id;
    let b = await db.query(`SELECT id FROM branches WHERE company_id=$1 LIMIT 1`, [companyId]);
    if (!b.rows.length) b = await db.query(`INSERT INTO branches(company_id,name,address,is_default) VALUES($1,'Main','{}',true) RETURNING id`, [companyId]);
    const branchId = b.rows[0].id;
    let w = await db.query(`SELECT id FROM warehouses WHERE tenant_id=$1 LIMIT 1`, [tenantId]);
    if (!w.rows.length) w = await db.query(`INSERT INTO warehouses(tenant_id,company_id,branch_id,name,code,is_default) VALUES($1,$2,$3,'Ice Crest Main Stock','IC-MAIN',true) RETURNING id`, [tenantId,companyId,branchId]);
    const warehouseId = w.rows[0].id;
    for (const [sku,name,unit] of products) {
      let item = await db.query(`SELECT id FROM items WHERE tenant_id=$1 AND sku=$2 LIMIT 1`, [tenantId,sku]);
      if (!item.rows.length) item = await db.query(`INSERT INTO items(tenant_id,company_id,sku,name,description,unit,category,hsn_sac,reorder_level,is_active) VALUES($1,$2,$3,$4,$5,$6,'Premium Ice','22019010',50,true) RETURNING id`, [tenantId,companyId,sku,name,name,unit]);
      else await db.query(`UPDATE items SET name=$3::text,description=$4::text,unit=$5::varchar WHERE tenant_id=$1 AND sku=$2`, [tenantId,sku,name,name,unit]);
      await db.query(`INSERT INTO stock(tenant_id,warehouse_id,item_id,quantity,reserved) SELECT $1,$2,$3,0,0 WHERE NOT EXISTS(SELECT 1 FROM stock WHERE tenant_id=$1 AND warehouse_id=$2 AND item_id=$3)`, [tenantId,warehouseId,item.rows[0].id]);
    }
    let role = await db.query(`SELECT id FROM roles WHERE tenant_id=$1 AND slug='tenant_admin'`, [tenantId]);
    if (!role.rows.length) role = await db.query(`INSERT INTO roles(tenant_id,name,slug,is_system) VALUES($1,'Ice Crest Admin','tenant_admin',false) RETURNING id`, [tenantId]);
    const roleId = role.rows[0].id;
    await db.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions WHERE key=ANY($2::varchar[]) ON CONFLICT DO NOTHING`, [roleId,permissions]);
    const hash = await bcrypt.hash(password,10);
    await db.query(
      `UPDATE users SET email=$2
       WHERE tenant_id=$1 AND lower(email)=ANY($3::text[])
         AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.tenant_id=$1 AND lower(u2.email)=$2)`,
      [tenantId, ADMIN_EMAIL, OLD_ADMIN_EMAILS],
    );
    let user = await db.query(`SELECT id FROM users WHERE tenant_id=$1 AND lower(email)=$2 LIMIT 1`, [tenantId, ADMIN_EMAIL]);
    if (!user.rows.length) {
      user = await db.query(
        `INSERT INTO users(tenant_id,email,password_hash,name,default_company_id,default_branch_id,is_active,email_verified)
         VALUES($1,$2,$3,'Ice Crest Admin',$4,$5,true,true) RETURNING id`,
        [tenantId, ADMIN_EMAIL, hash, companyId, branchId],
      );
    } else {
      await db.query(
        `UPDATE users SET name='Ice Crest Admin', default_company_id=$2, default_branch_id=$3, is_active=true, email_verified=true WHERE id=$1`,
        [user.rows[0].id, companyId, branchId],
      );
    }
    await db.query(`INSERT INTO user_roles(user_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [user.rows[0].id, roleId]);
    console.log(`Ice Crest seeded. Workspace slug: ice-crest`);
    console.log(`Login email: ${ADMIN_EMAIL}  (forgot-password mail goes here)`);
    console.log(`First-time password (new users only, not overwritten on re-seed): ${password}`);
    console.log('Platform admin can change this email or send a reset from Admin → Tenants.');
  } finally { await db.end(); }
}
run().catch(e => { console.error(e); process.exit(1); });
