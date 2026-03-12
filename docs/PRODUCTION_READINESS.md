# SMEBUZE — Production readiness checklist

## What is working (MVP-ready for demo / early production)

| Area | Status | Notes |
|------|--------|--------|
| **API** | OK | NestJS, multi-tenant, JWT, RBAC, all core modules (auth, tenant, org, CRM, sales, purchase, inventory, accounting, reports) |
| **Auth** | OK | Login, register, JWT with tenant + permissions, Super Admin + tenant users |
| **Sales** | OK | Create invoice (customer or vendor as buyer), line items with HSN/GST, payment received, pending, thermal print |
| **Purchase** | OK | Vendors, POs, payment paid, payables |
| **Dashboard** | OK | Receivables + payables, summary counts |
| **DB** | OK | Migrations 001–006, seed (permissions, demo users), TypeORM entities with explicit varchar/jsonb types |
| **Docker** | OK | API + Postgres; use for staging/single-tenant deploy |
| **Public site** | OK | Marketing pages + login; CORS and env for API URL |
| **User types** | OK | Super Admin, Tenant Admin, Sales/Purchase Manager, Staff, Viewer; roles and permissions documented and seedable |

So for a **controlled demo or early production** (single region, known tenants, no heavy compliance yet), the stack is in good shape.

---

## Before going to full production

- **Environment**
  - Set strong `JWT_SECRET` (e.g. 32+ random bytes); never use default.
  - Set `NODE_ENV=production`.
  - Set `CORS_ORIGIN` to your real front-end origin(s), not `*`.
  - Use a secrets manager or vault for DB password and JWT secret.

- **Database**
  - Run all migrations (001–006) and seed (004, demo seed if needed); do **not** rely on TypeORM `synchronize: true` in production.
  - Use a managed Postgres (RDS, Cloud SQL, etc.) with backups and point-in-time recovery.
  - Plan for connection pooling (e.g. PgBouncer) if you scale.

- **Security**
  - Add rate limiting (e.g. on login and public endpoints).
  - Ensure all sensitive routes use HTTPS and require JWT (no accidental `@Public()`).
  - Implement audit logging for sensitive actions (login, role change, data export) and retain logs.

- **Validation**
  - Use DTOs and `ValidationPipe` on all endpoints; replace any loose `Record<string, unknown>` body with proper DTOs where needed.

- **Monitoring**
  - Health check endpoint (e.g. `/api/v1/health`) that checks DB connectivity.
  - Logging (structured JSON in production) and error tracking (e.g. Sentry).
  - Optional: APM for API latency and errors.

- **Not yet implemented (for later)**
  - License key validation and feature flags per tenant.
  - Full bulk upload (CSV parse, validation, duplicate handling).
  - AI agents and WhatsApp Business API integration.
  - Tenant admin UI (user/role management) and full ERP UI (beyond marketing + login).
  - Automated tests (unit, integration, e2e).

---

## Summary

- **Core flows:** Production-ready for a controlled / early production setup (auth, tenant, org, CRM, sales, purchase, inventory, accounting, dashboard, payment paid/received, vendor as buyer, invoice print).
- **Full production:** Add the items above (secrets, DB, CORS, rate limiting, audit, validation, monitoring, health check) and complete the “not yet implemented” items as you scale.

All TypeORM entities have been updated with explicit `type: 'varchar'` or `type: 'jsonb'` where needed so the API starts reliably against Postgres.
