# SMEBUZE — Commands to start & login

Run these from the **project root** (`/Volumes/Data/Product/SMEBUZE`).

---

## Where to pick tasks (make all features work)

**Single place:** **`docs/TODO.md`** → section **"Work queue — do one by one"**.

- **Start at task #1** and do them **in order** (1 → 2 → 3 → …).
- Each task is one concrete item (e.g. "DB migration: add quotation sent_to, sent_at, status" or "Web: Quotations list page").
- When a task is done, mark it `[x]` in the file.
- There are **64 tasks** in the queue; after that, pick from the **Backlog (expanded)** in the same file.

**Quick link:** Open `docs/TODO.md` and search for **"Work queue"** — that’s your task list. No need to decide what’s next; just do the next unchecked `[ ]` in order.

**Auto mode (optional):** Say in Cursor: **"Complete all pending work"** or **"Run SMEBUZE auto completion"**. The agent uses `docs/TODO.md` and the skill in `.cursor/skills/smebuzz-auto-complete/SKILL.md`. See **`AGENTS.md`** for trigger phrases.

---

## Where are the menu and forms?

**Right now:** The website has a **marketing home**, **login**, and an **app** with **sidebar menu** (Dashboard, CRM, Sales, Purchase, Inventory, Accounting, Reports, Organization, Admin, Bulk upload, etc.) and **list/form/edit** pages for companies, branches, users, roles, leads, customers, campaigns, invoices (create/edit), vendors, POs, payables, items, warehouses, stock, COA, journal. **More features** (quotations web UI, sales pipeline kanban, GRN/Debit note pages, etc.) are in the **Work queue** in `docs/TODO.md`.

---

## 1. One-time setup (first time only)

```bash
# Copy env
cp .env.example .env

# Create database (PostgreSQL must be running)
createdb smebuzz

# Run migrations (includes CRM campaigns: contact categories & message templates)
npm run db:migrate

# Seed demo users (password: Password123)
npm run seed:demo

# Optional: seed Ameera IT company with full CRM/sales/purchase data
# npm run seed:ameera
```

---

## 2. Start the app (every time)

**Terminal 1 – API:**
```bash
npm run api:dev
```
→ API: **http://localhost:3000/api/v1**

**Terminal 2 – Website (with login):**
```bash
npm run website:dev
```
→ Website: **http://localhost:3001**  
→ Login: **http://localhost:3001/login**

---

## 3. Login credentials

**Password for all:** `Password123`

| User            | Email                   | Tenant slug |
|-----------------|-------------------------|-------------|
| Super Admin     | `superadmin@smebuzz.com`| *(leave empty)* |
| Tenant Admin    | `admin@demo.com`        | `demo`      |
| Sales Manager   | `sales@demo.com`        | `demo`      |
| Purchase Manager| `purchase@demo.com`     | `demo`      |
| Staff           | `staff@demo.com`        | `demo`      |
| Viewer          | `viewer@demo.com`       | `demo`      |

- **Super Admin:** leave **Tenant slug** blank on the login page.
- **All others:** enter **Tenant slug** = `demo`.

---

## 4. Quick test (curl)

**Super Admin:**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@smebuzz.com","password":"Password123"}' | jq
```

**Tenant user (e.g. Sales Manager):**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@demo.com","password":"Password123","tenantSlug":"demo"}' | jq
```

You should get `access_token` and `user` in the response.


Role	Email	Name
Super Admin	superadmin@smebuzz.com	Super Admin
Tenant Admin	admin@ameera-it.com	Rahul Mehta
Sales Manager	sales@ameera-it.com	Priya Sharma
Purchase Manager	purchase@ameera-it.com	Vikram Singh
Staff	staff@ameera-it.com	Anita Desai
Viewer	viewer@ameera-it.com	Kiran Rao

