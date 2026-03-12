# SMEBUZE — Modular AI-Powered ERP for MSME

Configure only what you need. WhatsApp-first, multi-tenant ERP for manufacturing, trading, and services — India & Global Bharat.

## Repo structure

- **apps/api** — NestJS backend (auth, tenants, CRM, sales, purchase, inventory, accounting, reports, bulk upload, integrations)
- **apps/website** — Next.js public marketing site (pricing, how it works, features)
- **packages/db-migrations** — PostgreSQL migrations and seed (tenant, org, permissions)

**Pick tasks to build all features:** Open [docs/TODO.md](docs/TODO.md) → **Work queue — do one by one**. Start at **task #1** and do them in order; mark each `[x]` when done. For runnable setup see [START.md](START.md).

## Quick start

### 1. Environment

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET, DB_* if needed
```

### 2. Database

PostgreSQL 14+ required. Run migrations:

```bash
# Option A: using psql (set DATABASE_URL or DB_* in .env)
npm run db:migrate

# Option B: run SQL files manually in order
# 001_tenant_org_auth.sql, 002_crm_sales_purchase.sql, 003_inventory_accounting.sql, 004_seed_permissions.sql
```

### 3. API

```bash
npm run api:dev
# API: http://localhost:3000/api/v1
```

### 4. Public website

```bash
npm run website:dev
# Website: http://localhost:3001
```

### 5. Docker (API + Postgres)

```bash
docker-compose up -d
# API: http://localhost:3000
# Postgres: localhost:5432 (postgres/postgres/smebuze)
```

## API overview

- **POST /api/v1/auth/login** — Login (body: `email`, `password`, optional `tenantSlug`)
- **POST /api/v1/auth/signup** — Sign up new organisation (body: `orgName`, `slug`, `email`, `password`, optional `name`, `phone`, `plan`, `interval`, optional `trial`); returns `access_token`, `user`, `tenant`
- **POST /api/v1/auth/register** — Join existing tenant (body: `email`, `password`, `tenantSlug`, optional `name`, `phone`)
- **POST /api/v1/auth/forgot-password** — Request password reset (body: `email`, optional `tenantSlug`); in dev returns `resetLink`
- **POST /api/v1/auth/reset-password** — Set new password (body: `token`, `newPassword`)
- **POST /api/v1/auth/me** — Current user (Bearer JWT)
- **Tenants** — Super-admin: create/list tenants
- **Organization** — Companies, branches (tenant-scoped)
- **CRM** — Leads, customers
- **Sales** — Create invoice (with HSN/GST line items), list/pending, record payment, **print (thermal)** `GET /sales/invoices/:id/print`
- **Purchase** — Vendors, purchase orders
- **Inventory** — Warehouses, items, stock
- **Accounting** — Chart of accounts, journal entries
- **Reports** — **Dashboard** with pending payments, total invoiced/paid, pending count
- **Bulk upload** — Customers/items upload stubs
- **Integrations** — WhatsApp webhook stub (public)

**Demo flow (vendor → item → invoice → pending → dashboard → print):** see [docs/DEMO_FLOW.md](docs/DEMO_FLOW.md).  
**Vendor as seller + buyer, payment paid & received:** [docs/USER_TYPES.md](docs/USER_TYPES.md). **User types:** same doc; seed roles with `007_seed_example_roles.sql` (set your tenant ID).

**Run locally and log in as all user types:** [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md) — user IDs, password (`Password123`), and steps. After `npm run db:migrate` and `npm run seed:demo`, start API and website; open **http://localhost:3001/login** to sign in (Super Admin: leave tenant empty; others: tenant = `demo`).

All tenant-scoped endpoints require JWT with tenant context. Use `RequirePermissions(...)` for RBAC.

## Production readiness

- Use strong **JWT_SECRET** and **DB** credentials
- Set **NODE_ENV=production**
- Run migrations before deploying; avoid `synchronize: true` in production
- Configure CORS via **CORS_ORIGIN**
- Add rate limiting, HTTPS, and backup strategy as needed

## Docs

- [PRD](docs/PRD.md) — Product requirements and access model
- [Architecture](docs/ARCHITECTURE.md) — Tech stack and multi-tenant design
- [Features](docs/FEATURES.md) — 80+ feature list
- [Status](docs/STATUS.md) — Build status and remaining work
- [**TODO**](docs/TODO.md) — **Single checklist** (roadmap, onboarding, optional backlog)
- [Gap analysis & USP](docs/GAP_ANALYSIS_AND_USP.md) — Gaps vs vision and suggested USPs
- [**Product & market analysis**](docs/PRODUCT_AND_MARKET_ANALYSIS.md) — What’s done vs missing, modules to add, roadmap (product owner view)
