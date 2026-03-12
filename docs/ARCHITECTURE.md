# SMEBUZE — Technical Architecture

## Overview

- **Backend**: NestJS (Node.js), TypeScript, PostgreSQL (multi-tenant), Redis, optional Elasticsearch.
- **Frontend**: Next.js (React), separate admin panel for tenant/org management.
- **AI**: Python microservice (FastAPI) for analytics/agents; optional OpenAI or open-source LLM.
- **Deployment**: Docker, Kubernetes; SaaS (AWS/Azure/GCP) + On-premise Docker bundle.

## Multi-Tenant Strategy

- **Tenant key**: Every business entity (company/branch) links to a `tenant_id`.
- **Row-level**: All main tables include `tenant_id`; queries always filter by current tenant (from JWT).
- **Schema**: Single database, tenant_id column (recommended for MVP). Optional: schema-per-tenant later.
- **Subscription**: `tenants` table holds `plan`, `license_key`, `features` (JSON array of enabled modules).
- **Uniform vs custom clients**: Tenants can use the standard product only, or a **client type** (e.g. `tenant.settings.business_type = 'restaurant_wholesale'`) to get additional gated features. Custom logic is always guarded by tenant type so the core product stays unchanged. See [TENANT_CLIENT_TYPES.md](./TENANT_CLIENT_TYPES.md).

## Auth & Access

- **JWT**: Access token includes `tenant_id`, `user_id`, `role_ids`, `permissions[]`.
- **RBAC**: Permissions table; role-permission mapping; middleware checks permission for route.
- **Org control**: Super-admin endpoints separate; only SMEBUZE org can create tenants and assign licenses.

## Service Layout

```
smebuzz/
├── apps/
│   ├── api/                 # NestJS main API
│   ├── admin/               # Next.js admin (org/tenant management)
│   └── ai-service/          # Python FastAPI AI/analytics
├── packages/
│   ├── shared-types/        # DTOs, enums, constants
│   └── db-migrations/       # SQL migrations
├── docker/
└── docs/
```

## API Design

- REST + JWT.
- Prefix: `/api/v1`.
- Tenant context: `X-Tenant-Id` header or from JWT.
- Versioning for breaking changes.

## Security

- HTTPS only, secrets in env/vault.
- Encryption at rest (DB), in transit (TLS).
- Audit log for sensitive actions (login, role change, data export).

## AI Agents

- Agents run in `ai-service`; API calls from NestJS.
- Each agent: defined prompt + tools (e.g. fetch sales, run report).
- WhatsApp: receive message → identify tenant/user → call agent → reply.

---

*Document version: 1.0*
