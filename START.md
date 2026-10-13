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

**Password for every row below:** `Password123`

Several people can share one tenant slug. Stock, bills, CRM, payroll, and expenses stay inside that slug and never mix with another row’s slug. Leave the slug empty for the three platform logins.

| User | Email | Tenant type | Tenant slug |
|------|--------|-------------|-------------|
| Super Admin | `superadmin@smebuzz.com` | Platform admin | *(leave empty)* |
| BDE (sales pipeline) | `bde@smebuze.local` | Platform admin | *(leave empty)* |
| Marketing partner | `partner@smebuze.local` | Platform admin | *(leave empty)* |
| Trading desk — admin | `admin@demo.com` | Trading / wholesale | `demo` |
| Trading desk — sales | `sales@demo.com` | Trading / wholesale | `demo` |
| Trading desk — purchase | `purchase@demo.com` | Trading / wholesale | `demo` |
| Trading desk — staff | `staff@demo.com` | Trading / wholesale | `demo` |
| Trading desk — viewer | `viewer@demo.com` | Trading / wholesale | `demo` |
| Restaurant admin | `restaurant@smebuze.local` | Dine-in restaurant | `pos-restaurant` |
| Restaurant waiter | `waiter@smebuze.local` | Dine-in restaurant | `pos-restaurant` |
| Restaurant kitchen | `kitchen@smebuze.local` | Dine-in restaurant | `pos-restaurant` |
| Cafe admin | `cafe@smebuze.local` | Cafe / QSR | `pos-cafe` |
| Cafe waiter | `cafe-waiter@smebuze.local` | Cafe / QSR | `pos-cafe` |
| Cafe kitchen | `cafe-kitchen@smebuze.local` | Cafe / QSR | `pos-cafe` |
| Sweet shop | `sweets@smebuze.local` | Sweet shop | `pos-sweets` |
| Bakery | `bakery@smebuze.local` | Bakery | `pos-bakery` |
| Garment | `garment@smebuze.local` | Garment shop | `pos-garment` |
| Kirana | `kirana@smebuze.local` | Kirana / single store | `pos-kirana` |
| Department store (demo) | `dept@smebuze.local` | Department store | `pos-dept` |
| Pharmacy | `pharmacy@smebuze.local` | Pharmacy / medical store | `pos-pharmacy` |
| Hardware | `hardware@smebuze.local` | Hardware / sanitary | `pos-hardware` |
| Electronics | `electronics@smebuze.local` | Electronics / mobiles | `pos-electronics` |
| Jewellery | `jewellery@smebuze.local` | Jewellery shop | `pos-jewellery` |
| Auto parts | `autoparts@smebuze.local` | Auto parts | `pos-autoparts` |
| Florist | `florist@smebuze.local` | Florist / gifts | `pos-florist` |
| Stationery | `stationery@smebuze.local` | Stationery / books | `pos-stationery` |
| Salon | `salon@smebuze.local` | Salon / spa | `pos-salon` |
| Clinic | `clinic@smebuze.local` | Clinic / diagnostic | `pos-clinic` |
| Services | `services@smebuze.local` | Services / general | `demo-services` |
| Coaching | `coaching@smebuze.local` | Coaching / tuition | `demo-coaching` |
| Hotel | `hotel@smebuze.local` | Hotel / lodging | `demo-hotel` |
| Manufacturing | `mfg@smebuze.local` | Manufacturing / job work | `demo-mfg` |
| Transporter / fleet | `transport@smebuze.local` | Transporter / fleet | `demo-transport` |
| Ice Crest (after `seed:ice-crest`) | `info@icecrest.in` | Ice factory | `ice-crest` |
| Sagar General Store (created by migration) | `admin@sagargeneral.store` | Department store | `sagar-general-store` |

`pos-restaurant` and `pos-cafe` each have an admin, a waiter, and a kitchen login. `demo` has admin, sales, purchase, staff, and viewer. Every other slug in this table has one login.

Sagar is a real shop workspace, not a demo seed. The migration creates it once. Ice Crest appears only after `npm run seed:ice-crest`.

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