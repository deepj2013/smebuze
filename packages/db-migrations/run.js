/**
 * Idempotent SQL migrations. Tracks applied files in `_schema_migrations`
 * so re-deploys skip already-applied scripts. Every .sql must still be
 * safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) — never DROP
 * live tenant data.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const migrationsDir = __dirname;
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const dbUrl =
  process.env.DATABASE_URL ||
  `postgres://${encodeURIComponent(process.env.DB_USER || 'postgres')}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'smebuze'}`;

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function psql(sql) {
  const tmp = path.join(migrationsDir, '.migrate-tmp.sql');
  fs.writeFileSync(tmp, sql);
  try {
    execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f "${tmp}"`, { stdio: 'inherit' });
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {}
  }
}

function psqlFile(filePath) {
  execSync(`psql "${dbUrl}" -v ON_ERROR_STOP=1 -f "${filePath}"`, { stdio: 'inherit' });
}

function queryScalar(sql) {
  return execSync(`psql "${dbUrl}" -t -A -c ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
  }).trim();
}

psql(`
CREATE TABLE IF NOT EXISTS _schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`);

const applied = new Set(
  queryScalar(`SELECT filename FROM _schema_migrations ORDER BY filename`)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
);

// Existing production DB without tracker: mark 001–034 applied, then run 035+ (idempotent).
const tenantsExist = queryScalar(`SELECT to_regclass('public.tenants') IS NOT NULL`);
if (tenantsExist === 't' && applied.size === 0) {
  console.log('Adopting existing database — recording migrations 001–034 as applied.');
  const values = files
    .filter((file) => {
      const num = parseInt(file.slice(0, 3), 10);
      return !Number.isNaN(num) && num <= 34;
    })
    .map((file) => `(${sqlQuote(file)})`)
    .join(',\n  ');
  if (values) {
    psql(`INSERT INTO _schema_migrations (filename) VALUES\n  ${values}\nON CONFLICT DO NOTHING;`);
  }
  for (const file of files) {
    const num = parseInt(file.slice(0, 3), 10);
    if (!Number.isNaN(num) && num <= 34) applied.add(file);
  }
}

let ran = 0;
let skipped = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log('SKIP (already applied)', file);
    skipped++;
    continue;
  }
  console.log('Running', file);
  psqlFile(path.join(migrationsDir, file));
  psql(`INSERT INTO _schema_migrations (filename) VALUES (${sqlQuote(file)}) ON CONFLICT DO NOTHING;`);
  ran++;
}

console.log(`Migrations done. applied=${ran} skipped=${skipped}`);
