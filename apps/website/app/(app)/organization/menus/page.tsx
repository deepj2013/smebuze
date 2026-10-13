'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import {
  NAV_LOCKED_KEYS,
  NAV_MENU_CATALOG,
  navKey,
  parseNavHidden,
} from '@/lib/nav-menu-config';

export default function OrganizationMenusPage() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    (async () => {
      const [menuRes, meRes] = await Promise.all([
        apiGet<{ nav_hidden?: string[] }>('organization/nav-menu'),
        apiGet<{ tenant?: { name?: string; settings?: Record<string, unknown> } }>('auth/me'),
      ]);
      if (menuRes.error) setError(menuRes.error);
      else setHidden(Array.isArray(menuRes.data?.nav_hidden) ? menuRes.data!.nav_hidden! : parseNavHidden(meRes.data?.tenant?.settings));
      if (meRes.data?.tenant?.name) setTenantName(meRes.data.tenant.name);
      setLoading(false);
    })();
  }, []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  const toggle = (key: string, show: boolean) => {
    if (NAV_LOCKED_KEYS.has(key)) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (show) next.delete(key);
      else next.add(key);
      return Array.from(next);
    });
  };

  const toggleGroup = (label: string, childKeys: string[], show: boolean) => {
    const groupKey = navKey({ label });
    setHidden((prev) => {
      const next = new Set(prev);
      if (show) {
        next.delete(groupKey);
        childKeys.forEach((k) => next.delete(k));
      } else {
        if (!NAV_LOCKED_KEYS.has(groupKey)) next.add(groupKey);
        childKeys.forEach((k) => {
          if (!NAV_LOCKED_KEYS.has(k)) next.add(k);
        });
      }
      return Array.from(next);
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: err } = await apiPatch<{ nav_hidden: string[] }>('organization/nav-menu', { nav_hidden: hidden });
    setSaving(false);
    if (err) setError(err);
    else {
      setHidden(data?.nav_hidden ?? hidden);
      setNotice('Menus saved. Updating sidebar…');
      window.setTimeout(() => window.location.reload(), 600);
    }
  };

  if (loading) return <p className="text-slate-600">Loading menus…</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Organization</p>
          <h1 className="text-2xl font-bold text-slate-900">Menus</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose which menus and submenus this workspace shows{tenantName ? ` for ${tenantName}` : ''}. Untick to hide. Shop type and permissions still apply.
          </p>
        </div>
        <Link href="/organization/companies" className="text-sm text-slate-600 hover:underline">← Organization</Link>
      </div>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</div>}

      <div className="space-y-3">
        {NAV_MENU_CATALOG.map((node) => {
          const groupKey = navKey(node);
          const childKeys = (node.children || []).map((c) => navKey(c));
          const groupLocked = NAV_LOCKED_KEYS.has(groupKey);
          const groupOn = !hiddenSet.has(groupKey);
          return (
            <section key={groupKey} className="rounded-xl border border-slate-200 bg-white p-3">
              <label className="flex items-center gap-2 font-semibold text-slate-900">
                <input
                  type="checkbox"
                  checked={groupOn}
                  disabled={groupLocked}
                  onChange={(e) => (node.children?.length ? toggleGroup(node.label, childKeys, e.target.checked) : toggle(groupKey, e.target.checked))}
                />
                {node.label}
                {groupLocked && <span className="text-[11px] font-normal text-slate-500">Always on</span>}
              </label>
              {node.children && (
                <ul className="mt-2 space-y-1 border-l border-slate-100 pl-4">
                  {node.children.map((child) => {
                    const key = navKey(child);
                    const locked = NAV_LOCKED_KEYS.has(key);
                    return (
                      <li key={key}>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!hiddenSet.has(key) && groupOn}
                            disabled={locked || !groupOn}
                            onChange={(e) => toggle(key, e.target.checked)}
                          />
                          {child.label}
                          {locked && <span className="text-[11px] text-slate-400">Always on</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-4 flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save menus'}
        </button>
        <button type="button" onClick={() => setHidden([])} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
          Show all
        </button>
      </div>
    </div>
  );
}
