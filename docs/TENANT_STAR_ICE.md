# Star ICE — First client

Star ICE is the first production client. Their workflow matches the **delivery challan** and **consolidated monthly invoice** format.

---

## Logins (this client only)

| Role | Email | Tenant slug | Password | Use for |
|------|--------|-------------|----------|---------|
| **Admin** | `admin@starice.sb` | `star-ice` | `Password123` | Full access: company, users, all modules. |
| **Sales / Order entry** | `sales@starice.sb` | `star-ice` | `Password123` | Customers, orders, delivery challans, invoices, reports. |
| **Delivery / Staff** | `delivery@starice.sb` | `star-ice` | `Password123` | Customers, create/view invoices, delivery challans, items, stock, reports. |
| **Viewer** | `viewer@starice.sb` | `star-ice` | `Password123` | Read-only: customers, orders, invoices, items, stock, reports. |

- **Login URL:** e.g. `http://localhost:3001/login` (or your website URL).
- **Tenant slug:** must be **`star-ice`** (not `demo`). Same for all four users above.

---

## Menu (Star ICE only)

For **tenant slug = star-ice**, the app shows a reduced menu:

- **Hidden:** Setup, HR, Accounting, Service, Bulk upload, Admin → Tenants.
- **CRM:** Only **Customers** and **Follow-up board** (Leads, Pipeline, Campaigns hidden).
- **Sales:** **Requirement** (first) → **Delivery entry** → **Invoices** → **Consolidate bill** → **Payment** → Delivery challans.
- **Purchase:** Vendors → **Vendor invoices** → Payables.
- **Inventory:** Items, Stock (Warehouses and Stock transfers hidden).
- **Organization:** Companies, Users, Roles (for admin).
- **Reports:** Yes.

---

## Menu options to show (by role)

What each role sees in the app sidebar (permissions from seed):

| Role | Dashboard | CRM | Sales | Purchase | Inventory | Accounting | Reports | Org |
|------|-----------|-----|-------|----------|-----------|------------|---------|-----|
| **Admin** | Yes | Leads, Customers, Pipeline, Follow-up, Campaigns | Invoices, Pending receivables, Quotations, **Sales orders**, **Delivery challans**, Credit notes, Recurring invoices | Vendors, Orders, GRNs, Debit notes, Payables | Items, Warehouses, Stock, Stock transfers | COA, Journal, Bank recon | Yes | Companies, Users, Roles, Depts |
| **Sales** | Yes | Leads, Customers, Pipeline, Follow-up, Campaigns | Invoices, Pending receivables, Quotations, **Sales orders**, **Delivery challans**, Credit notes, Recurring invoices | — | — | — | Yes | — |
| **Delivery/Staff** | Yes | Customers only | Invoices, **Delivery challans** (create/view) | — | Items, Stock | — | Yes | — |
| **Viewer** | Yes | Customers | Invoices, Orders, **Delivery challans** (view) | — | Items, Stock | — | Yes | — |

**Star ICE–specific flows (what to use):**

1. **Customers** – Restaurants/hotels (Izumi, JUNOBO etc.). Add more under CRM → Customers.
2. **Sales orders** – Register requirements (e.g. order from WhatsApp/call). Sales → Sales orders.
3. **Delivery challans** – One per delivery: customer, date, challan no., **line items with Qty + Rate** (per-customer price), optional **signed challan image** URL. Sales → Delivery challans → Create / Edit (PATCH with `lines`, `signed_challan_image_url`).
4. **Invoices** – Normal invoices under Sales → Invoices. **Consolidated monthly invoice:** use API `POST /api/v1/sales/invoices/from-challans` with `customer_id`, `challan_ids[]`, `invoice_date` (e.g. month-end). A dedicated “Create from challans” button/page can call this.
5. **Items & Stock** – Ice products and warehouse stock. Inventory → Items, Stock.
6. **Reports** – Under **Reports** you get:
   - **Requirement vs delivery** – Orders/requirements with line-level required, delivered, and pending quantities (optional date range and customer filter). CSV export.
   - **Stock vs delivery** – Item-wise stock on hand vs quantity delivered in the selected period. CSV export.
   - **Delivery vs invoiced** – List of delivery challans with invoiced (yes/no) and invoice number. Optional date range and customer. CSV export.
   - **Invoice vs payment** – Customer-wise total invoiced, received, and pending. Optional customer filter. CSV export.
   - Plus existing: Sales summary, GST, Item-wise sales, Ageing, P&L, Balance sheet, etc.

Admin also sees **Setup** (onboarding) and **Organization** (companies, users, roles). Only super admin (no tenant) sees **Admin → Tenants**.

---

## Business flow

1. **Delivery challan** – Per delivery: customer, date, challan number, line items (PARTICULARS, HSN CODE, QTY, RATE, AMOUNT), TOTAL, CGST, SGST, GRAND TOTAL. Client approval/signature; optional upload of signed challan image.
2. **Per-customer pricing** – Rate can differ per customer (e.g. different rate for Izumi vs SOHO HOUSE); set at delivery/requirement entry.
3. **Consolidated monthly invoice** – At month-end, select delivery challans for a customer and generate one invoice: table of deliveries (Date, Challan no., quantities by product, Total Kg, Amount), then totals, SGST/CGST, Grand Total, and company bank details for payment.

## Tenant seed

- **Script:** `scripts/seed-tenant-star-ice.js`
- **Run after:** Migrations 001–021 and 004 (permissions). Migration 021 adds `companies.bank_details` for invoice print.
- **Usage:**  
  `DB_HOST=localhost DB_USER=postgres DB_PASSWORD=postgres DB_NAME=smebuzz node scripts/seed-tenant-star-ice.js`

**Login:**

- **Tenant slug:** `star-ice`
- **Password (all users):** `Password123`

**Users:**

| Email | Role |
|-------|------|
| admin@starice.sb | Tenant Admin |
| sales@starice.sb | Sales / Order Entry |
| delivery@starice.sb | Delivery / Staff |
| viewer@starice.sb | Viewer |

**Seed creates:**

- **Company:** STAR ICE – Bandra address, GSTIN 27AGUP5591QIZG, bank details (Axis Bank, account, IFSC) for invoice.
- **Items:** 9 ice products as per their challan: 10/KG ICE PORTABLE, TUBE ICE NON PORTABLE, BLOCK ICE, TUBE ICE MASTER PACK 1KG, CLASSIC SQUARE, HIGH BALL, CRYSTAL BALL, TRAY ICE, DRY ICE (HSN 22019010 / 28112110).
- **Customers:** Izumi, JUNOBO HOTELS PVT LTD (SOHO HOUSE).
- **Users:** 4 (admin, sales, delivery, viewer).

## API (Star ICE / restaurant_wholesale flow)

- **GET** `/api/v1/sales/delivery-challans` – List challans (optional `?status=...`).
- **GET** `/api/v1/sales/delivery-challans/:id` – Single challan with **lines** and **lines.item** (for HSN, name). Use for challan print (PARTICULARS, HSN, QTY, RATE, AMOUNT).
- **POST** `/api/v1/sales/delivery-challans` – Create challan (company_id, customer_id, challan_date, number optional).
- **PATCH** `/api/v1/sales/delivery-challans/:id` – Update challan:
  - `status` – e.g. `delivered`
  - `signed_challan_image_url` – URL of uploaded signed challan image
  - `lines` – array of `{ item_id?, description?, quantity, unit?, unit_price, sort_order? }`. Replaces all lines. Use for per-customer rate at delivery.
- **POST** `/api/v1/sales/invoices/from-challans` – **Consolidated invoice from challans.**  
  Body: `{ company_id, branch_id?, customer_id, challan_ids: string[], invoice_date, due_date?, number? }`.  
  Creates one invoice, links challans via `invoice_delivery_challans`, aggregates line items by item (qty sum, rate from challan lines), applies 2.5% CGST + 2.5% SGST, sets totals. All selected challans must belong to the same customer and must not already be linked to an invoice.

## Print / PDF (to implement in frontend)

- **Delivery challan:** Header (STAR ICE, address, GSTIN, date, Challan no., Customer). Table: PARTICULARS, HSN CODE, QTY, RATE, AMOUNT. Total, CGST, SGST, Grand Total. “For STAR ICE” + signature / signed image.
- **Consolidated invoice:** Vendor (company with bank_details), client (customer), Invoice no., date. Table: one row per linked challan (Date, Challan no., quantities by product type, Total Kg, Amount). Totals, SGST/CGST, Grand Total. Bank details. “For STAR ICE Authorised Signatory”.

## Client type

Star ICE uses `tenant.settings.business_type = 'restaurant_wholesale'` so they get delivery challan lines, signed image, and consolidated invoice from challans. Same gating as in [TENANT_RESTAURANT_WHOLESALE.md](./TENANT_RESTAURANT_WHOLESALE.md) and [TENANT_CLIENT_TYPES.md](./TENANT_CLIENT_TYPES.md).
