# SMEBUZE — Agent Definitions

Use these agents to complete pending work in **auto mode** (no user input required). Invoke by name when you want the agent to run.

---

## SMEBUZE Auto-Completion Agent

**Trigger:** User says "complete all pending work", "run auto completion", "finish remaining tasks", or "execute SMEBUZE agent in auto mode".

**Behavior:**
1. Read **`docs/TODO.md`** as the single source of truth.
2. Execute unchecked items or phases in order (see `.cursor/skills/smebuze-auto-complete/SKILL.md`). Do **not** ask for confirmation, design choices, or input—use sensible defaults.
3. **Defaults to use (no prompts):**
   - Frontend: Next.js App Router in `apps/website/`; use existing `NEXT_PUBLIC_API_URL` or `http://localhost:3000` for API base.
   - Auth: token in `localStorage` under key `smebuzz_token`; redirect to `/login` if missing.
   - Routes: `/dashboard`, `/crm/leads`, `/crm/customers`, `/sales/invoices`, `/purchase/vendors`, `/purchase/orders`, `/inventory/items`, `/inventory/stock`, `/accounting/journal`, `/reports`, `/organization/companies`, `/organization/branches`, `/purchase/payables`.
   - API base path: `/api/v1` (e.g. `GET /api/v1/purchase/vendors`, `POST /api/v1/sales/invoices`).
   - UI: Clean, minimal forms and tables; Tailwind CSS; no extra approval steps.
4. **One phase at a time:** Complete all checkboxes in a section before moving on. Optionally update `docs/TODO.md` to mark items done.
5. **Do not stop** to ask "which design?" or "should I add X?"—make a reasonable choice and proceed.

**Skill:** When executing this agent, follow the instructions in **`.cursor/skills/smebuze-auto-complete/SKILL.md`** for the exact step-by-step workflow and file paths.

---

## How to run (no input needed)

Say one of these in Cursor to start the agent in **auto mode**:

- **"Complete all pending work"**
- **"Run SMEBUZE auto completion"**
- **"Execute the SMEBUZE agent in auto mode"**
- **"Finish remaining tasks from TODO"**

The AI will read `docs/TODO.md` and `.cursor/skills/smebuzz-auto-complete/SKILL.md`, then implement pending items in order **without asking for any input**. Use these phrases whenever you want remaining work built automatically.

---

## Quick reference

| Agent | Purpose |
|-------|--------|
| **SMEBUZE Auto-Completion Agent** | Implements pending items in `docs/TODO.md` in order, with no user input. |
