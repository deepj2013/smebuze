/**
 * Platform demo users for pitch: Super Admin (ensure), BDE, marketing partner.
 * NEVER touches live customer tenants — only platform users + demo partner/leads.
 *
 * Safe for production:
 *  - Creates missing demo platform accounts only
 *  - Does NOT reset passwords unless SEED_RESET_PASSWORDS=1
 *  - Does NOT UPDATE any tenant with slug outside demo allowlist
 *
 * Usage: npm run seed:platform
 * Password for NEW users: Password123
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

(function loadEnv() {
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
})();

const DEMO_PASSWORD = 'Password123';
const RESET = process.env.SEED_RESET_PASSWORDS === '1' || process.env.SEED_RESET_PASSWORDS === 'true';

async function ensurePlatformUser(client, hash, { email, name, platformRole, isSuperAdmin }) {
  const existing = await client.query(
    `SELECT id, password_hash FROM users WHERE lower(email) = lower($1) AND tenant_id IS NULL LIMIT 1`,
    [email],
  );
  if (!existing.rows.length) {
    const r = await client.query(
      `INSERT INTO users (
         tenant_id, email, password_hash, name, is_super_admin, platform_role,
         is_active, email_verified
       ) VALUES (NULL, $1, $2, $3, $4, $5, true, true)
       RETURNING id`,
      [email, hash, name, Boolean(isSuperAdmin), platformRole || null],
    );
    console.log(`  + created ${email} (${platformRole || 'super_admin'})`);
    return r.rows[0].id;
  }
  const id = existing.rows[0].id;
  if (RESET) {
    await client.query(
      `UPDATE users SET password_hash = $2, name = $3, is_super_admin = $4,
         platform_role = $5, is_active = true, email_verified = true
       WHERE id = $1`,
      [id, hash, name, Boolean(isSuperAdmin), platformRole || null],
    );
    console.log(`  ~ reset password ${email}`);
  } else {
    await client.query(
      `UPDATE users SET name = COALESCE(name, $2),
         is_super_admin = CASE WHEN $3 THEN true ELSE is_super_admin END,
         platform_role = COALESCE(platform_role, $4),
         is_active = true, email_verified = true
       WHERE id = $1`,
      [id, name, Boolean(isSuperAdmin), platformRole || null],
    );
    console.log(`  = left password unchanged ${email}`);
  }
  return id;
}

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'smebuze',
  });
  await client.connect();

  try {
    const col = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'platform_role'`,
    );
    if (!col.rows.length) {
      console.error('platform_role column missing — run npm run db:migrate first');
      process.exit(1);
    }
    const partnersTable = await client.query(`SELECT to_regclass('public.platform_partners') AS t`);
    if (!partnersTable.rows[0]?.t) {
      console.error('platform_partners missing — run npm run db:migrate first');
      process.exit(1);
    }

    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    console.log('Platform demo users (live tenants untouched):');

    await ensurePlatformUser(client, hash, {
      email: 'superadmin@smebuzz.com',
      name: 'Super Admin',
      isSuperAdmin: true,
      platformRole: null,
    });

    const bdeId = await ensurePlatformUser(client, hash, {
      email: 'bde@smebuze.local',
      name: 'Demo BDE',
      isSuperAdmin: false,
      platformRole: 'bde',
    });

    const partnerUserId = await ensurePlatformUser(client, hash, {
      email: 'partner@smebuze.local',
      name: 'Demo Agency',
      isSuperAdmin: false,
      platformRole: 'partner',
    });

    let partner = await client.query(`SELECT id, code FROM platform_partners WHERE code = 'DEMO20' LIMIT 1`);
    if (!partner.rows.length) {
      partner = await client.query(
        `INSERT INTO platform_partners
           (name, code, contact_name, contact_email, commission_percent, status, user_id, notes)
         VALUES
           ('Demo Marketing Agency', 'DEMO20', 'Demo Agency', 'partner@smebuze.local', 20, 'active', $1,
            'Pitch-only partner. Safe to leave on production.')
         RETURNING id, code`,
        [partnerUserId],
      );
      console.log('  + partner DEMO20 + referral /signup?ref=DEMO20');
    } else {
      await client.query(
        `UPDATE platform_partners SET user_id = COALESCE(user_id, $2), status = 'active' WHERE id = $1`,
        [partner.rows[0].id, partnerUserId],
      );
      console.log('  = partner DEMO20 already present');
    }

    const leadExists = await client.query(
      `SELECT 1 FROM bde_leads WHERE owner_user_id = $1 AND company_name = $2 LIMIT 1`,
      [bdeId, 'Sample Prospect Pvt Ltd'],
    );
    if (!leadExists.rows.length) {
      await client.query(
        `INSERT INTO bde_leads
           (owner_user_id, company_name, contact_name, contact_phone, status,
            estimated_price_rupees, plan, billing_interval, notes, source)
         VALUES
           ($1, 'Sample Prospect Pvt Ltd', 'Ravi', '+919999000111', 'demo',
            15588, 'basic', 'quarterly', 'Pitch sample — not a live customer', 'outbound')`,
        [bdeId],
      );
      console.log('  + sample BDE lead');
    }

    console.log('\nDone. Login (Platform admin checkbox / empty tenant slug):');
    console.log('  superadmin@smebuzz.com  (universal admin)');
    console.log('  bde@smebuze.local         (BDE pipeline)');
    console.log('  partner@smebuze.local     (partner portal)');
    if (!RESET) {
      console.log('Passwords for existing users were NOT changed. New users: Password123');
      console.log('To force-reset demo platform passwords: SEED_RESET_PASSWORDS=1 npm run seed:platform');
    } else {
      console.log('Passwords reset to Password123 (SEED_RESET_PASSWORDS=1)');
    }
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
