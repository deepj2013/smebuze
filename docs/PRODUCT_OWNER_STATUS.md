# SMEBUZE — Product Owner Status

**View:** Product owner / stakeholder summary. For build checklist and task list see `STATUS.md` and `TODO.md`.

**Last updated:** 2025-03

---

## 1. Overall status

| Dimension | Status |
|-----------|--------|
| **Product stage** | **Sellable MVP** — Core ERP is live; multi-tenant, auth, CRM, Sales (invoices), Purchase, Inventory, Accounting (COA, journal), Reports, bulk upload, roles, and licensing are done. Ready for **controlled rollout** and demos. |
| **Gap to “complete” vision** | Pre-sales and deal visibility: quotation/PO/document **tracking** and **sales pipeline kanban** not yet in product. Full sales flow (quotations, orders, challan, credit notes) exists in API but **web UI is missing**. Real P&L/Balance sheet, payment gateway, and live WhatsApp are **planned**, not shipped. |
| **Execution** | Tiers 1–5 and onboarding are **done**. Tier 6 (deal tracking, kanban) and 64-task **work queue** are **planned**; work can start from task #1 and proceed one by one. Backlog is prioritised in `TODO.md`. |

---

## 2. What’s done (shipped)

### Platform
- Multi-tenant, JWT auth, RBAC (permissions + custom roles)
- Signup, register, join org, invite by email, forgot/reset password (MailService ready)
- Licensing and feature flags (DB + API guard + super-admin UI)
- Audit log (login, org changes), health check, rate limiting
- Data export (tenant data as JSON); backup/restore and on-prem in DEPLOY

### Organization
- Companies, branches, departments (CRUD, web)
- Users (list, invite, edit), Roles (list, create, edit, assign permissions)
- Super-admin: tenant list and edit (plan, features, expiry)

### CRM
- Leads (stages, move), Customers (CRUD), Follow-ups (CRUD, due today)
- Customer 360 (details + invoices + follow-ups)
- Campaigns (categories, templates, “Send message” wired to API stub)
- Bulk upload (customers, items: CSV parse, validate, preview, insert)

### Sales
- Invoices: create, list, get, **edit (PATCH)**, record payment, print, pending receivables
- Customer or vendor as buyer; HSN/GST on lines
- Quotations, Sales orders, Delivery challan, Credit notes — **API only** (no web UI yet)

### Purchase
- Vendors, POs, payables, vendor payments, TDS on payments
- Vendor ledger report; GRN, Debit notes — **API only** (no web UI yet)

### Inventory
- Items, warehouses, stock; low-stock API; batch filter; stock transfer API
- No dedicated **stock transfer** or **low-stock** web page yet

### Accounting & reports
- Chart of accounts, journal entries; general ledger; trial balance (real)
- P&L and Balance sheet (structure only; values are stubs)
- Dashboard, sales/purchase/GST/ledger/health-score/TDS/vendor-ledger reports; CSV export

### Web app
- Full menu, list/form/edit for core entities; global search (Cmd+K); invoice edit page
- Onboarding, reports, bulk upload, admin (tenants), roles

### Mobile
- Flutter: login, dashboard, customers list, invoices list (same API)

### India compliance
- GSTIN validation; TDS on vendor payments; GST/TDS reports

---

## 3. What’s next (in plan)

**Immediate (Work queue 1–11):** Deal tracking and sales pipeline  
- Track whom quotation/PO was sent to (sent_to, sent_at, status)  
- Deal stages on leads (e.g. lead → quotation_sent → won/lost)  
- **Sales pipeline kanban** (drag-drop by stage)  
- **Follow-up board** (Today, Overdue, This week)

**Then (Work queue 12–27):** Web UI and dashboard  
- Quotations, Sales orders, Delivery challan, Credit notes (list + create)  
- GRN, Debit notes, Stock transfer (list + create)  
- Dashboard: Low-stock widget, Due-today widget  
- Ageing report (API + web)

**Then (28–42):** Accounting, payments, WhatsApp, UX  
- Real P&L and Balance sheet (COA types + journal lines)  
- Payment gateway (Razorpay/Stripe) “Pay invoice”  
- WhatsApp Cloud API (real send)  
- Bank reconciliation (upload, match)  
- Empty states, toast, Invoice PDF download

**Backlog (43+):** Item/HSN-wise reports, recurring invoice, customer credit limit, tags, mobile expansion, tests, Phase 2 (HR, Service).

---

## 4. Readiness

| Use case | Readiness |
|----------|-----------|
| **Demo / pilot** | ✅ Ready — Core flows (org, CRM, invoice, PO, payables, dashboard, print, bulk upload, roles) work end-to-end. |
| **Paid pilots (single tenant)** | ✅ Ready — Multi-tenant, licensing, and feature flags allow controlled rollout. |
| **Full sales flow on web** | ⏳ Not yet — Quotation → order → challan → invoice needs web UI and deal tracking (Work queue 1–17). |
| **Sales team (pipeline view)** | ⏳ Not yet — Pipeline kanban and follow-up board are in plan (Work queue 8–11). |
| **Finance (P&L, bank recon)** | ⏳ Not yet — P&L/BS are stubs; bank recon is in plan (Work queue 28–32, 37–39). |
| **Online collection** | ⏳ Not yet — Payment gateway is in plan (Work queue 33–34). |
| **WhatsApp in production** | ⏳ Not yet — Send is stub; Cloud API integration in plan (Work queue 35–36). |

---

## 5. Risks and dependencies

- **WhatsApp / payment gateway:** External APIs and config (credentials, webhooks); need production setup when prioritised.
- **Real P&L/Balance sheet:** Depends on COA types and journal entry lines; one migration + report logic.
- **Scope creep:** Backlog and work queue are large; sticking to the **work queue order** (1 → 2 → …) keeps delivery predictable.

---

## 6. One-line summary

**SMEBUZE is a sellable MVP with core ERP (CRM, Sales, Purchase, Inventory, Accounting, Reports, bulk upload, RBAC, licensing) and web + Flutter UI. Next: deal tracking and sales pipeline kanban, then full sales/purchase web UI, real P&L/BS, payment gateway, and WhatsApp — all sequenced in the 64-task work queue in `TODO.md`.**
