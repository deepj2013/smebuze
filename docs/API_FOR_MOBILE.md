# SMEBUZE — API contract for mobile clients

This document describes the REST API so a mobile app (e.g. Flutter) can reuse the same backend. Base URL, auth, and main endpoints are listed.

---

## Base URL

- **Development:** `http://localhost:3000` (or your machine IP when testing from device)
- **Production:** Set to your deployed API URL (e.g. `https://api.smebuzz.com`)

All API routes are prefixed with **`/api/v1`**. Example: `POST {BASE_URL}/api/v1/auth/login`.

---

## Authentication

- **Login:** `POST /api/v1/auth/login`  
  Body: `{ "email": string, "password": string, "tenantSlug"?: string }`  
  Response: `{ "access_token": string, "user": { ... } }`  
  For tenant users, include `tenantSlug` (e.g. `"demo"`). For super-admin, omit it.

- **Signup (new organisation):** `POST /api/v1/auth/signup`  
  Body: `{ "orgName", "slug", "email", "password", "name?", "phone?", "plan", "interval", "trial?" }`  
  Response: `{ "access_token", "user", "tenant": { "id", "slug", "plan", "subscription_ends_at" } }`.

- **Register (join tenant):** `POST /api/v1/auth/register`  
  Body: `{ "email", "password", "name?", "phone?", "tenantSlug" }`.  
  Response: `{ "access_token", "user" }` (same as login; JWT).

- **Accept invite:** `POST /api/v1/auth/accept-invite`  
  Body: `{ "token", "password", "name?" }`. Creates user in tenant and returns `{ "access_token", "user" }`.

- **Forgot password:** `POST /api/v1/auth/forgot-password`  
  Body: `{ "email", "tenantSlug"? }`. In development, response may include `resetLink`.

- **Reset password:** `POST /api/v1/auth/reset-password`  
  Body: `{ "token", "newPassword" }`.

- **Current user:** `GET /api/v1/auth/me`  
  Headers: `Authorization: Bearer <access_token>`  
  Response: `{ "user": { ... } }`

- **All other requests:** Send header `Authorization: Bearer <access_token>`. The token carries tenant and permissions; the backend scopes data by tenant.

---

## Main endpoints (all require `Authorization: Bearer <token>`)

| Area | Method | Path | Notes |
|------|--------|------|--------|
| **Reports** | GET | `/api/v1/reports/dashboard` | Summary, receivables, payables |
| **Organization** | GET | `/api/v1/organization/companies` | List companies |
| | POST | `/api/v1/organization/invites` | Create invite (body: `email`, `role_id?`); returns `inviteLink`, `token`, `expiresAt` |
| | GET | `/api/v1/organization/invites` | List pending invites |
| | POST | `/api/v1/organization/companies` | Create company |
| | GET | `/api/v1/organization/companies/:id` | Get company |
| | PATCH | `/api/v1/organization/companies/:id` | Update company |
| | GET | `/api/v1/organization/companies/:companyId/branches` | List branches |
| | POST | `/api/v1/organization/branches` | Create branch (body: `company_id`, `name`, `address?`) |
| | GET | `/api/v1/organization/branches/:id` | Get branch |
| | PATCH | `/api/v1/organization/branches/:id` | Update branch |
| **CRM** | GET | `/api/v1/crm/leads` | List leads (?stage= optional) |
| | POST | `/api/v1/crm/leads` | Create lead |
| | GET | `/api/v1/crm/leads/:id` | Get lead |
| | PATCH | `/api/v1/crm/leads/:id` | Update lead |
| | GET | `/api/v1/crm/customers` | List customers |
| | POST | `/api/v1/crm/customers` | Create customer |
| | GET | `/api/v1/crm/customers/:id` | Get customer |
| | PATCH | `/api/v1/crm/customers/:id` | Update customer |
| **Purchase** | GET | `/api/v1/purchase/vendors` | List vendors |
| | POST | `/api/v1/purchase/vendors` | Create vendor |
| | GET | `/api/v1/purchase/vendors/:id` | Get vendor |
| | PATCH | `/api/v1/purchase/vendors/:id` | Update vendor |
| | GET | `/api/v1/purchase/orders` | List POs |
| | POST | `/api/v1/purchase/orders` | Create PO |
| | GET | `/api/v1/purchase/payables` | Pending payables |
| | POST | `/api/v1/purchase/vendors/:id/payments` | Record vendor payment |
| **Sales** | GET | `/api/v1/sales/invoices` | List invoices (?status= optional) |
| | POST | `/api/v1/sales/invoices` | Create invoice (body: company_id, customer_id or vendor_id, invoice_date, lines[], etc.) |
| | GET | `/api/v1/sales/invoices/:id` | Get invoice |
| | GET | `/api/v1/sales/invoices/pending` | Pending receivables |
| | POST | `/api/v1/sales/invoices/:id/payment` | Record invoice payment |
| | GET | `/api/v1/sales/invoices/:id/print` | Invoice HTML (thermal print) — use in WebView or open in browser |
| **Inventory** | GET | `/api/v1/inventory/items` | List items |
| | POST | `/api/v1/inventory/items` | Create item |
| | GET | `/api/v1/inventory/items/:id` | Get item |
| | PATCH | `/api/v1/inventory/items/:id` | Update item |
| | GET | `/api/v1/inventory/warehouses` | List warehouses |
| | POST | `/api/v1/inventory/warehouses` | Create warehouse |
| | GET | `/api/v1/inventory/warehouses/:id` | Get warehouse |
| | PATCH | `/api/v1/inventory/warehouses/:id` | Update warehouse |
| | GET | `/api/v1/inventory/stock` | Stock (?warehouse_id= optional) |
| **Accounting** | GET | `/api/v1/accounting/coa?company_id=...` | Chart of accounts |
| | GET | `/api/v1/accounting/journal` | Journal entries (?company_id= optional) |
| | POST | `/api/v1/accounting/journal` | Create journal entry |
| **Bulk upload** | POST | `/api/v1/bulk-upload/customers` | Body: `{ "rows": [...] }` |
| | POST | `/api/v1/bulk-upload/items` | Body: `{ "rows": [...] }` |

---

## Errors

- **401:** Missing or invalid token → re-login.
- **403:** Forbidden (e.g. missing permission or wrong tenant).
- **404:** Resource not found.
- Responses typically include `{ "message": string }` or `{ "error": string }`.

---

## Tenant slug

- Stored at login; for tenant users, include `tenantSlug` in the login request. The returned JWT encodes tenant and permissions; subsequent requests only need the Bearer token.

---

*For full request/response shapes, refer to the API code (NestJS DTOs and controllers) or run the API and inspect the routes.*
