---
name: smebuze-auto-complete
description: Executes the full SMEBUZE web app and docs TODO in auto mode with no user input. Use when the user asks to complete all pending work, run auto completion, finish remaining tasks, or execute the SMEBUZE agent. Implements docs/TODO.md (pending items or phases) in order using defaults.
---

# SMEBUZE Auto-Completion Agent

**Mode:** Auto. Do not ask for confirmation, design choices, or input. Use the defaults below and implement each phase in order.

**Source of truth:** `docs/TODO.md`

---

## Defaults (use these; do not prompt)

| Item | Value |
|------|--------|
| Frontend app | `apps/website/` (Next.js App Router) |
| API base URL | `process.env.NEXT_PUBLIC_API_URL` or `http://localhost:3000`; path prefix `/api/v1` |
| Auth token key | `localStorage.getItem('smebuze_token')`; send as `Authorization: Bearer <token>` |
| Redirect if no token | `/login` |
| Styling | Tailwind CSS; minimal, clean forms and tables |

---

## Execution order

Work through **Phase 1 → Phase 2 → … → Phase 8** (then 9–10 if applicable). Complete every checkbox in a phase before moving to the next.

### Phase 1 — App shell and shared UX

- **1.1** Create `apps/website/app/(app)/layout.tsx`: sidebar with links to Dashboard, CRM (Leads, Customers), Sales (Invoices), Purchase (Vendors, Orders, Payables), Inventory (Items, Stock), Accounting (Journal), Reports. Use a client component that reads token and redirects to `/login` if missing.
- **1.2** In the same layout, add a header with user email/name (from `localStorage` or `/auth/me`) and a Logout button that clears `smebuze_token` and redirects to `/login`.
- **1.3** Create `apps/website/lib/api.ts`: `getToken()` from `localStorage.getItem('smebuzz_token')`, `fetch(url, { headers: { Authorization: \`Bearer ${token}\` } })`; base URL from `NEXT_PUBLIC_API_URL` or `http://localhost:3000`.
- **1.4** In `(app)/layout.tsx`, if no token in localStorage, redirect to `/login` (client-side check in useEffect or on mount).
- **1.5** Move current dashboard into `apps/website/app/(app)/dashboard/page.tsx` so the Dashboard menu item shows the existing summary + pending receivables/payables. Ensure the root `/dashboard` redirects or is under `(app)` so the layout is applied.

### Phase 2 — Organization

- **2.1** `app/(app)/organization/companies/page.tsx`: fetch `GET /api/v1/organization/companies`, table of name/legal_name/gstin, "Add company" button.
- **2.2** `app/(app)/organization/companies/new/page.tsx` (or modal): form name, legal_name, gstin, address (line1, city, state, pincode); POST `/api/v1/organization/companies`.
- **2.3** `app/(app)/organization/companies/[id]/branches/page.tsx`: GET companies/:id/branches (use `GET /api/v1/organization/companies/:companyId/branches`), table, "Add branch" button.
- **2.4** Branch form: company_id, name, address; POST `/api/v1/organization/branches`.

### Phase 3 — CRM

- **3.1** `app/(app)/crm/leads/page.tsx`: GET `/api/v1/crm/leads`, table (name, email, stage, score), "Add lead".
- **3.2** Lead form: name, email, phone, stage, source; POST `/api/v1/crm/leads`.
- **3.3** `app/(app)/crm/customers/page.tsx`: GET `/api/v1/crm/customers`, table, "Add customer".
- **3.4** Customer form: name, email, phone, gstin, address, credit_limit, segment; POST `/api/v1/crm/customers`.

### Phase 4 — Purchase

- **4.1** `app/(app)/purchase/vendors/page.tsx`: GET `/api/v1/purchase/vendors`, table, "Add vendor".
- **4.2** Vendor form: name, email, phone, gstin, address; POST `/api/v1/purchase/vendors`.
- **4.3** `app/(app)/purchase/orders/page.tsx`: GET `/api/v1/purchase/orders`, table, "Create PO".
- **4.4** PO form: company_id, branch_id, vendor_id, number, order_date, total, tax (and lines if API accepts); POST `/api/v1/purchase/orders`.
- **4.5** `app/(app)/purchase/payables/page.tsx`: GET `/api/v1/purchase/payables`; each row has "Record payment" (amount, date, mode, reference); POST `/api/v1/purchase/vendors/:id/payments`.

### Phase 5 — Sales

- **5.1** `app/(app)/sales/invoices/page.tsx`: GET `/api/v1/sales/invoices`, table, "Create invoice".
- **5.2** Invoice form: company_id, branch_id, customer_id or vendor_id, invoice_date, due_date; line items (hsn_sac, description, quantity, unit, unit_price, cgst_pct, sgst_pct); POST `/api/v1/sales/invoices`.
- **5.3** Pending receivables: use GET `/api/v1/sales/invoices/pending`; "Record payment" per row → POST `/api/v1/sales/invoices/:id/payment`.
- **5.4** From invoice list or detail, "Print" button opens `GET /api/v1/sales/invoices/:id/print` in new window (or iframe) so user can print.

### Phase 6 — Inventory

- **6.1** `app/(app)/inventory/items/page.tsx`: GET `/api/v1/inventory/items`, table, "Add item".
- **6.2** Item form: name, sku, description, unit, category, hsn_sac, reorder_level; POST `/api/v1/inventory/items`.
- **6.3** Warehouses list: GET `/api/v1/inventory/warehouses`, "Add warehouse".
- **6.4** Warehouse form: name, code, company_id, branch_id, address; POST `/api/v1/inventory/warehouses`.
- **6.5** Stock page: GET `/api/v1/inventory/stock`, table (item, warehouse, quantity).

### Phase 7 — Accounting

- **7.1** COA page: GET `/api/v1/accounting/coa?company_id=...`, read-only table.
- **7.2** Journal list: GET `/api/v1/accounting/journal`, "New entry".
- **7.3** Journal form: company_id, number, date, reference; lines (account_id, debit, credit, narration); POST `/api/v1/accounting/journal`.

### Phase 8 — Reports and bulk upload

- **8.1** Reports page: link to Dashboard; placeholders for Sales/Purchase reports.
- **8.2** Bulk upload page: file inputs for customers CSV and items CSV; POST to bulk-upload endpoints; show result message.

### Phase 9–10 (optional in same run)

- **9.x** Add PATCH where needed; optional PDF for invoice.
- **10.x** Update PRD/FEATURES with Mobile section; add `docs/API_FOR_MOBILE.md`; deployment notes.

---

## Rules

- **No user prompts:** Never ask "which style?" or "should I add X?"—choose a reasonable option.
- **One phase at a time:** Finish all checkboxes in the current phase before starting the next.
- **Reuse existing API:** All endpoints already exist; only build the frontend pages and `lib/api.ts`.
- **Mark progress:** Optionally set checkboxes in `docs/TODO.md` to `[x]` as you complete them, or leave a one-line note in a `docs/PROGRESS.md` file.
