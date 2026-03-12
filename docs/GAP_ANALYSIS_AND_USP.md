# SMEBUZE — Gap Analysis & USP Enhancement

**Purpose:** Single document that (1) lists all **missing gaps** between current product and vision, and (2) proposes **new USPs and enhancements** to make SMEBUZE more useful and differentiated for MSME users.

**References:** PRD, FEATURES, TODO.md, STATUS.

---

## Executive summary

| Dimension | Current state | Vision (PRD/FEATURES) |
|-----------|----------------|------------------------|
| **Core ERP** | Vendors, POs, payables, invoices, items, stock, COA, journal, dashboard | Same + Quotations, orders, challan, credit/debit notes, GRN, ledger, P&L, GST reports |
| **Reports** | Dashboard only (receivables/payables summary) | Report engine + 5+ reports + PDF/Excel export |
| **Bulk** | UI + API stub (no real insert) | Real CSV parse, validate, preview, insert |
| **Admin** | Users/departments pages exist | Full user/role management, invite by email, custom roles |
| **AI / WhatsApp** | Campaigns AI samples; WhatsApp stub | Business health score, WhatsApp send/receive, summary |
| **UX** | No global search, no toast system, minimal empty states | Search, notifications, guided flows, better discoverability |
| **Quality** | No automated tests, no health/rate-limit | Tests, health check, rate limiting, audit log |

---

## Part 1 — Gap analysis (prioritized)

### Critical (blocks “sellable” MVP)

| # | Gap | Where | Impact |
|---|-----|--------|--------|
| 1 | **Bulk upload does not insert data** | `bulk-upload.controller.ts` returns “validation and import coming soon”; frontend parses CSV but backend does not persist | Users cannot onboard customers/items at scale; promise of “bulk upload” is broken |
| 2 | **Reports = dashboard only** | `reports.controller.ts` has only `GET dashboard`; Reports page shows “Coming soon” for Sales, Purchase, Inventory, GST | No way to get period-wise or exportable reports; limits trust and compliance use |
| 3 | **Licensing / feature flags not enforced** | Tenants have `license_key`, `features` in DB but no guard/middleware checks them | Cannot sell tiered plans or disable modules per tenant |
| 4 | **Invoice cannot be edited** | Sales API has create, list, get, payment, print — no PATCH for invoice or lines | Corrections require workarounds; poor UX for typo fixes |

### High (module completeness)

| # | Gap | Where | Impact |
|---|-----|--------|--------|
| 5 | **User/role management incomplete** | Invite flow: no email delivery; custom role builder and “assign permissions to role” not fully wired | Tenant admin cannot safely onboard team or least-privilege roles |
| 6 | **No quotations / sales orders / challan** | Only invoices exist in Sales | Pre-sales and delivery workflow missing; PRD promises quotation → order → challan → invoice |
| 7 | **No GRN / debit note in Purchase** | Purchase has vendors, POs, payables, payments only | Cannot record goods receipt or purchase returns properly |
| 8 | **No stock transfer or low-stock alert** | Inventory has items, warehouses, stock read; no transfer API or alert job | Multi-warehouse ops and reorder decisions are manual |
| 9 | **No general ledger / P&L / Balance sheet** | Accounting has COA and journal only | No financial statements for period close or reporting |
| 10 | **No GST report** | Invoice lines have HSN/GST but no aggregated GST report or GSTR-style summary | Compliance and filing support missing |

### Medium (differentiators & production)

| # | Gap | Where | Impact |
|---|-----|--------|--------|
| 11 | **WhatsApp not connected** | Integrations: webhook stub only; Campaigns “Send message” is UI-only | “WhatsApp-first” USP not delivered |
| 12 | **No AI business health or summary** | No health score API; no “How was my business?” style summary | “AI-Powered” is underdelivered beyond campaign message samples |
| 13 | **No health check / rate limiting** | No `/api/v1/health`; no throttler on login or public routes | Ops and security baseline missing for production |
| 14 | **No audit log** | No `audit_logs` write on login, user/role change, or sensitive actions | Compliance and debugging harder |
| 15 | **Forgot-password email not sent** | Forgot-password API exists but email provider not integrated; dev returns link in response | Users in production cannot reset password |
| 16 | **Campaign “Send message” does not send** | Campaigns page shows success but does not call any send API or queue | Marketing promise of campaigns not fulfilled |

### UX & discoverability

| # | Gap | Where | Impact |
|---|-----|--------|--------|
| 17 | **No global search** | App has no Cmd+K or header search for customers, invoices, items, etc. | Power users cannot jump quickly to entities |
| 18 | **No in-app notification/toast system** | Success/error only inline per page | No consistent feedback; no “notification center” for async results |
| 19 | **Sales menu: Pending receivables not in sidebar** | Sidebar has only “Invoices” under Sales; pending receivables at `/sales/invoices/pending` | Key cash-flow screen less discoverable |
| 20 | **Empty states minimal** | Many list pages could show “Add your first customer” with clear CTA and illustration | New users may not know what to do next |
| 21 | **No Customer 360** | No single customer page with details + last invoices + payments + follow-ups | Sales and support need a unified view |

### Quality & docs

| # | Gap | Where | Impact |
|---|-----|--------|--------|
| 22 | **No automated tests** | No project-level unit/integration/e2e tests (only node_modules spec) | Regressions and refactors are risky |
| 23 | **No downloadable CSV templates** | Bulk upload page describes headers but no “Download sample” for customers/items | Users guess column names and fail |
| 24 | **Data export not implemented** | Tenant admin cannot “Export my data” (GDPR-style) | Compliance and portability gap |

### Already in roadmap (TODO.md)

- TDS on vendor payment, GSTIN validation, GSTR-style summary (Tier 4.2)
- Data export, backup/restore (Tier 4.3)
- Admin app, custom roles, on-prem doc (Tier 5)
- Mobile expansion (Tier 5)

---

## Part 2 — New USPs and enhancements (to make product more useful)

### A. User value (day-to-day usefulness)

| USP / Enhancement | Description | Why it helps |
|-------------------|-------------|--------------|
| **1. One-screen “Cash flow today”** | Dashboard widget or report: “Due today” (receivables + payables with due date = today) with one-click “Record payment” | Puts daily cash action in one place; reduces context switching |
| **2. Quick actions in header** | Header bar: “New invoice”, “New customer”, “Record payment” (or Cmd+K command palette) | Faster data entry without drilling menu |
| **3. Global search (Cmd+K)** | Search across customers, vendors, invoices (number), items by name/SKU; jump to detail or create | Saves time for frequent users; feels modern |
| **4. “First-time” guided flows** | After signup: “Create your first invoice in 3 steps” with progress and skip; link from empty dashboard | Reduces time-to-first-value and churn |
| **5. Smart defaults** | New invoice: default “Due in 30 days”, last used HSN, last used branch; new PO: last vendor | Fewer clicks and errors |
| **6. Pending receivables in Sales menu** | Add “Pending receivables” under Sales in sidebar (link to `/sales/invoices/pending`) | Better discoverability for collection workflow |
| **7. Low-stock widget on dashboard** | Card: “Items below reorder level” with count and link to inventory/items filtered | Proactive reorder; aligns with “alert” in FEATURES |
| **8. Download CSV templates** | Bulk upload: “Download sample (customers)” / “Download sample (items)” with correct headers and 2–3 example rows | Fewer failed uploads; faster onboarding |

### B. Trust and compliance (India / global)

| USP / Enhancement | Description | Why it helps |
|-------------------|-------------|--------------|
| **9. GST summary by return period** | Report: GST by period (e.g. monthly), by HSN, CGST/SGST/IGST; optional GSTR-1 style summary | Directly supports filing and audits |
| **10. GSTIN format validation** | Validate GSTIN on company, branch, customer, vendor (format + optional checksum) and show clear error | Reduces wrong data in reports |
| **11. Audit trail for money and master data** | Audit log for: invoice create/void, payment, PO, journal entry, user/role change; view in admin or “Activity” tab | Trust and dispute resolution |
| **12. “Export my data”** | Tenant admin: “Export all my data” → ZIP with CSV/JSON for customers, invoices, items, etc. (async for large tenants) | GDPR-style portability and backup |

### C. AI and automation (differentiators)

| USP / Enhancement | Description | Why it helps |
|-------------------|-------------|--------------|
| **13. Business health score (API + widget)** | Input: receivables, payables, recent sales, low stock; output: score 1–10 + 2–3 line text; optional dashboard widget | Single “how am I doing?” signal; shareable with banker/partner |
| **14. “How was my business last month?” (WhatsApp or in-app)** | One-tap or WhatsApp keyword → AI summary: revenue, top customer, top product, pending receivables | Fits “WhatsApp-first” and busy owners |
| **15. Payment reminder automation** | Optional: X days after due date, send WhatsApp/email reminder (using campaign templates + invoice link) | Reduces manual follow-up |
| **16. AI-assisted line items** | In invoice form: “Suggest from last invoice” or “Suggest HSN from description” | Speeds data entry and consistency |

### D. Team and scale

| USP / Enhancement | Description | Why it helps |
|-------------------|-------------|--------------|
| **17. Invite by email** | Tenant admin: invite by email + role → system sends “Join SMEBUZE” link (with email provider) | Proper team onboarding |
| **18. Role templates** | Presets: “Sales”, “Purchase”, “Accountant”, “Viewer” with permissions; tenant can clone and tweak | Faster role setup |
| **19. Plan/feature gating in UI** | When module is disabled by plan: show “Upgrade to Advanced to use Reports” with link to pricing | Clear upsell path |

### E. Product positioning (marketing and messaging)

| USP / Enhancement | Description | Why it helps |
|-------------------|-------------|--------------|
| **20. “Go live in a day” proof** | Onboarding checklist + bulk upload + sample data: “Import 100 customers in 5 minutes” with video or doc | Reinforces “configure only what you need” and time-to-value |
| **21. “India-first, global-ready”** | Explicit messaging: GST/TDS/Indian formats out of the box; multi-currency and multi-country for expansion | Clarifies target and differentiates |
| **22. Transparent roadmap** | Public roadmap (e.g. “Next: GST report, WhatsApp send”) so users see commitment | Builds trust and sets expectations |

---

## Part 3 — Suggested implementation order

Align with **`docs/TODO.md`** and fill gaps in this order:

1. **Close critical gaps (sellable MVP)**  
   - Real bulk upload (parse, validate, preview, insert).  
   - Report engine + at least 5 reports (Sales summary, Purchase summary, GST summary, Ledger summary, Dashboard) + PDF/Excel for 2.  
   - Feature-flag guard + super-admin set plan/features.  
   - Invoice PATCH (edit header + lines) and wire edit in UI.

2. **UX quick wins**  
   - Pending receivables in Sales menu.  
   - Download CSV templates on bulk upload page.  
   - Low-stock widget on dashboard (once reorder/low-stock API exists).  
   - Optional: global search (Cmd+K) for customers, invoices, items.

3. **Production baseline**  
   - Health check, rate limiting, audit log (Tier 4.1).  
   - Forgot-password email integration.

4. **Differentiators**  
   - WhatsApp send (one template); AI business health score (API + optional widget).  
   - Then: GST report, general ledger, P&L/Balance sheet.

5. **Module depth**  
   - Quotations, sales orders, GRN, stock transfer, credit/debit notes as in TODO.md Tiers 2.3–2.6.

Use this doc alongside **TODO.md** for backlog refinement and sprint planning.
