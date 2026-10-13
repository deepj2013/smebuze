'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { SIGNUP_BUSINESS_TYPES } from '@/lib/business-types';
import {
  NAV_LOCKED_KEYS,
  NAV_MENU_CATALOG,
  navKey,
  parseNavHidden,
  sanitizeNavHidden,
} from '@/lib/nav-menu-config';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  features?: string[];
  subscription_ends_at?: string | null;
  license_key?: string | null;
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

type AccountKind = 'demo' | 'real';

function accountKind(t: Tenant): AccountKind {
  const saved = t.settings?.account_kind;
  if (saved === 'demo' || saved === 'real') return saved;
  const slug = t.slug.toLowerCase();
  const name = t.name.toLowerCase();
  if (slug.startsWith('demo') || slug.startsWith('pos-') || name.startsWith('demo ')) return 'demo';
  return 'real';
}

const PLANS = ['basic', 'advanced', 'enterprise', 'ai_pro'];
/** Core modules. Empty Features = all core modules. Opt-in packs below are only on when listed. */
const FEATURES = ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'bulk_upload', 'audit', 'ai', 'whatsapp', 'storefront', 'catalog', 'lead_hub'];
/** Must be turned on by universal admin for that tenant — not self-serve onboarding. */
const OPT_IN_PACKS = [
  { id: 'recipe_production', label: 'Recipe / production costing', hint: 'Raw materials → finished goods (e.g. Gulab Jamun). Tenant admin then maintains recipes.' },
  { id: 'accounting_export', label: 'Accounting export', hint: 'Export day-book files for Tally, Busy, Marg upload. No live login to those apps.' },
] as const;

function featureList(raw: string | undefined): string[] {
  return (raw || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function hasOptIn(raw: string | undefined, id: string): boolean {
  return featureList(raw).includes(id);
}

function setOptIn(raw: string | undefined, id: string, on: boolean): string {
  const set = new Set(featureList(raw));
  if (on) set.add(id);
  else set.delete(id);
  return Array.from(set).join(', ');
}

export default function AdminTenantsPage() {
  const [list, setList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name?: string;
    plan?: string;
    features?: string;
    subscription_ends_at?: string;
    license_key?: string;
    is_active?: boolean;
    business_type?: string;
    books_locked?: boolean;
    books_through?: string;
    account_kind?: AccountKind;
    nav_hidden?: string[];
  }>({});
  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | AccountKind>('all');
  const [users, setUsers] = useState<{ id: string; email: string; name?: string | null; is_active?: boolean; email_verified?: boolean }[]>([]);
  const [userEdits, setUserEdits] = useState<Record<string, string>>({});
  const [userBusy, setUserBusy] = useState<string | null>(null);
  const [menusOpen, setMenusOpen] = useState(false);
  const hiddenSet = useMemo(() => new Set(editForm.nav_hidden ?? []), [editForm.nav_hidden]);

  const load = async () => {
    const { data, error: err } = await apiGet<Tenant[] | { data: Tenant[] }>('tenants');
    if (err) setError(err);
    else if (Array.isArray(data)) setList(data);
    else if (data && typeof data === 'object' && Array.isArray((data as { data?: Tenant[] }).data)) setList((data as { data: Tenant[] }).data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleNavKey = (key: string, show: boolean) => {
    if (NAV_LOCKED_KEYS.has(key)) return;
    setEditForm((f) => {
      const next = new Set(f.nav_hidden ?? []);
      if (show) next.delete(key);
      else next.add(key);
      return { ...f, nav_hidden: Array.from(next) };
    });
  };

  const toggleNavGroup = (label: string, childKeys: string[], show: boolean) => {
    const groupKey = navKey({ label });
    setEditForm((f) => {
      const next = new Set(f.nav_hidden ?? []);
      if (show) {
        next.delete(groupKey);
        childKeys.forEach((k) => next.delete(k));
      } else {
        if (!NAV_LOCKED_KEYS.has(groupKey)) next.add(groupKey);
        childKeys.forEach((k) => {
          if (!NAV_LOCKED_KEYS.has(k)) next.add(k);
        });
      }
      return { ...f, nav_hidden: Array.from(next) };
    });
  };

  const handleEdit = (t: Tenant) => {
    setEditingId(t.id);
    setError(null);
    setNotice(null);
    setMenusOpen(false);
    setEditForm({
      name: t.name,
      plan: t.plan ?? 'basic',
      features: Array.isArray(t.features) ? t.features.join(', ') : '',
      subscription_ends_at: t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '',
      license_key: t.license_key ?? '',
      is_active: t.is_active !== false,
      business_type: String(t.settings?.business_type ?? ''),
      books_locked: Boolean((t.settings?.period_lock as { enabled?: boolean } | undefined)?.enabled),
      books_through: String((t.settings?.period_lock as { through?: string } | undefined)?.through ?? '').slice(0, 7),
      account_kind: accountKind(t),
      nav_hidden: parseNavHidden(t.settings ?? null),
    });
    setUsers([]);
    setUserEdits({});
    apiGet<{ id: string; email: string; name?: string | null; is_active?: boolean; email_verified?: boolean }[]>(`tenants/${t.id}/users`).then((r) => {
      if (r.error) setError(r.error);
      else if (Array.isArray(r.data)) {
        setUsers(r.data);
        const emails: Record<string, string> = {};
        r.data.forEach((u) => { emails[u.id] = u.email; });
        setUserEdits(emails);
      }
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    const features = editForm.features ? editForm.features.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const { error: err } = await apiPatch(`tenants/${editingId}`, {
      name: editForm.name || undefined,
      plan: editForm.plan || undefined,
      features,
      subscription_ends_at: editForm.subscription_ends_at || null,
      license_key: editForm.license_key || null,
      is_active: editForm.is_active,
      settings: {
        business_type: editForm.business_type || 'trading',
        period_lock: {
          enabled: !!editForm.books_locked,
          through: editForm.books_through || '',
        },
        account_kind: editForm.account_kind === 'real' ? 'real' : 'demo',
        nav_hidden: sanitizeNavHidden(editForm.nav_hidden ?? []),
      },
    });
    if (err) setError(err);
    else {
      setEditingId(null);
      load();
    }
  };

  const filtered = list.filter((t) => {
    const s = q.trim().toLowerCase();
    const matchesText = !s || t.name.toLowerCase().includes(s) || t.slug.toLowerCase().includes(s) || (t.plan ?? '').toLowerCase().includes(s);
    if (!matchesText) return false;
    if (kindFilter === 'all') return true;
    return accountKind(t) === kindFilter;
  });

  if (loading) return <p className="text-slate-600">Loading tenants…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Platform tenants</h1>
      <p className="text-sm text-slate-600 mb-4">
        You are signed in as the universal (platform) admin. You set up each tenant account here — demo vs real, plan, business type, which menus/submenus that workspace shows, and opt-in packs such as recipe costing or Tally/Busy/Marg export. Shop staff do not turn packs on themselves. Tenant admins can also hide menus under Organization → Menus for their own workspace.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or slug"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <span className="text-xs text-slate-500">{filtered.length} of {list.length} workspaces</span>
        {(['all', 'demo', 'real'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${kindFilter === kind ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
          >
            {kind === 'all' ? 'All' : kind === 'demo' ? 'Demo' : 'Real'}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-medium text-slate-700">Workspace</th>
              <th className="text-left p-3 font-medium text-slate-700">Slug</th>
              <th className="text-left p-3 font-medium text-slate-700">Plan</th>
              <th className="text-left p-3 font-medium text-slate-700">Type</th>
              <th className="text-left p-3 font-medium text-slate-700">Account</th>
              <th className="text-left p-3 font-medium text-slate-700">Active</th>
              <th className="text-left p-3 font-medium text-slate-700">Expires</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 align-top">
                {editingId === t.id ? (
                  <>
                    <td className="p-3" colSpan={8}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-xs text-slate-600">Name
                          <input
                            type="text"
                            value={editForm.name ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600">Plan
                          <select
                            value={editForm.plan ?? 'basic'}
                            onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-slate-600">Business type
                          <select
                            value={editForm.business_type ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, business_type: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          >
                            <option value="">—</option>
                            {SIGNUP_BUSINESS_TYPES.map((b) => (
                              <option key={b.id} value={b.id}>{b.title}</option>
                            ))}
                            <option value="ice_crest">Ice Crest</option>
                            <option value="restaurant_wholesale">Restaurant wholesale</option>
                          </select>
                        </label>
                        <label className="text-xs text-slate-600">Subscription ends
                          <input
                            type="date"
                            value={editForm.subscription_ends_at ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, subscription_ends_at: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-2">Features (comma-separated)
                          <input
                            type="text"
                            value={editForm.features ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, features: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                            placeholder={FEATURES.join(', ')}
                          />
                        </label>
                        <label className="text-xs text-slate-600 sm:col-span-2">Licence key
                          <input
                            type="text"
                            value={editForm.license_key ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, license_key: e.target.value }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600">Account
                          <select
                            value={editForm.account_kind ?? 'real'}
                            onChange={(e) => setEditForm((f) => ({ ...f, account_kind: e.target.value === 'demo' ? 'demo' : 'real' }))}
                            className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
                          >
                            <option value="demo">Demo account</option>
                            <option value="real">Real account</option>
                          </select>
                        </label>
                        <p className="text-xs text-slate-500 sm:col-span-2">Demo is a sample or trial workspace. Real is a paying customer. This label is for you only. It does not change what that workspace can open.</p>
                        <label className="text-sm text-slate-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_active !== false}
                            onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                          />
                          Workspace is active (uncheck to pause login)
                        </label>
                        <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-950">Opt-in packs (you enable per tenant)</p>
                          <p className="text-xs text-amber-900/90">These stay off until you tick them. They do not appear on cashier or staff menus as setup. After you enable, the tenant admin can use the screens.</p>
                          {OPT_IN_PACKS.map((pack) => (
                            <label key={pack.id} className="flex items-start gap-2 text-sm text-slate-800">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={hasOptIn(editForm.features, pack.id)}
                                onChange={(e) => setEditForm((f) => ({ ...f, features: setOptIn(f.features, pack.id, e.target.checked) }))}
                              />
                              <span>
                                <span className="font-medium">{pack.label}</span>
                                <span className="block text-xs text-slate-600">{pack.hint}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="sm:col-span-2 flex flex-wrap gap-2 items-center">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                            onClick={async () => {
                              const on = !(editForm.features || '').includes('lead_hub');
                              const { error: err, data } = await apiPost<{ features?: string[] }>(
                                `admin/storefronts/${t.id}/lead-hub`,
                                { enabled: on },
                              );
                              if (err) setError(err);
                              else {
                                setNotice(on ? 'Lead hub enabled' : 'Lead hub disabled');
                                if (data?.features) {
                                  setEditForm((f) => ({ ...f, features: data.features!.join(', ') }));
                                }
                                load();
                              }
                            }}
                          >
                            Toggle Lead hub (live feeds + ingest)
                          </button>
                          <span className="text-xs text-slate-500">
                            Also include <code>lead_hub</code> in Features above, or leave Features empty for all core modules (opt-in packs still need a tick).
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                        <button
                          type="button"
                          onClick={() => setMenusOpen((o) => !o)}
                          className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-900"
                        >
                          <span>Menus &amp; submenus for this tenant</span>
                          <span className="text-xs font-normal text-slate-500">
                            {(editForm.nav_hidden?.length ?? 0) > 0
                              ? `${editForm.nav_hidden!.length} hidden · ${menusOpen ? 'Hide' : 'Edit'}`
                              : menusOpen
                                ? 'Hide'
                                : 'Show all · Edit'}
                          </span>
                        </button>
                        <p className="mt-1 text-xs text-slate-600">
                          Untick to hide from this workspace sidebar. Shop type and permissions still apply. Tenant admin can change the same list under Organization → Menus.
                        </p>
                        {menusOpen && (
                          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto border-t border-slate-100 pt-3">
                            <div className="mb-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditForm((f) => ({ ...f, nav_hidden: [] }))}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                              >
                                Show all
                              </button>
                            </div>
                            {NAV_MENU_CATALOG.map((node) => {
                              const groupKey = navKey(node);
                              const childKeys = (node.children || []).map((c) => navKey(c));
                              const groupLocked = NAV_LOCKED_KEYS.has(groupKey);
                              const groupOn = !hiddenSet.has(groupKey);
                              return (
                                <div key={groupKey} className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={groupOn}
                                      disabled={groupLocked}
                                      onChange={(e) =>
                                        node.children?.length
                                          ? toggleNavGroup(node.label, childKeys, e.target.checked)
                                          : toggleNavKey(groupKey, e.target.checked)
                                      }
                                    />
                                    {node.label}
                                    {groupLocked && <span className="text-[10px] font-normal text-slate-500">Always on</span>}
                                  </label>
                                  {node.children && (
                                    <ul className="mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                                      {node.children.map((child) => {
                                        const key = navKey(child);
                                        const locked = NAV_LOCKED_KEYS.has(key);
                                        return (
                                          <li key={key}>
                                            <label className="flex items-center gap-2 text-xs text-slate-700">
                                              <input
                                                type="checkbox"
                                                checked={!hiddenSet.has(key) && groupOn}
                                                disabled={locked || !groupOn}
                                                onChange={(e) => toggleNavKey(key, e.target.checked)}
                                              />
                                              {child.label}
                                              {locked && <span className="text-[10px] text-slate-400">Always on</span>}
                                            </label>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={!!editForm.books_locked}
                            onChange={(e) => setEditForm((f) => ({ ...f, books_locked: e.target.checked }))}
                          />
                          Lock closed months
                        </label>
                        <p className="mt-1 text-xs text-slate-600">When this is on, invoices, credit notes, debit notes, and payment receipts dated on or before the end of the chosen month cannot be added, edited, or deleted. Turn it off to allow corrections.</p>
                        <label className="mt-2 block text-xs font-medium text-slate-700">Books closed through
                          <input
                            type="month"
                            value={editForm.books_through ?? ''}
                            onChange={(e) => setEditForm((f) => ({ ...f, books_through: e.target.value }))}
                            className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={handleSave} className="rounded-lg bg-brand-600 text-white px-3 py-1.5 text-sm font-medium">Save workspace</button>
                        <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Cancel</button>
                      </div>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-slate-800">Login users</h3>
                        <p className="text-xs text-slate-500 mb-3">Change the mailbox used for sign-in and forgot-password. Send reset posts a 6-digit code from support@smebuze.com.</p>
                        {users.length === 0 ? (
                          <p className="text-sm text-slate-500">No users on this workspace yet. Run the tenant seed or invite staff.</p>
                        ) : (
                          <ul className="space-y-2">
                            {users.map((u) => (
                              <li key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <input
                                  type="email"
                                  value={userEdits[u.id] ?? u.email}
                                  onChange={(e) => setUserEdits((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                  className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                                />
                                <span className="text-xs text-slate-500 shrink-0">{u.is_active === false ? 'Paused' : 'Active'}{u.email_verified === false ? ' · email not confirmed' : ''}</span>
                                <button
                                  type="button"
                                  disabled={userBusy === u.id}
                                  onClick={async () => {
                                    setUserBusy(u.id);
                                    const { error: err } = await apiPatch(`tenants/${t.id}/users/${u.id}`, { email: userEdits[u.id] ?? u.email });
                                    setUserBusy(null);
                                    if (err) setError(err);
                                    else handleEdit(t);
                                  }}
                                  className="text-sm text-brand-600 hover:underline disabled:opacity-50"
                                >
                                  Save email
                                </button>
                                <button
                                  type="button"
                                  disabled={userBusy === u.id}
                                  onClick={async () => {
                                    setUserBusy(u.id);
                                    const { error: err } = await apiPost(`tenants/${t.id}/users/${u.id}/send-reset`, {});
                                    setUserBusy(null);
                                    if (err) setError(err);
                                    else {
                                      setError(null);
                                      setNotice(`Reset mail sent to ${userEdits[u.id] ?? u.email}. Ask them to check inbox and spam.`);
                                    }
                                  }}
                                  className="text-sm text-slate-700 hover:underline disabled:opacity-50"
                                >
                                  Send reset mail
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">{t.slug}</td>
                    <td className="p-3">{t.plan ?? '—'}</td>
                    <td className="p-3 text-slate-600">{String(t.settings?.business_type ?? '—')}</td>
                    <td className="p-3">
                      {accountKind(t) === 'demo'
                        ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Demo</span>
                        : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Real</span>}
                    </td>
                    <td className="p-3">{t.is_active === false ? <span className="text-red-600">Paused</span> : <span className="text-emerald-700">Active</span>}</td>
                    <td className="p-3">{t.subscription_ends_at ? String(t.subscription_ends_at).slice(0, 10) : '—'}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => handleEdit(t)} className="text-brand-600 hover:underline">Configure</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">No tenants match this search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
