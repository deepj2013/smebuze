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
npm run seed:platform
npm run seed:variants
```

If the database already exists under another name, set `DB_NAME` in `.env` instead of renaming it.

Migrations are **additive only** (`IF NOT EXISTS` / nullable columns). They never DROP live data. Seeds only touch `demo` / `demo-*` / `pos-*` / platform demo logins — your live customer tenants are left alone. Existing passwords are **not** overwritten unless you set `SEED_RESET_PASSWORDS=1`.

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

**Password for all seeded users:** `Password123`

Each row is a **separate tenant** — data never mixes (CRM, stock, payroll, expenses stay inside that slug).

| User | Email | Tenant slug |
|------|--------|-------------|
| Super Admin | `superadmin@smebuzz.com` | *(leave empty / Platform admin)* |
| BDE (sales pipeline) | `bde@smebuze.local` | *(Platform admin)* |
| Marketing partner | `partner@smebuze.local` | *(Platform admin)* |
| Trading desk (main demo) | `admin@demo.com` | `demo` |
| Restaurant admin | `restaurant@smebuze.local` | `pos-restaurant` |
| Restaurant waiter | `waiter@smebuze.local` | `pos-restaurant` |
| Restaurant kitchen | `kitchen@smebuze.local` | `pos-restaurant` |
| Cafe | `cafe@smebuze.local` | `pos-cafe` |
| Sweet shop | `sweets@smebuze.local` | `pos-sweets` |
| Bakery | `bakery@smebuze.local` | `pos-bakery` |
| Garment | `garment@smebuze.local` | `pos-garment` |
| Kirana | `kirana@smebuze.local` | `pos-kirana` |
| Department store | `dept@smebuze.local` | `pos-dept` |
| Pharmacy | `pharmacy@smebuze.local` | `pos-pharmacy` |
| Hardware | `hardware@smebuze.local` | `pos-hardware` |
| Electronics | `electronics@smebuze.local` | `pos-electronics` |
| Jewellery | `jewellery@smebuze.local` | `pos-jewellery` |
| Auto parts | `autoparts@smebuze.local` | `pos-autoparts` |
| Florist | `florist@smebuze.local` | `pos-florist` |
| Stationery | `stationery@smebuze.local` | `pos-stationery` |
| Salon | `salon@smebuze.local` | `pos-salon` |
| Clinic | `clinic@smebuze.local` | `pos-clinic` |
| Services | `services@smebuze.local` | `demo-services` |
| Coaching | `coaching@smebuze.local` | `demo-coaching` |
| Hotel | `hotel@smebuze.local` | `demo-hotel` |
| Manufacturing | `mfg@smebuze.local` | `demo-mfg` |
| Transporter / fleet | `transport@smebuze.local` | `demo-transport` |
| Ice Crest (after `seed:ice-crest`) | `info@icecrest.in` | `ice-crest` |

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

After login: Dashboard, CRM, Sales (quotations / orders / invoices), Purchase, Inventory, POS (when the tenant type allows it), Accounting, Reports, **Staff & Payroll** (owner only), Organization, Admin (super admin). Ice Crest tenants also get production / stock / WhatsApp screens.

**Restaurant pitch (tenant `pos-restaurant`):** Waiter `/pos/waiter` · Kitchen `/pos/kitchen` · POS `/pos` · Restaurant admin `/pos/floor`. Super admin sees every kitchen ticket at `/admin/tickets`.

**Transporter pitch (tenant `demo-transport`):** Fleet & Trips → Vehicles (RC/insurance/fitness/permit dates), Document renewals, Trip register, print **LR**, bill one trip or **monthly party invoice** (Sales), Profit by vehicle/party. Driver salary under Staff & Payroll. Public enquiry site: `/site/demo-transport` (shop cart off — transporters quote freight, they don’t run a product cart).

**Partner pitch:** Partner login `partner@smebuze.local` → Admin → My referrals (coupon `DEMO20`, link `/signup?ref=DEMO20`). BDE login `bde@smebuze.local` → Admin → BDE pipeline.

**Shop pitch (e.g. `pos-kirana`):** Public website `/site/pos-kirana` + online shop `/shop/pos-kirana` (orders land as sales orders in that tenant only). Edit under Organization → Public website / Public catalog.

---

## 6. Ship to production

See **README.md** (branch `production` + `scripts/promote-to-production.sh`). Do not deploy from `main`.

---

## 7. Product / sales agents

| Say in Cursor | What it does |
|---------------|--------------|
| **Run the business analyst** | CEO/owner audit, pitches, sell vs build (`docs/PRODUCT_AUDIT.md`) |
| **Run the product manager** | Prioritize features & release plan |
| **Run the product owner agent** | Implement growth-platform TODOs |

Details: **`AGENTS.md`**, pitches in **`docs/SALES_PITCH_AND_SCRIPTS.md`**.