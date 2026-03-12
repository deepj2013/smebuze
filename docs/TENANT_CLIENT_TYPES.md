# Tenant client types — uniform vs customized

## Problem

- Some clients want the **uniform product** (standard flows, no customizations).
- Other clients have **custom requirements** by type (e.g. restaurant/wholesale, manufacturing, retail chain).
- We need one codebase that serves both without breaking the standard product or mixing custom logic for one client into others.

## Solution: tenant profile / business type

Use **one tenant-level setting** to decide behaviour:

- **Uniform (default):** No custom flows. Tenant uses only the standard product.
- **Custom client type:** Tenant gets standard product **plus** gated features for that type. No impact on other tenants.

### How it works

| Aspect | Uniform tenants | Custom-type tenants (e.g. restaurant_wholesale) |
|--------|------------------|-------------------------------------------------|
| **Identifier** | `tenant.settings.business_type` is missing, `'standard'`, or not in our list | `tenant.settings.business_type === 'restaurant_wholesale'` (or future values) |
| **Product** | Standard modules only (CRM, Sales, Purchase, Inventory, etc.) | Same standard product **plus** type-specific features (gated in API/UI) |
| **Data** | Only standard tables/columns | Optional additive schema (e.g. delivery_challan_lines, signed_challan_image_url) used only when type is set |
| **Seeds** | Generic demo seed (e.g. demo, ameera-it) | One seed per client type (e.g. seed-tenant-restaurant-wholesale.js) |

### Where we gate

- **Backend:** Before enabling a custom flow (e.g. challan lines, consolidated invoice), resolve tenant (e.g. from JWT) and check `tenant.settings.business_type === '<type>'`. If not set or different, skip or 404 that behaviour.
- **Frontend:** After login, use `GET /api/v1/auth/me` which returns `tenant: { slug, settings }`. If `tenant?.settings?.business_type === '<type>'`, show type-specific menu items, forms, and reports; otherwise show only standard UI.
- **DB:** Add optional columns/tables that are **additive** (nullable or new tables). Standard flows never depend on them; only custom-type code reads/writes them.

This keeps the core product **uniform** and **stable**; customizations are **add-ons** by tenant type.

---

## Known client types (registry)

Keep this as the single list of supported custom types. Add a new row when we onboard a new client type.

| `business_type` value | Description | Doc / seed |
|-----------------------|------------|------------|
| `restaurant_wholesale` | Truck → warehouse; restaurant/retail orders; delivery challan with signature; per-customer price; consolidated monthly invoice | [TENANT_RESTAURANT_WHOLESALE.md](./TENANT_RESTAURANT_WHOLESALE.md), `scripts/seed-tenant-restaurant-wholesale.js` |
| *(first client)* | **Star ICE** – ice wholesale; delivery challan + consolidated monthly bill format; same flow as above | [TENANT_STAR_ICE.md](./TENANT_STAR_ICE.md), `scripts/seed-tenant-star-ice.js` |
| *(future)* | e.g. `manufacturing`, `retail_chain` | Add doc + seed when needed |

Tenants **not** in this list (or with no `business_type`) are **uniform** and get no custom flows.

**Backend:** Use `apps/api/src/common/tenant-client-types.ts` for constants and helpers (e.g. `isRestaurantWholesale(tenant.settings)`). Add new types there when you add a new client type.

---

## Adding a new client type (checklist)

1. **Define the type**
   - Choose a stable `business_type` string (e.g. `retail_chain`).
   - Document required flows and any new/optional schema in a dedicated doc (e.g. `docs/TENANT_RETAIL_CHAIN.md`).

2. **Schema (if needed)**
   - Add migrations that are **additive** (new tables or nullable columns). Do not change existing behaviour for tenants that don’t use this type.

3. **Backend**
   - Implement APIs for the new flows.
   - In those APIs (or a guard/middleware), resolve tenant and check `tenant.settings.business_type === '<new_type>'`. Return 403/404 or skip logic for other tenants.
   - Expose tenant in auth (e.g. `/auth/me` already returns `tenant.settings`) so frontend can gate.

4. **Frontend**
   - Use `tenant?.settings?.business_type` from `/auth/me` to show/hide type-specific routes, menu items, and forms. No change to standard pages for other tenants.

5. **Seed**
   - Add a seed script (e.g. `scripts/seed-tenant-<type>.js`) that creates a tenant with `settings.business_type = '<new_type>'`, plus sample org, users, and data. Document in the type’s doc.

6. **Registry**
   - Add the new type to the “Known client types” table above.

---

## Optional: per-module override (future)

If one tenant ever needs “standard sales but custom inventory”, we can extend to a **per-module** profile, e.g.:

- `tenant.settings.profiles = { sales: 'standard', inventory: 'warehouse_advanced' }`

For now, **one `business_type` per tenant** is enough: either uniform or one custom type. We can introduce `profiles` when a real client needs a mix.

---

## Summary

- **Uniform clients:** No (or `standard`) `business_type` → standard product only.
- **Custom clients:** Set `tenant.settings.business_type` to a known type → standard product + gated features for that type.
- **New type:** Additive schema + gated API/UI + seed + doc + one row in the registry. Core product stays unchanged.

This gives a single, scalable approach for “same product for some, customized for others” without branching the codebase per client.
