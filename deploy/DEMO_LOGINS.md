# Production demo logins & public URLs

**App login:** `https://smebuze.com/login` (or your live site URL)

**Default demo password:** `Password123` for almost all seeded demos.

**Invoice Lite demo password:** `Invoice@123`

**Super admin (no workspace slug):**

| Email | Password | Notes |
|-------|----------|--------|
| `superadmin@smebuzz.com` | `Password123` if seeded; otherwise your live password | Universal admin — Tenants, Licences, Marketplace |

Platform pitch users (no tenant): `bde@smebuze.local`, `partner@smebuze.local` — `Password123` when created by `npm run seed:platform`.

---

## How to log in as a tenant

1. Open login → enter **workspace slug** + **email** + **password**.
2. Demos use slug in the first column below.

---

## Business-type demos (`seed:variants` — all `Password123`)

| Slug | Business type | Admin email |
|------|----------------|-------------|
| `pos-restaurant` | dine_restaurant | `restaurant@smebuze.local` |
| `pos-sweets` | sweet_shop | `sweets@smebuze.local` |
| `pos-garment` | garment_shop | `garment@smebuze.local` |
| `pos-kirana` | retail_shop | `kirana@smebuze.local` |
| `pos-dept` | department_store | `dept@smebuze.local` |
| `demo-services` | services | `services@smebuze.local` |
| `pos-cafe` | cafe | `cafe@smebuze.local` |
| `pos-bakery` | bakery | `bakery@smebuze.local` |
| `pos-pharmacy` | pharmacy | `pharmacy@smebuze.local` |
| `pos-hardware` | hardware_shop | `hardware@smebuze.local` |
| `pos-electronics` | electronics_shop | `electronics@smebuze.local` |
| `pos-jewellery` | jewellery_shop | `jewellery@smebuze.local` |
| `pos-autoparts` | auto_parts | `autoparts@smebuze.local` |
| `pos-florist` | florist | `florist@smebuze.local` |
| `pos-stationery` | stationery_shop | `stationery@smebuze.local` |
| `pos-salon` | salon | `salon@smebuze.local` |
| `pos-clinic` | clinic | `clinic@smebuze.local` |
| `demo-coaching` | coaching | `coaching@smebuze.local` |
| `demo-hotel` | hotel | `hotel@smebuze.local` |
| `demo-mfg` | manufacturing | `mfg@smebuze.local` |
| `demo-transport` | transport | `transport@smebuze.local` |

Restaurant/cafe floor demos also create waiter/kitchen users (see seed log on VPS).

---

## Other seeded demos

| Slug | Type | Login | Password |
|------|------|--------|----------|
| `demo` | Full ERP trading | `admin@demo.com` (+ sales, purchase, staff, viewer @demo.com) | `Password123` |
| `demo-invoice` | invoicing_lite | `admin@demo-invoice.demo` | `Invoice@123` |
| `demo-b2b-garments` | b2b | `admin@demo-b2b-garments.demo`, `sales@…`, `staff@…` | `Password123` |
| `ice-crest` | ice_crest | `info@icecrest.in` | `Password123` |
| `star-ice` | ice wholesale | `admin@starice.sb`, `sales@starice.sb`, … | `Password123` |
| `restaurant-wholesale` | HORECA B2B | `admin@restaurant-wholesale.demo`, … | `Password123` |
| `ameera-it` | services desk | `admin@ameera-it.com`, … | `Password123` (only if you ran `seed:ameera`) |
| `sagar-general-store` | department_store | `admin@sagargeneral.store` | `Password123` (only if you ran `seed:sagar-catalog`) |

**Live customer tenants** (real slugs) are **not** overwritten by seeds unless you use `SEED_RESET_PASSWORDS=1`.

---

## Public URLs (replace host with `https://smebuze.com`)

| What | URL pattern |
|------|-------------|
| **SMEBUZE Mall** (multi-shop marketplace) | `/mall` |
| **Mall order tracking** | `/mall/orders/{token}` |
| **Tenant public website** | `/site/{slug}` |
| **Tenant online shop** | `/shop/{slug}` |
| **Signup** | `/join` |

Examples:

- Mall: `https://smebuze.com/mall`
- Kirana shop: `https://smebuze.com/shop/pos-kirana`
- Transport enquiry site: `https://smebuze.com/site/demo-transport`
- Invoice lite demo site: `https://smebuze.com/site/demo-invoice`

Shops must **publish** website/shop and **list items** (Organization → Public website / Online commerce) for mall and catalog to show stock.

---

## Seed on production (one-time after deploy)

Deploy **does not** run seeds automatically. SSH once:

```bash
cd /var/www/smebuze
bash scripts/seed-on-vps.sh
# Invoice lite only:
npm run seed:invoice-lite
```

---

## Super admin: billing & renewals

| Task | Where |
|------|--------|
| All workspaces, expired, expiring | **Admin → Dashboard** or **Admin → Licences** |
| Record cash/UPI/cheque payment | Licences → **Record payment** |
| +1 month / activate trial | Licences → **+1 month** or **Activate** |
| Set exact end date | **Admin → Tenants** → edit subscription |
| Email renewal | Licences → **Remind** |
| Create tenant / reset password | **Admin → Tenants** |

Mark real clients: Tenants → **Account kind** = `real` (auto-detects demo slugs).
