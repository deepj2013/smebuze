# Restaurant / Wholesale tenant

This document describes the **tenant seed** and **optional schema** for a specific business type: one company that receives stock (e.g. by truck) into a warehouse and sells to **restaurants** and **retail buyers**. Orders are taken via WhatsApp, call, or other channels; requirements are registered; delivery is done with **client approval** (delivery challan); and a **consolidated monthly invoice** is generated from delivery challans. No changes are made to the default product—this flow is **gated by tenant** so only this tenant sees the extra behaviour.

## Business flow (for this tenant)

1. **Stock** – Truck delivers stock (e.g. 2 tonnes) → received into warehouse. Stock is tracked (in use, pending).
2. **Requirements** – Restaurants/retail place orders (WhatsApp, call, etc.). Requirements are registered (e.g. as sales orders or delivery entries).
3. **Delivery** – On delivery, client approval is taken → **delivery challan**. Optionally upload **signed challan image** (signature) for proof.
4. **Pricing** – Items have one MRP; **per-customer price** can be set at delivery/requirement (e.g. different rate per restaurant).
5. **Invoicing** – **Consolidated invoice** per customer per month from multiple delivery challans.
6. **Reports** – Daily: requirement vs delivery, stock vs sold, invoice vs payment (partial/full).

## Tenant seed

- **Script:** `scripts/seed-tenant-restaurant-wholesale.js`
- **Run after:** Migrations 001–020 and 004 (permissions).
- **Usage:**  
  `DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-tenant-restaurant-wholesale.js`

**Login:**

- **Tenant slug:** `restaurant-wholesale`
- **Password (all users):** `Password123`

**Users:**

| Email | Name | Role |
|-------|------|------|
| admin@restaurant-wholesale.demo | Admin | Tenant Admin |
| sales@restaurant-wholesale.demo | Sales / Order Entry | Sales Manager |
| delivery@restaurant-wholesale.demo | Delivery / Staff | Staff |
| viewer@restaurant-wholesale.demo | Viewer | Viewer |

The seed creates:

- One tenant with `settings.business_type = 'restaurant_wholesale'`
- One company, one branch, one warehouse
- Four users (admin, sales, delivery/staff, viewer) with separate logins
- Sample items (e.g. Rice, Flour, Oil, Sugar – in kg/L)
- Sample stock (e.g. truck receipt)
- Four sample customers (restaurants/retail)

## Gating (no impact on other tenants)

- **Backend:** Use `tenant.settings.business_type === 'restaurant_wholesale'` to enable:
  - Delivery challan **lines** with per-customer **unit_price**
  - **Signed challan image** upload (`delivery_challans.signed_challan_image_url`)
  - **Consolidated invoice** from multiple delivery challans (`invoice_delivery_challans` table)
  - Reports: requirement vs delivery, stock vs sold, invoice vs payment
- **Frontend:** After login, call `GET /api/v1/auth/me`. Response includes `tenant: { slug, settings }`. When `tenant?.settings?.business_type === 'restaurant_wholesale'`, show:
  - Delivery challan form with line-level price and signed image upload
  - “Consolidated invoice from challans” action
  - Daily report (requirement vs delivery, stock vs sold, invoice vs payment)

Other tenants never get `business_type: 'restaurant_wholesale'`, so existing behaviour stays unchanged.

## Schema (migration 020)

All additive; existing tables and flows unchanged.

- **delivery_challans.signed_challan_image_url** (nullable) – URL of uploaded signed challan image.
- **delivery_challan_lines** – Lines per challan: item, quantity, **unit_price** (for per-customer pricing).
- **invoice_delivery_challans** – Links an invoice to one or more delivery challans (consolidated invoice).

## Future implementation notes

- **Delivery challan:** PATCH to set `signed_challan_image_url`; create/update `delivery_challan_lines` with `unit_price` when tenant is restaurant_wholesale.
- **Consolidated invoice:** New endpoint (e.g. POST “create invoice from challans”) that creates one invoice from selected delivery challans for a customer/month and inserts `invoice_delivery_challans`.
- **Reports:** New report endpoints or query params that return requirement vs delivery, stock vs sold, invoice vs payment; restrict or label by tenant so only restaurant_wholesale uses them if desired.

Users of this tenant log in with their **user id and password** and work only within their tenant; they are isolated from other tenants and the rest of the product is unchanged.
