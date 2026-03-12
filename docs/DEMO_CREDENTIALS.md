# SMEBUZE — Demo user IDs, password, and local run

## Password (all demo users)

**Password: `Password123`**

---

## User IDs (email) and login behaviour

| User type       | Email                     | Tenant slug | When to use |
|----------------|---------------------------|------------|-------------|
| **Super Admin**| `superadmin@smebuzz.com`  | *(leave empty)* | Platform admin; create tenants. |
| **Tenant Admin** | `admin@demo.com`        | `demo`     | Full access in Demo Tenant. |
| **Sales Manager** | `sales@demo.com`        | `demo`     | CRM, sales, invoices, receivables, dashboard. |
| **Purchase Manager** | `purchase@demo.com`   | `demo`     | Vendors, POs, payables, record payment paid. |
| **Staff**      | `staff@demo.com`         | `demo`     | Create/view invoices, view data, reports. |
| **Viewer**     | `viewer@demo.com`        | `demo`     | Read-only; dashboard and reports. |
| **Star ICE**   | `admin@starice.sb`    | `star-ice` | First client: delivery challan + consolidated invoice. See [TENANT_STAR_ICE.md](./TENANT_STAR_ICE.md). |

- **Super Admin:** login with **no** `tenantSlug` (leave tenant slug blank on login page).
- **All others:** login **with** tenant slug = `demo` or `star-ice` (run `node scripts/seed-tenant-star-ice.js` for Star ICE).

---

## Run locally (from repo root)

### 1. Environment

```bash
cp .env.example .env
# Edit .env if needed: JWT_SECRET, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### 2. Database (PostgreSQL)

Ensure PostgreSQL is running. Create the database if it doesn’t exist:

```bash
createdb smebuzz
# or: psql -U postgres -c "CREATE DATABASE smebuzz;"
```

Then run migrations and seed permissions:

```bash
npm run db:migrate
```

(Migrations 001–004 and 005–006 must run; 007 is optional for roles. The demo seed script creates its own roles.)

### 3. Seed demo users

```bash
npm run seed:demo
```

This creates the platform org, a **Demo** tenant (slug `demo`), a company, roles, and the users above with password `Password123`. You should see:

- Super Admin: superadmin@smebuzz.com (login WITHOUT tenant slug)
- Tenant users (login WITH tenant slug: demo): admin@demo.com, sales@demo.com, purchase@demo.com, staff@demo.com, viewer@demo.com
- Password for all: Password123

### 4. Start API

```bash
npm run api:dev
```

API: **http://localhost:3000/api/v1**

### 5. Start public website (with login)

```bash
npm run website:dev
```

Website: **http://localhost:3001**  
Login page: **http://localhost:3001/login**

On the login page:

- **Super Admin:** email `superadmin@smebuzz.com`, password `Password123`, tenant slug **empty**.
- **Any other user:** same password, tenant slug = `demo`, and the email from the table above.

After login you’ll see the token and user info; use the token as `Authorization: Bearer <token>` for API calls.

---

## Quick test (curl)

**Super Admin (no tenant):**

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@smebuzz.com","password":"Password123"}' | jq
```

**Tenant user (e.g. Sales Manager):**

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@demo.com","password":"Password123","tenantSlug":"demo"}' | jq
```

You should get `access_token` and `user` in the response.
