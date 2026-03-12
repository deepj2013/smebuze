# SMEBUZE — Product Owner & Market Analysis

**Purpose:** As product owner and market analyst, this document answers: (1) what is missing right now, (2) which modules/features to add to solve business problems and increase usefulness, (3) what is truly done vs partially done or stubbed.

**Audience:** Leadership, product, and engineering. Use with PRD, FEATURES, TODO.md, GAP_ANALYSIS_AND_USP.

---

## 1. Executive summary

| Dimension | Verdict |
|-----------|--------|
| **Current state** | **Sellable MVP** for India MSME: multi-tenant ERP with CRM, Sales (invoices + payment + print), Purchase (vendors, POs, payables), Inventory, Accounting (COA, journal), Reports, bulk upload, RBAC, licensing, audit, global search, invoice edit. |
| **Gap vs vision** | Extended flows (quotations → order → challan → invoice; GRN/debit note; stock transfer) exist in **API only** — no web UI. P&L/Balance sheet and WhatsApp/AI are **stubs**. Key differentiators (real WhatsApp, real AI) and Phase 2 modules (HR, Production, Service) are not delivered. |
| **Opportunity** | Add **web UI for extended Sales/Purchase/Inventory**, **real accounting statements**, **payment gateway**, **deeper WhatsApp + AI**, and **one or two Phase 2 modules** (e.g. HR or Service) to capture niche and upsell. |

---

## 2. What is done vs partial vs missing

### 2.1 Fully done (ready for production use)

| Area | What’s done |
|------|-------------|
| **Tenancy & auth** | Multi-tenant, JWT, RBAC, signup/register/join/invite, forgot/reset password, MailService (SendGrid-ready). |
| **Organization** | Companies, branches, departments CRUD; users list/invite/edit; custom roles + permissions; super-admin tenant management (plan, features, expiry). |
| **CRM** | Leads (stages, move), customers CRUD, follow-ups CRUD, due-today, Customer 360 (details + invoices + follow-ups), campaigns (categories, templates, “Send message” wired to API). |
| **Sales (core)** | Invoices create/list/get/**PATCH**/payment/print; pending receivables; customer or vendor as buyer; HSN/GST on lines. |
| **Purchase (core)** | Vendors, POs, payables, vendor payments; TDS on payments; vendor ledger report. |
| **Inventory** | Items, warehouses, stock; low-stock API; batch filter; stock transfer API. |
| **Accounting** | Chart of accounts, journal entries; general ledger report; trial balance (from journal). |
| **Reports** | Dashboard, sales summary, purchase summary, GST summary, ledger, health score, TDS summary, vendor ledger, data export; CSV export for key reports. |
| **Bulk upload** | CSV for customers and items: parse, validate, preview, insert. |
| **Platform** | Feature flags + guard; audit log (login, org changes); health check; rate limiting; ValidationPipe + DTOs; e2e test (health). |
| **Web app** | Full menu, list/form/edit for all core entities; global search (Cmd+K); invoice edit page; onboarding, reports, bulk upload, admin (tenants), roles. |
| **Mobile** | Flutter: login, dashboard, customers list, invoices list (same API). |
| **Compliance (India)** | GSTIN validation; TDS on vendor payments; GST/TDS reports. |

### 2.2 Partially done (API exists; web UI or logic incomplete)

| Area | Done | Missing / partial |
|------|------|--------------------|
| **Sales (extended)** | API: Quotations, Sales orders, Delivery challan, Credit notes | **No web UI** for quotations, orders, challan, credit notes. Users cannot run full flow from web. |
| **Purchase (extended)** | API: GRN, Debit notes; vendor ledger report | **No web UI** for GRN, debit notes. |
| **Inventory (extended)** | API: Stock transfer, low-stock | **No dedicated stock-transfer or low-stock page** in web (only API/possible report link). |
| **Accounting (statements)** | Trial balance from journal; structure for P&L and Balance sheet | **P&L and Balance sheet are stubs** (return zeros + note). Need COA types (income/expense/asset/liability) and line-level journal to compute. |
| **WhatsApp** | Webhook verify + receive stub; send endpoint (validated DTO) | **No real WhatsApp Cloud API** integration. Campaign “Send message” calls API but API does not send to WhatsApp. |
| **AI** | Module with summary, agents (sales-summary, health-score, payment-reminder) | **Stubs** using existing report data; no LLM or real predictions. |
| **Reports** | 10+ report types, CSV export | Not “200+ reports” or “custom report builder” from FEATURES. |

### 2.3 Not started or out of scope for MVP

| Area | Status |
|------|--------|
| **HR & Payroll** | Phase 2; not started. |
| **Production / Manufacturing** | Phase 2; not started. |
| **Service (tickets, AMC, field staff)** | Phase 2; not started. |
| **Bank reconciliation** | In FEATURES; not implemented. |
| **Recurring invoice, price list, sales target** | In FEATURES; not implemented. |
| **Payment gateway (Razorpay/Stripe)** | Not implemented; cash/bank only. |
| **Integrations** | Tally, Zoho, Shopify, SMS, etc. not implemented. |
| **Redis / Elasticsearch** | In ARCHITECTURE; not in use. |
| **Python AI microservice** | ARCHITECTURE mentions it; current AI is NestJS stubs. |

---

## 3. What is missing right now (prioritized)

### Critical for “complete” MVP (flows and trust)

1. **Web UI for extended Sales**  
   Quotations, Sales orders, Delivery challan, Credit notes — all in API, zero in web. Without these, pre-sales and returns flow is incomplete for users who need them.

2. **Web UI for extended Purchase**  
   GRN and Debit notes — same as above; needed for “order → receive → pay” and returns.

3. **Real P&L and Balance sheet**  
   Today they return zeros. Need: COA type (income/expense/asset/liability/equity), journal entry lines linked to accounts, then aggregate by type for P&L and Balance sheet. Trial balance already uses journal; extend from there.

4. **Stock transfer and low-stock in web**  
   At least one page for “Stock transfer” (list/create) and a dashboard widget or report link for “Low stock” so ops can act without calling API directly.

### High (differentiators and daily use)

5. **Real WhatsApp send**  
   Integrate WhatsApp Cloud API (or Business API): send template messages from campaigns (e.g. invoice link, payment reminder). Today the send endpoint only returns success.

6. **Real AI value**  
   Either: (a) plug in an LLM for business summary and health narrative, or (b) add rule-based “insights” (e.g. “Top 3 overdue customers”, “Items below reorder”) so “AI” delivers tangible value.

7. **Payment collection**  
   Razorpay (India) or Stripe: “Pay invoice” link on invoice print/email/WhatsApp so customers can pay online. Today only “record payment” (manual) exists.

8. **Bank reconciliation**  
   Match bank statement lines with journal entries (payments/receipts). FEATURES and many MSMEs expect it.

### Medium (scale and stickiness)

9. **Recurring invoices**  
   Schedule repeat invoices (e.g. rent, subscriptions). Reduces manual work and supports SaaS/rental businesses.

10. **More reports + simple custom report**  
    Add high-demand reports (e.g. ageing, HSN-wise sales, item-wise sales); optional “custom report” with filters (date, company, customer/vendor) and export.

11. **Mobile app expansion**  
    Add screens for: POs, payables, items/stock, and “record payment” so field/owner can act from phone.

12. **Email/SMS for reminders**  
    Beyond password/invite: payment reminder, overdue invoice reminder (email/SMS or via WhatsApp when that’s live).

### Lower priority / Phase 2

13. **HR & Payroll**  
    Employee, attendance, leave, salary, PF/ESI. Opens a new segment (small offices, factories).

14. **Production / Manufacturing**  
    BOM, work orders, raw material consumption. For manufacturing tenants.

15. **Service module**  
    Tickets, AMC, contracts, field staff. For service businesses.

16. **Integrations**  
    Tally, Zoho, Shopify, Amazon seller — for migration and marketplace sellers.

---

## 4. Modules and features to add (business problem → solution)

### 4.1 Close the “order-to-cash” and “procure-to-pay” gap

| Business problem | What to add | Impact |
|------------------|------------|--------|
| “I need to send a quote, then convert to order and challan” | **Web UI: Quotations → Sales order → Delivery challan** (list/create/edit, link quote → order → challan) | Completes pre-sales and delivery in one product. |
| “I need to record returns and credit notes” | **Web UI: Credit notes** (link to invoice, reduce receivable) | Trust and compliance; matches common practice. |
| “I receive goods against PO and need to record it” | **Web UI: GRN** (link to PO, receive qty, date) | Completes procure-to-pay; supports inventory accuracy. |
| “I return to vendor and need debit note” | **Web UI: Debit notes** (link to PO/invoice) | Vendor reconciliation and compliance. |

### 4.2 Make finance and compliance credible

| Business problem | What to add | Impact |
|------------------|------------|--------|
| “I need P&L and Balance sheet for bank/audit” | **Real P&L and Balance sheet** from COA types + journal lines | Trust; required for loans and audits. |
| “I need to match bank statement with my entries” | **Bank reconciliation** (upload/match or manual match) | Reduces errors and month-end effort. |
| “I want to collect payment online” | **Payment gateway** (Razorpay/Stripe) + “Pay now” on invoice | Faster collection; less manual follow-up. |

### 4.3 Differentiate with WhatsApp and AI

| Business problem | What to add | Impact |
|------------------|------------|--------|
| “I want to send invoice and reminder on WhatsApp” | **WhatsApp Cloud API**: send template messages (invoice link, payment reminder) from campaigns | “WhatsApp-first” promise; higher open rates. |
| “I want a one-line view of how my business is doing” | **Real AI summary** (LLM or strong rule-based): “Last month: revenue X, top customer Y, overdue Z” | Differentiation; daily use for owners. |
| “I want reminders without opening the app” | **Scheduled reminders** (email/SMS/WhatsApp): X days after due date | Better collection and stickiness. |

### 4.4 Operational and multi-warehouse

| Business problem | What to add | Impact |
|------------------|------------|--------|
| “I move stock between godowns” | **Web UI: Stock transfer** (list/create, from/to warehouse, qty) | Full multi-warehouse support. |
| “I want to know what’s low on stock at a glance” | **Dashboard: Low-stock widget** + link to inventory/reorder | Proactive reorder; less stock-out. |

### 4.5 New segments (Phase 2)

| Business problem | What to add | Impact |
|------------------|------------|--------|
| “I need payroll and attendance” | **HR & Payroll** (employee, attendance, leave, salary, PF/ESI) | New segment: small offices, factories. |
| “I make things; I need BOM and work orders” | **Production** (BOM, work order, consumption, WIP) | Manufacturing segment. |
| “I do AMC and field service” | **Service** (tickets, AMC, contracts, field staff, service invoice) | Service business segment. |

---

## 5. Suggested roadmap (next 6–12 months)

### Phase A — Complete MVP (0–3 months)

1. **Web UI for extended Sales**  
   Quotations, Sales orders, Delivery challan, Credit notes (list + create + link to invoice/PO where relevant).

2. **Web UI for extended Purchase + Inventory**  
   GRN, Debit notes; Stock transfer page; Low-stock on dashboard or reports.

3. **Real P&L and Balance sheet**  
   COA types + journal entry lines → compute P&L (income − expense) and Balance sheet (assets, liabilities, equity).

4. **Payment gateway (Razorpay)**  
   “Pay now” on invoice (print/email/WhatsApp); webhook to record payment and update invoice status.

### Phase B — Differentiators (3–6 months)

5. **WhatsApp Cloud API**  
   Send template messages (invoice link, payment reminder); optional receive + simple bot (e.g. “balance” reply).

6. **AI that delivers value**  
   Either LLM-based “business summary” or rule-based “insights” (overdue, low stock, top customers) and surface in dashboard/WhatsApp.

7. **Bank reconciliation**  
   Upload bank statement (CSV) or manual matching with journal entries.

8. **Recurring invoices**  
   Schedule and auto-create repeat invoices; link to “Pay now” when gateway is live.

### Phase C — Scale and new segments (6–12 months)

9. **Mobile app expansion**  
   POs, payables, items/stock, record payment; push/notifications for overdue and low stock.

10. **More reports + custom report**  
    Ageing, HSN-wise, item-wise; simple custom report (filters + export).

11. **One Phase 2 module**  
    Choose **HR & Payroll** (broad demand) or **Service** (AMC/field service) or **Production** (manufacturing) based on target segment and sales pipeline.

12. **Integrations**  
    At least one of: Tally sync, or Zoho/Google Sheets for migration and reporting.

---

## 6. Summary table: done vs add next

| Category | Done | Add next (priority order) |
|----------|------|---------------------------|
| **Org & auth** | Multi-tenant, RBAC, invite, roles, audit, licensing | — |
| **CRM** | Leads, customers, follow-ups, 360, campaigns + send API | Scheduled reminders (email/SMS/WhatsApp) |
| **Sales** | Invoices full CRUD + payment + print; API for quote/order/challan/credit note | **Web UI:** Quotations, Orders, Challan, Credit notes |
| **Purchase** | Vendors, POs, payables, payments, TDS; API for GRN, debit note | **Web UI:** GRN, Debit notes |
| **Inventory** | Items, warehouses, stock, low-stock API, stock transfer API | **Web UI:** Stock transfer page; **Dashboard:** Low-stock widget |
| **Accounting** | COA, journal, GL, trial balance | **Real P&L and Balance sheet;** Bank reconciliation |
| **Reports** | 10+ reports, CSV export, export data | More reports; simple custom report builder |
| **Payments** | Record payment (manual) | **Razorpay/Stripe:** “Pay invoice” link + webhook |
| **WhatsApp** | Webhook + send endpoint (stub) | **Real WhatsApp Cloud API** send (and optional receive) |
| **AI** | Summary + agents (stubs) | **Real AI** (LLM or rule-based insights) |
| **Mobile** | Login, dashboard, customers, invoices | POs, payables, items, record payment, notifications |
| **Phase 2** | — | **HR & Payroll** or **Service** or **Production** (pick one); Integrations (Tally/Zoho) |

---

*Use this document with **TODO.md** for backlog refinement and with **GAP_ANALYSIS_AND_USP** for USP ideas. Update as features ship.*
