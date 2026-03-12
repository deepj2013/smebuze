# SMEBUZE — TODO (single list)

**Purpose:** One place to track all product and engineering work. **Start with “Work queue — do one by one”** below: numbered tasks in order; do #1, then #2, and so on. Mark each `[x]` when done. **Backlog (expanded)** adds more items by area for later.

**References:** PRD, FEATURES, STATUS, ARCHITECTURE, PRODUCTION_READINESS, DEPLOY, GAP_ANALYSIS_AND_USP, API_FOR_MOBILE, DEMO_CREDENTIALS, USER_TYPES.

---

## Current state (summary)

| Done | Gaps vs vision |
|------|-----------------|
| Multi-tenant, auth, RBAC, org (company/branch), CRM (leads, customers), Sales (invoices + HSN/GST, payment, print), Purchase (vendors, POs, payables), Inventory (items, warehouses, stock), Accounting (COA, journal), Dashboard, web app with menu + forms + edit, Flutter starter (login + dashboard + customers + invoices), docs | **Next (Tier 6):** Track whom quotation/PO/documents sent to before deal close; sales pipeline kanban; follow-up board. Then: web UI for quotations/orders/challan; full WhatsApp/AI in production. |

---

## Work queue — do one by one

*Start from **#1** and work down. Mark each `[ ]` → `[x]` when done. One task at a time; everything gets added sequentially.*

### Deal tracking & pipeline (Tier 6)
1. [x] **DB migration:** Add to quotations: `sent_to` (lead_id/customer_id), `sent_at`, `status` (draft/sent/viewed/accepted/rejected). Add to purchase_orders: `sent_at`, `status` (draft/sent).
2. [x] **API:** PATCH quotation — accept sent_to, sent_at, status; list quotations with filter by status.
3. [x] **API:** PATCH purchase order — accept sent_at, status; list POs with filter sent/pending.
4. [x] **Web:** Quotations list page — table with number, customer/lead, status, sent on; link to create/edit; add to Sales menu.
5. [x] **Web:** Quotation create page — form (company, customer/lead, lines); save as draft.
6. [x] **Web:** Quotation detail page — show “Sent to”, “Sent on”, status; buttons “Mark as sent”, “Mark accepted/rejected”.
7. [x] **Web:** PO list — column “Sent to vendor on”; filter “Not sent” / “Sent”; button “Mark as sent” on detail.
8. [x] **DB migration:** Add `deal_stage` to leads (or create deals table) — stages: lead, quotation_sent, negotiation, order, won, lost.
9. [x] **API:** List leads by deal_stage; PATCH lead deal_stage; optional value, expected_close_date.
10. [x] **Web:** Sales pipeline kanban page — columns = stages; cards = leads (name, value, next follow-up); drag-drop to change stage; route e.g. /crm/pipeline.
11. [x] **Web:** Follow-up board page — columns: Today, Overdue, This week; cards = follow-ups (contact, action, due); quick Done / Reschedule.

### Sales web UI (quotations → order → challan → invoice)
12. [x] **Web:** Sales orders list page — table; link create; add to Sales menu.
13. [x] **Web:** Sales order create page — form; optional link from quotation (prefill customer/items).
14. [x] **Web:** Delivery challan list page — table; link create; add to Sales menu.
15. [x] **Web:** Delivery challan create page — form; optional link from sales order.
16. [x] **Web:** Credit notes list page — table; link create; link to invoice; add to Sales menu.
17. [x] **Web:** Credit note create page — form; select invoice; lines (return qty); reduce receivable.

### Purchase & inventory web UI
18. [x] **Web:** GRN list page — table; link create; add to Purchase menu.
19. [x] **Web:** GRN create page — form; select PO; receive qty per line; date.
20. [x] **Web:** Debit notes list page — table; link create; add to Purchase menu.
21. [x] **Web:** Debit note create page — form; select PO/vendor; lines; link to vendor ledger.
22. [x] **Web:** Stock transfer list page — table (from/to warehouse, date, status); add to Inventory menu.
23. [x] **Web:** Stock transfer create page — form; from warehouse, to warehouse, lines (item, qty).

### Dashboard & reports
24. [x] **Web:** Dashboard — add “Low stock” widget: count of items below reorder level; link to inventory/items filtered.
25. [x] **Web:** Dashboard — add “Due today” widget: receivables + payables with due date = today; link to pending pages.
26. [x] **API:** Ageing report — receivables/payables by bucket (0–30, 31–60, 61–90, 90+ days).
27. [x] **Web:** Reports page — add Ageing report; filters; export CSV.

### Accounting (real P&L / Balance sheet)
28. [x] **DB migration:** Add `type` to chart of accounts (income, expense, asset, liability, equity).
29. [x] **API:** Journal entry lines — ensure entries have account_id and debit/credit per line (if not already).
30. [x] **API:** P&L — aggregate by COA type income/expense for period; return real totals.
31. [x] **API:** Balance sheet — aggregate assets, liabilities, equity as of date; return real totals.
32. [x] **Web:** Reports page — P&L and Balance sheet show real data; export CSV/PDF if applicable.

### Payments & WhatsApp
33. [x] **API + Web:** Razorpay (or Stripe) — create payment link for invoice; webhook to record payment and update invoice status.
34. [x] **Web:** Invoice print/detail — add “Pay online” button when gateway configured.
35. [ ] **API:** Integrate WhatsApp Cloud API — send template message (invoice link, payment reminder); replace stub in POST /integrations/whatsapp/send.
36. [ ] **Web:** Campaigns “Send message” — ensure payload includes phone; show success/failure from real API.

### Bank reconciliation & data
37. [x] **DB migration:** Bank statement lines or reconciliation table (match with journal/payments).
38. [x] **API:** Upload bank statement (CSV) or create statement lines; match with journal entries; list unmatched.
39. [x] **Web:** Bank reconciliation page — list bank lines; match to payment/receipt; mark reconciled.

### UX & polish
40. [x] **Web:** Empty states — on Customers, Invoices, Leads list when empty: message + “Add your first …” CTA.
41. [x] **Web:** Toast/notification — use a toast lib or simple state for success/error after save (consistent across forms).
42. [x] **Web:** Invoice PDF — add “Download PDF” that generates PDF from invoice (e.g. react-to-pdf or server-side).

### Reports & backlog (pick next)
43. [x] **API + Web:** Item-wise sales report — sales by item; filters; CSV export.
44. [x] **API + Web:** HSN-wise sales report — sales by HSN; filters; CSV export.
45. [x] **API:** Recurring invoice — table + cron or job to create invoice from schedule.
46. [x] **Web:** Recurring invoice list + create (schedule, template invoice, frequency).
47. [x] **API:** Customer credit limit — field on customer; validate on invoice create.
48. [x] **Web:** Customer form — add credit limit; show warning on invoice when near/over limit.
49. [x] **API:** Tags on leads/customers — table tag; many-to-many; filter list by tag.
50. [x] **Web:** Lead/customer form — add tags (multi-select); list filter by tag.

### Mobile (Flutter)
51. [x] **Flutter:** Purchase orders list screen — call GET /purchase/orders; show list.
52. [x] **Flutter:** Payables list screen — call payables API; show list.
53. [x] **Flutter:** Items and stock screen — call items + stock API.
54. [x] **Flutter:** Record payment from invoice detail — form; call POST invoice/:id/payment.

### Quality & DevOps
55. [x] **API:** Add 2–3 integration tests (e.g. login + create customer, create invoice).
56. [x] **Web:** Add 1–2 e2e tests (Playwright/Cypress): login, open dashboard, create invoice.
57. [x] **Docs:** DEPLOY — add backup scheduler option (script or managed); document restore steps.
58. [x] **API:** Structured JSON logging in production; log level from env.
59. [x] **API + Web:** Error tracking — Sentry (or similar); capture unhandled errors.

### Phase 2 (when ready)
60. [x] **HR:** Employee master — DB + API CRUD + web list/form.
61. [ ] **HR:** Attendance — DB + API (check-in/out or daily) + web.
62. [ ] **HR:** Leave — leave types, apply, balance; API + web.
63. [x] **Service:** Service ticket — DB + API + web list/detail/create.
64. [x] **Service:** AMC — contract table; renewal date; link to customer and invoices.

*After completing a task, mark it `[x]`. Add new tasks at the end of this list as needed; keep working in order.*

---

## Tier 1 — Must-have (sellable MVP)

### 1.1 User & role management (tenant admin)
- [x] **API:** Tenant admin can list users in tenant, invite user (email + role), deactivate user.
- [x] **API:** List roles, create custom role, assign permissions to role (from existing permissions table).
- [x] **Web:** Settings or Admin: “Users” (list + invite), “Roles” (list + create/edit + assign permissions).
- [x] **Seed:** Tenant Admin role has user-management permissions; document in USER_TYPES.

### 1.2 Bulk upload
- [x] **API:** CSV for customers: parse, validate, preview, insert (tenant-scoped). Same for items with column mapping.
- [x] **Web:** Bulk upload page: upload CSV → preview and errors → Import; success/failure counts.
- [x] **Docs:** Sample CSV templates in docs or downloadable from UI.

### 1.3 Reports engine & first reports
- [x] **API:** Report types (sales summary, purchase summary, GST summary, ledger, dashboard); filters (date range, company); structured data.
- [x] **API:** At least 5 reports; CSV export for sales summary and GST summary.
- [x] **Web:** Reports page: list reports, filters, View, Export CSV.

### 1.4 Licensing & feature flags
- [x] **DB:** `tenants.license_key`, `tenants.features`, `tenants.subscription_ends_at`.
- [x] **API:** Guard validates tenant feature before module routes; 403 if not allowed. Super-admin: PATCH /tenants/:id for license/features/expiry.
- [x] **Web:** Super-admin tenant form (plan/features/expiry); “Feature not available” when module disabled.

---

## Tier 2 — Module completion

### 2.1 Organization & admin
- [x] **Departments:** DB + API CRUD under company/branch.
- [x] **Audit log:** Table `audit_logs`; write on login, user/role/company/branch create/update. GET /audit-logs (filters).

### 2.2 CRM
- [x] **Lead pipeline:** List by stage; optional drag-drop or “Move to stage”.
- [x] **Follow-up:** Table `follow_ups`; API CRUD; “Due today” on dashboard/CRM.
- [x] **Customer 360:** Single customer page: details, last invoices, follow-ups. GET /crm/customers/:id/360; web page at /crm/customers/[id].
- [x] **Bulk upload:** Covered in Tier 1.

### 2.3 Sales (extended)
- [x] **Quotations:** Table + API create/list/get.
- [x] **Sales orders:** Table + API create/list/get; optional link from quotation.
- [x] **Delivery challan:** Table + API create/list/get.
- [x] **Credit note:** Table + API create/list/get; link to invoice.

### 2.4 Purchase (extended)
- [x] **GRN:** Table + API (migration 015). Debit notes table + API.
- [x] **Vendor ledger:** GET /reports/vendor-ledger (PO + payments, running balance).

### 2.5 Inventory
- [x] **Stock transfer:** Table + API (migration 015).
- [x] **Low-stock alert:** GET /inventory/stock/low.
- [x] **Batch tracking:** Filter stock by batch_code (GET /inventory/stock?batch_code=).

### 2.6 Accounting
- [x] **General ledger:** Report endpoint. Trial balance, P&L, Balance sheet stubs.
- [x] **GST report:** By HSN, tax type, period; API + export.

---

## Tier 3 — Differentiators (WhatsApp, AI)

### 3.1 WhatsApp
- [x] **Webhook:** GET/POST /integrations/whatsapp/webhook (verify + receive stub).
- [x] **Send:** POST /integrations/whatsapp/send (stub for template messages).

### 3.2 AI
- [x] **AI module:** GET /ai/summary (business summary), GET /ai/agents, POST /ai/agents/:id (sales-summary, health-score, payment-reminder).
- [x] **Business health score:** GET /reports/health-score.

---

## Tier 4 — Production & compliance

### 4.1 Security & ops
- [x] **Health check:** GET /api/v1/health. Rate limiting (Throttler). Audit log. Secrets from env/vault.

### 4.2 India compliance
- [x] **GST:** GSTIN validation (format). **TDS:** tds_amount/tds_percent on vendor_payments; GET /reports/tds-summary.

### 4.3 Data & privacy
- [x] **Data export:** GET /reports/export (tenant data as JSON). **Backup/restore** and **on-prem** in DEPLOY.md.

---

## Tier 5 — Scale & polish

- [x] **Admin app:** /admin/tenants (super-admin); Users + Roles under Organization.
- [x] **Mobile app:** Flutter: Dashboard, Customers list, Invoices list (API_FOR_MOBILE).
- [x] **Custom roles:** Create role, assign permissions (API + UI). **On-premise:** Documented in DEPLOY.

---

## Tier 6 — Deal tracking, document tracking & sales kanban

*Track whom we sent quotation, PO, and documents to before deal close; kanban for sales follow-up.*

### 6.1 Quotation / document sent tracking
- [ ] **DB:** Track “quotation sent” per quotation: `sent_to` (lead_id or customer_id), `sent_at`, `status` (draft | sent | viewed | accepted | rejected). Optional: `document_sent` table for other docs (proposal, terms, NDA) linked to lead/customer/deal.
- [ ] **API:** Record when quotation is sent (e.g. PATCH quotation with `sent_at`, `sent_to`, `status`); list quotations by status; filter “sent to X”.
- [ ] **API:** Record when PO is sent to vendor (e.g. PATCH PO with `sent_at`, `status` sent); list POs by “sent” / “pending send”.
- [ ] **API:** Optional “documents sent” log: document type, sent to (lead/customer/vendor), date, link to quotation/PO/deal.
- [ ] **Web:** Quotation list/detail: show “Sent to”, “Sent on”, status; action “Mark as sent” / “Mark accepted/rejected”. Same idea for PO “Sent to vendor” and date.

### 6.2 Deal pipeline (stages before deal close)
- [ ] **DB:** Deal/opportunity stages: e.g. Lead → Quotation sent → Negotiation → PO sent → Order confirmed → Won / Lost. Either extend `leads` with `deal_stage` or add `deals` table linked to lead/customer, quotation, PO.
- [ ] **API:** List deals/leads by stage; update stage (e.g. move to “Quotation sent” when quotation is sent); optional value, expected close date.
- [ ] **Web:** Deal pipeline view: list or kanban by stage; filter by owner, date range.

### 6.3 Sales kanban (follow-up & pipeline)
- [ ] **Web:** **Sales pipeline kanban:** Columns = stages (e.g. Lead, Quotation sent, Negotiation, Order, Won, Lost); cards = deals/leads (with customer name, quotation #, value, next follow-up); drag-and-drop to change stage.
- [ ] **Web:** **Follow-up kanban or board:** View follow-ups grouped by due date (Today, Overdue, This week) or by deal/lead; cards show contact, next action, due date; quick “Done” / “Reschedule”.
- [ ] **API:** Support for kanban: list leads/deals by stage; PATCH to update stage (for drag-drop); list follow-ups with due date and link to lead/customer.

### 6.4 Purchase-side tracking (optional)
- [ ] **Web:** PO list: show “Sent to vendor on”; filter by “not yet sent” / “sent”. Track document sent (e.g. PO PDF) to vendor with date.

---

## Onboarding (signup, join, invite, password)

### O1 — Signup (new organisation)
- [x] **API:** POST /auth/signup. **Web:** /signup (org + account + plan/trial). **Marketing:** Sign up / Get started CTAs.

### O2 — Join existing organisation
- [x] **API:** POST /auth/register, POST/GET /organization/invites, POST /auth/accept-invite. **Web:** /join (slug or token). **Invite UI:** Organization > Users “Invite by email”.

### O3 — Post-signup
- [x] **Backend:** Onboarding checklist/state. **Web:** Welcome, checklist, /onboarding wizard.

### O4 — Account and password
- [x] **API:** POST /auth/forgot-password, POST /auth/reset-password. **Web:** /forgot-password, /reset-password. MailService (SendGrid in prod).

### O5 — Analytics (optional)
- [x] **API:** POST /onboarding/events, POST /onboarding/survey.

---

## Optional / next (backlog)

- [x] **Global search (Cmd+K):** Search customers, vendors, invoices, items; jump to detail.
- [x] **Invoice PATCH:** Full edit for invoice and lines; wire in web.
- [x] **Campaign “Send message”:** Wire to send API or queue (currently UI-only).
- [x] **Automated tests:** Unit/integration/e2e for API and web.
- [x] **Validation:** DTOs and ValidationPipe on all endpoints.
- [ ] **Web UI — Quotations:** List, create, edit quotations; link to lead/customer; show in Sales menu.
- [ ] **Web UI — Sales orders, Delivery challan, Credit notes:** List + create pages; link quotation → order → challan → invoice where relevant.
- [ ] **Web UI — GRN, Debit notes:** List + create under Purchase; link to PO.
- [ ] **Web UI — Stock transfer:** Dedicated page to list and create stock transfers.
- [ ] **Dashboard — Low-stock widget:** Card showing items below reorder level with link to inventory.
- [ ] **Real P&L and Balance sheet:** Compute from COA types + journal entry lines (not stubs).
- [ ] **Payment gateway (Razorpay/Stripe):** "Pay invoice" link; webhook to record payment.
- [ ] **Real WhatsApp send:** Integrate WhatsApp Cloud API for template messages (invoice link, reminder).
- [ ] **Bank reconciliation:** Match bank statement with journal entries (upload or manual match).

---

## Backlog (expanded by area)

*Additional items from FEATURES and product analysis. Prioritise with Tier 6 and Optional/next.*

### CRM
- [ ] **Lead scoring (AI or rules):** Auto score leads by engagement/value; show on pipeline and list.
- [ ] **Tags and segmentation:** Tags on leads/customers; segment by tag for campaigns and reports.
- [ ] **Customer credit limit:** Field and validation; warn or block when limit exceeded on new invoice.
- [ ] **Sales assignment:** Assign lead/customer to sales user; filter “My leads” / “My customers”.
- [ ] **Complaint / feedback:** Simple ticket or feedback linked to customer; status and notes.
- [ ] **Email integration:** Send campaign emails (not only WhatsApp); track opened/clicked if possible.

### Sales
- [ ] **Recurring invoice:** Schedule repeat invoices (e.g. monthly rent); auto-create or remind.
- [ ] **Price list:** Multiple price lists per item/customer; apply on quotation/invoice.
- [ ] **Discount and commission:** Line-level and document-level discount; sales commission tracking.
- [ ] **Sales target and performance:** Target per user/period; dashboard or report vs actual.
- [ ] **Proforma invoice:** Proforma document type; convert to tax invoice when confirmed.
- [ ] **Invoice PDF export:** Download invoice as PDF (not only print HTML).
- [ ] **E-signature:** Capture signature on quotation/order/invoice (link to doc, store signature).
- [ ] **WhatsApp invoice share:** One-click share invoice link via WhatsApp (when WhatsApp send is live).

### Purchase
- [ ] **RFQ (Request for Quotation):** RFQ document; link to vendor responses and then to PO.
- [ ] **Vendor performance:** Track on-time delivery, quality; simple score or report.
- [ ] **Advance payment tracking:** Record advance to vendor; allocate against PO/invoice.

### Inventory
- [ ] **Barcode / QR:** Scan or enter barcode on item; lookup item in stock and sales.
- [ ] **Reorder alert (WhatsApp/email):** When stock below reorder level, send alert (when WhatsApp/email send is live).
- [ ] **Dead stock report:** Items with no movement in X days; report or dashboard widget.
- [ ] **Expiry tracking:** Expiry date per batch; alert or report for near-expiry.
- [ ] **Stock valuation (FIFO/LIFO/weighted):** Method per item or global; report value by method.
- [ ] **Stock audit:** Physical count; reconcile with system stock; adjustment with reason.
- [ ] **Serial number:** Serial numbers for items (e.g. assets); track per unit.

### Accounting & finance
- [ ] **Cash flow report:** Inflows vs outflows by period; from journal or payment data.
- [ ] **COA types for P&L/BS:** Income, expense, asset, liability, equity on COA; drive real P&L and Balance sheet.
- [ ] **Expense management:** Expense claims or categories; link to journal/cost centre.
- [ ] **Budget planning:** Budget per account or category; compare actual vs budget in report.
- [ ] **Multi-currency:** Support multiple currencies; exchange rate; report in base currency.

### Reports & intelligence
- [ ] **Ageing report:** Receivables/payables ageing (0–30, 31–60, 61–90, 90+ days).
- [ ] **Item-wise / HSN-wise sales:** Report sales by item and by HSN with filters.
- [ ] **Custom report builder:** User-defined filters (date, company, customer, item); export CSV/PDF.
- [ ] **PDF export for reports:** All key reports exportable as PDF (not only CSV).
- [ ] **WhatsApp daily/weekly summary:** Scheduled summary (sales, receivables, low stock) via WhatsApp (when live).
- [ ] **Predictive / AI reports:** Sales forecast, expense optimization, vendor risk, stock prediction (when AI is real).

### Integrations
- [ ] **Tally sync:** Export or sync chart of accounts, ledger, sales, purchase with Tally.
- [ ] **Zoho / Google Sheets:** Export or sync data for reporting in Sheets.
- [ ] **Shopify / Amazon seller:** Sync orders or products (for marketplace sellers).
- [ ] **SMS gateway:** Send SMS for OTP, payment reminder, alerts (in addition to WhatsApp/email).
- [ ] **Public REST API / webhooks:** API keys for tenants; webhooks for invoice created, payment received, etc.

### AI & automation
- [ ] **LLM business summary:** Real “How was my business?” summary using LLM (OpenAI or open-source).
- [ ] **Rule-based insights:** “Top 3 overdue customers”, “Items below reorder”, “Quotations pending &gt; 7 days” on dashboard.
- [ ] **Payment reminder automation:** X days after due date, auto-send reminder (email/SMS/WhatsApp when live).
- [ ] **Auto lead scoring:** Score leads from behaviour (opened quote, replied, etc.) when data exists.

### Mobile (Flutter)
- [ ] **Purchase orders list and detail:** Screen(s) for POs; view and optionally create.
- [ ] **Payables list:** Pending payables; link to record payment if API supports from app.
- [ ] **Items and stock:** List items; view stock by warehouse.
- [ ] **Record payment (invoice):** From invoice detail, record payment (amount, date, mode).
- [ ] **Push notifications:** Overdue invoice, low stock, follow-up due (when backend can send push).
- [ ] **Offline support:** Cache key data; queue actions when offline; sync when online.

### UX & polish
- [ ] **Empty states:** “Add your first customer” / “Create first invoice” with CTA and illustration on list pages.
- [ ] **In-app notification / toast:** Success/error toasts; optional notification center for async actions.
- [ ] **Dashboard widgets:** “Cash flow today”, “Due today (receivables + payables)”, “Low stock”, “Overdue follow-ups”.
- [ ] **Keyboard shortcuts:** Beyond Cmd+K; e.g. N for new, Esc to close modal.
- [ ] **Dark mode:** Theme toggle; persist preference.

### Quality & DevOps
- [ ] **API integration tests:** Tests for auth, CRM, sales, purchase flows (with test DB or mocks).
- [ ] **Web e2e tests:** Playwright or Cypress for login, create invoice, dashboard.
- [ ] **Redis cache:** Optional Redis for session or frequently read data (e.g. permissions).
- [ ] **Backup scheduler:** Scheduled DB backup (script or managed service); document in DEPLOY.
- [ ] **Structured logging:** JSON logs in production; log level from env.
- [ ] **Error tracking:** Sentry or similar for API and web; alert on critical errors.

### Phase 2 — HR & Payroll
- [ ] **Employee master:** Employee CRUD; link to user optional; department, DOJ, salary structure.
- [ ] **Attendance:** Check-in/out or days present; integrate biometric if needed.
- [ ] **Leave:** Leave types; apply leave; balance; approval flow (simple).
- [ ] **Payroll:** Salary computation; PF/ESI; payslip generation; payment record.
- [ ] **Self-service portal:** Employee view own attendance, leave, payslip.

### Phase 2 — Production / Manufacturing
- [ ] **BOM (Bill of materials):** BOM per finished good; components and qty.
- [ ] **Work order:** Work order from BOM; link to production batch.
- [ ] **Raw material consumption:** Issue raw material to work order; track consumption.
- [ ] **Finished goods / WIP:** Receive finished goods from work order; WIP valuation.
- [ ] **Machine allocation and utilization:** Optional; machine or resource linked to work order; utilization report.

### Phase 2 — Service
- [ ] **Service ticket:** Ticket for customer request; status; assign to field staff.
- [ ] **AMC (Annual Maintenance Contract):** Contract with customer; renewal date; link to invoices.
- [ ] **Field staff and task:** Assign task to field staff; status (pending/done); optional location.
- [ ] **Service invoice:** Invoice type for service; link to ticket or contract.

---

## Suggested order (for new work)

1. **Tier 6 — Deal tracking & kanban:** Quotation/PO/document sent tracking; deal stages; sales pipeline kanban; follow-up board (so sales follow-up looks good and we know whom we sent what to before deal close).
2. Web UI for Quotations, Sales orders, Challan, Credit notes (so kanban and tracking have full flow in web).
3. Web UI for GRN, Debit notes, Stock transfer; low-stock widget.
4. Real P&L/Balance sheet; payment gateway; WhatsApp send; bank reconciliation.
5. **From Backlog (expanded):** Pick by impact — e.g. Recurring invoice, Ageing report, Invoice PDF, Dashboard widgets, then CRM (tags, credit limit), then Phase 2 (HR or Service) when ready.

---

## Doc index (docs folder)

| Document | Purpose |
|----------|--------|
| **TODO.md** | This file — single TODO list |
| **PRD.md** | Product requirements and access model |
| **FEATURES.md** | Feature list |
| **STATUS.md** | Build status and high-level pending |
| **ARCHITECTURE.md** | Tech stack and multi-tenant design |
| **PRODUCTION_READINESS.md** | Production checklist |
| **DEPLOY.md** | Deployment (API + web, backup, on-prem) |
| **GAP_ANALYSIS_AND_USP.md** | Gaps vs vision + USP ideas |
| **API_FOR_MOBILE.md** | API contract for mobile |
| **DEMO_CREDENTIALS.md** | Demo login |
| **DEMO_FLOW.md** | Demo flow |
| **USER_TYPES.md** | User types and roles |
| **PRODUCT_AND_MARKET_ANALYSIS.md** | Product owner & market view: what’s done vs missing, modules to add, roadmap |
| **PRODUCT_OWNER_STATUS.md** | Product owner status: what's done, what's next, readiness, one-line summary |

---

*Use this as the **single product backlog**. For “complete all pending work” / auto-completion, the agent uses this file and the skill in `.cursor/skills/smebuzz-auto-complete/SKILL.md`.*
