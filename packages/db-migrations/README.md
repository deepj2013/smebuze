# Database migrations — SMEBUZE

PostgreSQL multi-tenant schema. Scripts are **additive and idempotent** (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`). They never `DROP` tenant tables or rewrite existing shop data.

## How they run

1. **API boot** — `SchemaMigrateService` applies any file not yet in `_schema_migrations`. Disable with `AUTO_MIGRATE=0`.
2. **Deploy / CLI** — `npm run db:migrate` (same SQL files). Safe to run twice.

Existing live databases without `_schema_migrations` record `001`–`034` as already applied, then run `035+` only.

Opt-in packs (`recipe_production`, `accounting_export`) add tables but stay **off** until universal admin lists them on the tenant. New columns default in a way that leaves current shops on their previous behaviour (own Razorpay / no mall).
