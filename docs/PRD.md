# SMEBUZE — Product Requirement Document (PRD)

## Vision
**Modular AI-Powered ERP for MSME — Configure Only What You Need.**

Target: Manufacturing, Service companies, Traders, Agencies, Small factories, Multi-branch businesses.
SME → Small & Medium Enterprises (Your Target Market)

Buze → Derived from:

“Buzz” → Activity, growth, energy

“Fuse” → Integration of modules

“Use” → Easy to use

“Boost” (conceptually close sound)

So:

SMEBuze = The Platform That Creates Growth Buzz for SMEs
---

## Current status & references

- **Product owner status:** `docs/PRODUCT_OWNER_STATUS.md` — what's done, what's next, readiness.
- **Build checklist:** `docs/STATUS.md` — technical completion.
- **Backlog & work queue:** `docs/TODO.md` — Tiers 1–6, 64-task work queue, expanded backlog.
- **Feature list:** `docs/FEATURES.md` — full feature list (shipped + in plan).

**Summary:** Core ERP is **shipped** (multi-tenant, auth, RBAC, org, CRM, Sales invoices, Purchase, Inventory, Accounting, Reports, bulk upload, licensing, audit, global search, invoice edit). **In plan:** Deal tracking & sales pipeline kanban (Tier 6), web UI for quotations/orders/challan/credit note/GRN/debit/stock transfer, real P&L/Balance sheet, payment gateway, WhatsApp Cloud API, bank reconciliation. Flutter app has started (login, dashboard, customers, invoices); more screens in backlog.

---

## Access & Tenancy Model

- **One Organisation** (SMEBUZE platform) owns the product.
- **Tenants** = Customer organisations (each MSME is one tenant).
- **Users** belong to a tenant; each user has **role-based access**.
- **Multi-tenant isolation**: All data scoped by `tenant_id`; users see only their tenant's data.
- **Licensing**: Per-tenant subscription (Basic / Advanced / Enterprise / AI Pro); feature flags per tenant.

---

## MVP Modules (90 Days)

| Module | Scope | Status |
|--------|--------|--------|
| Organization & Admin | Multi-tenant, multi-company, multi-branch, **departments**, roles, permissions, **custom roles**, license, **feature flags**, audit, **invite by email** | Done |
| CRM | Leads, pipeline, follow-up, customer 360, bulk upload, **campaigns (categories, templates, send)**. **In plan:** Deal pipeline, quotation/PO sent tracking, sales kanban, follow-up board | Done (kanban in plan) |
| Sales | Quotation, order, invoice, delivery challan, returns, credit note. **Invoice** full CRUD + payment + print + edit. Quotation/order/challan/credit note **API done**; **web UI in plan** | Done (extended web UI in plan) |
| Purchase | Vendor, PO, GRN, returns, debit note, vendor payments, TDS, vendor ledger. **RFQ in backlog.** GRN/debit **API done**; **web UI in plan** | Done (web UI in plan) |
| Inventory | Item master, SKU, batch, multi-warehouse, stock transfer, low-stock alert. **API done**; **stock transfer web UI in plan** | Done (web UI in plan) |
| Accounting | Chart of accounts, journal, ledger, trial balance, **P&L & balance sheet (real in plan)**, bank recon (in plan), GST, TDS reports | Done (real P&L/BS, bank recon in plan) |
| Reports | Dashboard, sales/purchase/GST/ledger/health-score/TDS/vendor-ledger, CSV export, data export. **Ageing, item/HSN-wise, PDF in plan** | Done (more reports in plan) |
| Integrations | WhatsApp webhook + send (stub). **WhatsApp Cloud API send in plan.** Bulk CSV upload done | Partial (real WhatsApp in plan) |
| AI | Business health score, AI summary, agents (sales-summary, health-score, payment-reminder). **LLM/rule-based insights in backlog** | Done (stubs; deeper AI in backlog) |

---

## Feature Master (80+)

See `docs/FEATURES.md` for the full 80+ feature list mapped to modules.

---

## User Types & Permissions

- **Super Admin** (SMEBUZE org only): Platform config, tenant creation, licensing.
- **Tenant Admin**: Full access within tenant; company/branch/department setup; user & role management.
- **Manager**: Module-level access (e.g. Sales Manager, Purchase Manager).
- **Staff**: Limited to assigned modules and actions (e.g. create invoice, view reports).
- **Viewer**: Read-only where granted.

Permissions are **resource + action** (e.g. `sales.invoice.create`, `crm.lead.view`). Custom roles can be built from these.

---

## Compliance (India + Global)

- GST, TDS, MSME registration hooks, PF/ESI (payroll later).
- Data encryption, audit logs, backup/restore.
- GDPR-ready (data export, consent, retention).

---

## Mobile

- **Web app first**: Core ERP flows (dashboard, vendors, customers, invoices, items, etc.) are implemented in the Next.js web app.
- **Flutter mobile**: In progress. Uses the **same REST API** (auth, tenants, CRM, sales, purchase, inventory, accounting, reports). **Shipped:** Login, dashboard, customers list, invoices list. **In plan (TODO):** POs, payables, items/stock, record payment, push notifications.
- **API contract** for mobile clients: `docs/API_FOR_MOBILE.md` (base URL, Bearer token auth, main endpoints).

---

## Out of MVP Scope (Phase 2+)

- **HR & Payroll** — Employee, attendance, leave, payroll, PF/ESI (in backlog).
- **Production/Manufacturing** — BOM, work order, consumption, WIP (in backlog).
- **Service** — Service ticket, AMC, field staff, service invoice (in backlog).
- **Advanced AI** — Full advisor, fraud detection (future).

*Flutter mobile is in scope; see Mobile section. Phase 2 modules are sequenced in `docs/TODO.md` (work queue 60–64 and backlog).*

---

*Document version: 1.1 | Last updated: 2025-03 | Aligned with STATUS, TODO, FEATURES, PRODUCT_OWNER_STATUS*
