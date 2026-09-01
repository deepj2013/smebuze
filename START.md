# START.md — run SMEBUZE on your machine

Use this file for **local** setup. For git branches and Hostinger deploy, use **[README.md](README.md)**.

- **`main`** — develop here
- **`production`** — live site; do not use this branch for daily coding

Work from the **repo root**.

---

## 1. One-time setup

```bash
cp .env.example .env
# set JWT_SECRET and DB_PASSWORD (and DB_* if Postgres is not local defaults)

createdb smebuze
npm run db:migrate
npm run seed:demo
```

If the database already exists under another name, set `DB_NAME` in `.env` instead of renaming it.

Optional Ice Crest tenant (login slug `ice-crest`, email `info@icecrest.in`):

```bash
npm run seed:ice-crest
```

OTP / welcome mail uses Hostinger SMTP from `.env` (`MAIL_USER` / `MAIL_PASS`). Quote `MAIL_PASS` if it contains `#`.

---

## 2. Start (every time)

**Terminal 1 — API**

```bash
npm run api:dev
```

API: http://localhost:3000/api/v1  
Health: http://localhost:3000/api/v1/health

**Terminal 2 — website**

```bash
npm run website:dev
```

App: http://localhost:3001  
Login: http://localhost:3001/login  

Without `apps/website/.env.local`, the website calls `http://localhost:3000`. To point the UI at production API instead:

```
NEXT_PUBLIC_API_URL=https://api.smebuze.com
```

---

## 3. Demo logins

**Password for seeded users:** `Password123`

| User | Email | Tenant slug |
|------|--------|-------------|
| Super Admin | `superadmin@smebuzz.com` | *(leave empty)* |
| Tenant Admin | `admin@demo.com` | `demo` |
| Sales Manager | `sales@demo.com` | `demo` |
| Purchase Manager | `purchase@demo.com` | `demo` |
| Staff | `staff@demo.com` | `demo` |
| Viewer | `viewer@demo.com` | `demo` |
| Ice Crest (after seed) | `info@icecrest.in` | `ice-crest` |

New signups must verify email (OTP) before login.

---

## 4. Quick API check

```bash
curl -sS -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Password123","tenantSlug":"demo"}'
```

You should get `access_token`. If you see `EMAIL_NOT_VERIFIED`, open `/verify-email` or use Super Admin (seeded verified).

---

## 5. What you get in the app

After login: Dashboard, CRM, Sales (quotations / orders / invoices), Purchase, Inventory, POS (when the tenant type allows it), Accounting, Reports, Organization, Admin (super admin). Ice Crest tenants also get production / stock / WhatsApp screens.

---

## 6. Ship to production

See **README.md** (branch `production` + `scripts/promote-to-production.sh`). Do not deploy from `main`.
