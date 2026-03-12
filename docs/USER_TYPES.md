# SMEBUZE — User types in detail

Vendor can be **both seller and buyer**; **payment paid** (we pay vendor) and **payment received** (customer/vendor pays us) are both supported. All APIs below are **dynamic** (tenant-scoped, permission-checked).

---

## 1. User types and what they can do

| Type | Who | Scope | Main permissions | Use case |
|------|-----|--------|------------------|----------|
| **Super Admin** | Platform (SMEBUZE) | All tenants | `*` (all) | Create tenants, manage platform, no tenant_id |
| **Tenant Admin** | Your organisation admin | One tenant | All org.*, all module create/view, reports.view | Setup company/branch, users, roles |
| **Sales Manager** | Sales head | One tenant | sales.*, crm.lead.*, crm.customer.*, reports.view | Invoices, customers, receivables, dashboard |
| **Purchase Manager** | Purchase head | One tenant | purchase.*, reports.view | Vendors, POs, payables, record payment paid |
| **Staff** | Day-to-day operator | One tenant | sales.invoice.*, crm.customer.view, purchase.vendor.view, inventory.item.view, reports.view | Create invoice, view data, print |
| **Viewer** | Read-only | One tenant | *.view, reports.view | View only; no create/update |

---

## 2. Vendor as seller and buyer

- **Vendor as seller**: You buy from them → **Purchase** (PO, GRN). You **pay them** → `POST /api/v1/purchase/vendors/:id/payments` (payment paid).
- **Vendor as buyer**: You sell to them → **Sales** invoice with `vendor_id` (no `customer_id`). They **pay you** → `POST /api/v1/sales/invoices/:id/payment` (payment received).

Same vendor can appear in both purchase orders and sales invoices.

---

## 3. Payment paid vs payment received

| Flow | API | Table / field |
|------|-----|----------------|
| **Payment received** (customer/vendor pays us) | `POST /sales/invoices/:id/payment` | `invoice_payments`, `sales_invoices.paid_amount` |
| **Payment paid** (we pay vendor) | `POST /purchase/vendors/:id/payments` | `vendor_payments`, `purchase_orders.paid_amount` (if `purchase_order_id` in body) |

Dashboard (`GET /reports/dashboard`) returns both **receivables** (pending sales invoices) and **payables** (pending POs).

---

## 4. Permissions per user type (for role creation)

Use these when creating roles (e.g. via future admin API or seed).

**Tenant Admin** (all in-tenant actions):

- org.company.create, org.company.view, org.company.update  
- org.branch.create, org.branch.view, org.branch.update  
- org.user.create, org.user.view, org.role.manage  
- crm.*, sales.*, purchase.*, inventory.item.*, inventory.stock.view  
- accounting.coa.view, accounting.journal.create, accounting.journal.view  
- reports.view  

**Sales Manager:**

- crm.lead.create, crm.lead.view, crm.lead.update  
- crm.customer.create, crm.customer.view, crm.customer.update  
- sales.quotation.create, sales.quotation.view, sales.order.create, sales.order.view  
- sales.invoice.create, sales.invoice.view  
- reports.view  

**Purchase Manager:**

- purchase.vendor.create, purchase.vendor.view  
- purchase.order.create, purchase.order.view  
- reports.view  

**Staff:**

- crm.customer.view, sales.invoice.create, sales.invoice.view  
- purchase.vendor.view, purchase.order.view  
- inventory.item.view, inventory.stock.view  
- reports.view  

**Viewer:**

- org.company.view, org.branch.view, org.user.view  
- crm.lead.view, crm.customer.view  
- sales.quotation.view, sales.order.view, sales.invoice.view  
- purchase.vendor.view, purchase.order.view  
- inventory.item.view, inventory.stock.view  
- accounting.coa.view, accounting.journal.view  
- reports.view  

---

## 5. How to create each user type

1. **Super Admin**  
   - Insert into `users`: `tenant_id = NULL`, `is_super_admin = true`, set `password_hash` (bcrypt).  
   - Login with that email **without** `tenantSlug`; JWT will have `tenantId: null` and full access.

2. **Tenant Admin / Manager / Staff / Viewer**  
   - Ensure tenant and company exist.  
   - Run role seed for that tenant (e.g. `007_seed_example_roles.sql` with your `tenant_id`).  
   - Register: `POST /auth/register` with `tenantSlug` and assign role: insert into `user_roles` (user_id, role_id) for the chosen role.  
   - Or create user via future user API and assign role.

---

## 6. Dynamic APIs checklist (all tenant-scoped)

| Module | Endpoints | Notes |
|--------|-----------|--------|
| **Auth** | POST login, register, me | Public: login, register; rest JWT |
| **Tenants** | POST /, GET /, GET /:id | Super-admin only |
| **Organization** | POST/GET companies, POST/GET branches | Tenant-scoped |
| **CRM** | POST/GET leads, POST/GET customers | Tenant-scoped |
| **Sales** | POST/GET invoices, GET pending, POST :id/payment, GET :id/print | Invoice to customer or vendor |
| **Purchase** | POST/GET vendors, POST/GET orders, POST vendors/:id/payments, GET payables | Payment paid here |
| **Inventory** | POST/GET warehouses, POST/GET items, GET stock | Tenant-scoped |
| **Accounting** | GET coa, POST/GET journal | Tenant-scoped |
| **Reports** | GET dashboard | Receivables + payables |
| **Bulk** | POST customers, items | Stub |
| **Integrations** | POST whatsapp/webhook | Public |

All of the above (except public routes) use JWT and enforce permissions via `RequirePermissions`; list/get/create are consistent per resource.
