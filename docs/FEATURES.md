# SMEBUZE — Feature Master List

**Aligned with `docs/TODO.md`.** This list includes all shipped features and **in-plan** items from the TODO (work queue, Tier 6, optional/next, backlog). Status and order of implementation are in TODO.

---

## 1. Organization & Admin

- Multi-tenant architecture, Multi-company, Multi-branch, Multi-department
- Multi-admin, Role & Permission management, Custom role builder
- License key management, Subscription (monthly/quarterly/half-yearly/yearly)
- Feature flags per tenant (guard on module routes)
- On-premise / SaaS mode, Audit logs, Activity logs
- Data encryption, Backup scheduler, Restore backup
- Global settings, Business profile config, Tax structure (GST/VAT)
- Super-admin tenant management (plan, features, expiry)
- Structured logging (JSON in production), Error tracking (e.g. Sentry)

---

## 2. CRM

- Lead capture, Lead pipeline, Lead stage tracking, Follow-up reminder
- **Deal pipeline / deal stage** (lead → quotation_sent → negotiation → order → won / lost)
- **Quotation sent tracking** (sent_to, sent_at, status: draft/sent/viewed/accepted/rejected)
- **Document sent tracking** (proposal, terms, NDA — link to lead/customer/deal)
- **Sales pipeline kanban** (columns = stages; cards = leads/deals; drag-drop)
- **Follow-up board** (Today, Overdue, This week; cards with Done / Reschedule)
- WhatsApp follow-up automation, Email integration, Customer 360
- Bulk customer upload (Excel/CSV), Customer credit limit, Segmentation, Tags
- Sales assignment, Auto lead scoring (AI), Complaint management, Customer feedback

---

## 3. Sales

- Quotation (API + **web UI**: list, create, detail; **Mark as sent**, **Mark accepted/rejected**)
- Proforma invoice, Sales order (API + **web UI**: list, create; link from quotation)
- Delivery challan (API + **web UI**: list, create; link from order)
- Tax invoice (create, list, get, **edit/PATCH**, payment, print)
- **Link flow:** Quotation → Sales order → Delivery challan → Invoice
- Recurring invoice, Sales return, Credit note (API + **web UI**: list, create; link to invoice)
- Price list, Discount, Commission, Sales target, Performance dashboard
- **Invoice PDF download**, **Global search (Cmd+K)** for customers, invoices, items
- **Pay online** (payment gateway link on invoice)
- WhatsApp invoice sharing, E-signature

---

## 4. Purchase

- Vendor management, Vendor performance, RFQ, Purchase order
- **PO sent to vendor tracking** (sent_at, status: draft/sent; **Mark as sent**; filter sent/pending)
- GRN (API + **web UI**: list, create; link to PO)
- Purchase return, Debit note (API + **web UI**: list, create; link to PO/vendor)
- Vendor payment, Advance payment, TDS, Vendor ledger

---

## 5. Inventory & Warehouse

- Item master, SKU, Batch tracking, Barcode, QR code, Multi warehouse
- Stock transfer (API + **web UI**: list, create; from/to warehouse, lines)
- **Low-stock widget** on dashboard (items below reorder level; link to inventory)
- Reorder alert, Low stock (WhatsApp/email), Dead stock, Expiry
- Valuation (FIFO/LIFO/Weighted), Stock audit, Serial number

---

## 6. Accounting & Finance

- Chart of accounts (**type:** income, expense, asset, liability, equity), Journal entries
- General ledger, Trial balance
- **P&L (real)** from COA types + journal lines
- **Balance sheet (real)** from COA types + journal lines
- **Bank reconciliation** (upload statement, match with journal/payments, reconcile)
- Cash flow, GST reports, TDS reports, Multi-currency, Expense management
- Budget planning, Financial ratio analysis (AI)

---

## 7. Reports & Intelligence

- Dashboard (receivables, payables, summary)
- **Dashboard widgets:** Low stock, Due today (receivables + payables), Overdue follow-ups
- **Ageing report** (receivables/payables 0–30, 31–60, 61–90, 90+ days)
- **Item-wise sales report**, **HSN-wise sales report**
- Sales summary, Purchase summary, GST summary, Ledger, Vendor ledger, TDS summary
- **Real P&L and Balance sheet** (reports page + export)
- 200+ dynamic reports, Custom report builder
- AI business health score, Predictive sales, Expense optimization, Vendor risk, Stock prediction
- WhatsApp summary (Daily/Weekly), **PDF/Excel export** for reports

---

## 8. Integrations

- **WhatsApp Cloud API** (send template messages: invoice link, payment reminder)
- **Razorpay / Stripe** (Pay invoice link, webhook to record payment)
- Tally, Zoho, Shopify, Amazon seller
- SMS, Email SMTP, Google Sheets, Public REST API / webhooks

---

## 9. UX & Product

- **Global search (Cmd+K)** — customers, vendors, invoices, items; jump to detail
- **Empty states** — “Add your first customer / invoice” with CTA on list pages
- **Toast / in-app notification** — success/error after save; optional notification center
- **Dashboard widgets** — Cash flow today, Due today, Low stock, Overdue follow-ups
- **Keyboard shortcuts** (e.g. N for new, Esc to close)
- **Dark mode** (theme toggle, persist preference)

---

## 10. HR & Payroll (Phase 2)

- Employee master, Attendance, Biometric, Leave, Payroll, Salary structure
- PF/ESI, Payslip, Self-service portal, Performance tracking

---

## 11. Production (Phase 2)

- BOM, Production planning, Work order, Machine allocation
- Raw material consumption, Finished goods, WIP, Cost, Machine utilization, Efficiency (AI)

---

## 12. Service (Phase 2)

- Service ticket, AMC (contract, renewal date, link to invoices)
- Task allocation, Field staff, Service invoice, Contract

---

## 13. Mobile (Flutter)

- Web app first; same REST API (`docs/API_FOR_MOBILE.md`).
- Login, Dashboard, Customers list, Invoices list *(done)*
- **Purchase orders list and detail**
- **Payables list**
- **Items and stock**
- **Record payment** from invoice detail
- Push notifications (overdue, low stock, follow-up due)
- Offline support (cache, queue, sync)

---

## 14. Quality & DevOps

- Health check endpoint, Rate limiting, Audit log
- **API integration tests** (auth, CRM, sales, purchase flows)
- **Web e2e tests** (Playwright/Cypress: login, dashboard, create invoice)
- **Backup scheduler** (script or managed); restore steps in DEPLOY
- **Structured logging** (JSON, log level from env)
- **Error tracking** (Sentry or similar for API and web)

---

*All features are gated by tenant subscription and RBAC. For implementation order and checklist, see `docs/TODO.md` (Work queue, Tiers, Backlog).*
