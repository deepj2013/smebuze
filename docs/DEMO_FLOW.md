# SMEBUZE — Demo flow: Vendor → Item → Invoice → Pending → Dashboard → Print

Use this flow to demonstrate: create vendor, create item, generate invoice (with HSN/GST), see pending payments, dashboard for all users, and print invoice (thermal / standard).

**Vendor as seller and buyer:** You can raise a **sales invoice to a vendor** (vendor as buyer) by sending `vendor_id` instead of `customer_id`. **Payment received** = customer/vendor pays you (sales invoice payment). **Payment paid** = you pay vendor (record via `POST /purchase/vendors/:id/payments`). See [USER_TYPES.md](USER_TYPES.md) for user types and permission matrix.

## Prerequisites

1. Run migrations (001–005) and seed (004).
2. Create a **tenant** (super-admin): `POST /api/v1/tenants` with `{ "name": "Demo Co", "slug": "demo", "plan": "advanced" }`.
3. Create a **company** (as tenant user): `POST /api/v1/organization/companies` with `{ "name": "Demo Company", "gstin": "29XXXXX1234X1Z5" }`.
4. Get **JWT** by logging in as a user belonging to that tenant (register or create user + assign role with `sales.invoice.create`, `sales.invoice.view`, `reports.view`, `purchase.vendor.create`, `inventory.item.create`, `crm.customer.create`). Use `Authorization: Bearer <token>` for all below.

---

## 1. Create vendor

```http
POST /api/v1/purchase/vendors
Content-Type: application/json

{
  "name": "ABC Suppliers",
  "phone": "9876543210",
  "gstin": "27XXXXX1234X1Z5",
  "address": { "line1": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001" }
}
```

---

## 2. Create item

```http
POST /api/v1/inventory/items
Content-Type: application/json

{
  "name": "Widget A",
  "sku": "WDG-001",
  "hsn_sac": "8471",
  "unit": "pcs",
  "category": "Electronics"
}
```

Use the returned `id` as `item_id` in invoice lines (optional).

---

## 3. Create customer

```http
POST /api/v1/crm/customers
Content-Type: application/json

{
  "name": "Customer XYZ",
  "phone": "9123456789",
  "gstin": "29XXXXX5678X1Z9",
  "address": { "line1": "456 Park Ave", "city": "Bangalore", "state": "Karnataka", "pincode": "560001" }
}
```

Note the `id` and `company_id` (if you use company-scoped customer).

---

## 4. Generate invoice (with HSN and GST)

**Option A – Invoice to customer:** use `customer_id`. **Option B – Invoice to vendor (vendor as buyer):** use `vendor_id` instead of `customer_id` (do not send both).

```http
POST /api/v1/sales/invoices
Content-Type: application/json

{
  "company_id": "<company_id from step 0>",
  "customer_id": "<customer_id from step 3>",
  "invoice_date": "2025-02-25",
  "due_date": "2025-03-25",
  "lines": [
    {
      "item_id": "<item_id from step 2>",
      "hsn_sac": "8471",
      "description": "Widget A",
      "qty": 10,
      "unit": "pcs",
      "rate": 100,
      "cgst_rate": 9,
      "sgst_rate": 9
    },
    {
      "hsn_sac": "9983",
      "description": "Service charges",
      "qty": 1,
      "rate": 500,
      "cgst_rate": 9,
      "sgst_rate": 9
    }
  ]
}
```

Response includes invoice `id`, `number`, `total`, `subtotal`, `tax_amount`, `paid_amount` (0). Use `id` for payment and print.

---

## 5. View pending payments

```http
GET /api/v1/sales/invoices/pending
```

Returns `{ "invoices": [...], "totalPending": <sum of (total - paid) for unpaid/partial invoices> }`. Each invoice has `id`, `number`, `customer`, `total`, `paid_amount`, and balance due.

---

## 6. Dashboard (all users with reports.view)

```http
GET /api/v1/reports/dashboard
```

Returns:

- `summary`: `totalInvoiced`, `totalPaid`, `totalPending`, `pendingCount`, `invoiceCount`
- `pendingInvoices`: first 10 pending with `id`, `number`, `customer`, `total`, `paid`, `due`, `due_date`

---

## 7. Record payment (partial or full)

```http
POST /api/v1/sales/invoices/<invoice_id>/payment
Content-Type: application/json

{
  "amount": 500,
  "payment_date": "2025-02-25",
  "mode": "cash",
  "reference": "CHQ-001"
}
```

Invoice `paid_amount` and `status` (partial/paid) update. Pending and dashboard reflect the new balance.

---

## 8. Print invoice (thermal / standard)

```http
GET /api/v1/sales/invoices/<invoice_id>/print
```

Returns **HTML** suitable for thermal (80mm width) with:

- Company name, legal name, GSTIN, address
- Bill To: customer name, GSTIN, address
- Invoice no., date, due date
- Line table: **HSN/SAC**, description, qty, rate, taxable value, **CGST %**, **CGST amount**, **SGST %**, **SGST amount**
- Subtotal, Tax (GST), Total, Paid, **Amount due**
- Standard tax invoice wording

Open in browser and print to thermal printer, or use a print service that accepts HTML.

---

## Summary

| Step | Action              | Endpoint                                  |
|------|---------------------|-------------------------------------------|
| 1    | Create vendor       | `POST /purchase/vendors`                  |
| 2    | Create item         | `POST /inventory/items`                  |
| 3    | Create customer     | `POST /crm/customers`                    |
| 4    | Generate invoice    | `POST /sales/invoices` (HSN, GST lines)  |
| 5    | Pending payments    | `GET /sales/invoices/pending`            |
| 6    | Dashboard           | `GET /reports/dashboard`                 |
| 7    | Record payment      | `POST /sales/invoices/:id/payment`       |
| 8    | Print (thermal)     | `GET /sales/invoices/:id/print`          |
| —    | **Payment paid** (we pay vendor) | `POST /purchase/vendors/:id/payments` with `amount`, `payment_date`, optional `purchase_order_id`, `mode`, `reference` |
| —    | **Payables**        | `GET /purchase/payables`                 |

All endpoints are tenant-scoped and require JWT. For **user types** (Super Admin, Tenant Admin, Sales/Purchase Manager, Staff, Viewer) and permission matrix, see [USER_TYPES.md](USER_TYPES.md). Seed example roles: run migration `007_seed_example_roles.sql` after replacing `YOUR_TENANT_ID` with your tenant UUID.
