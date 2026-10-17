'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { categorySetupTip, categorySuggestionsFor } from '@/lib/category-suggestions';
import { useToast } from '../../components/ToastContext';
import PosSwitcher from '../../components/PosSwitcher';

interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  sort_order?: number;
}

export default function CategoriesPage() {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [businessType, setBusinessType] = useState<string>('');
  const [isDept, setIsDept] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);

  const suggestions = useMemo(() => categorySuggestionsFor(businessType), [businessType]);
  const existingNames = useMemo(
    () => new Set(list.map((c) => c.name.trim().toLowerCase())),
    [list],
  );

  const load = async () => {
    const { data, error } = await apiGet<Category[]>('inventory/categories');
    if (error) showError(error);
    else if (Array.isArray(data)) setList(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    apiGet<{ tenant?: { settings?: { business_type?: string } } }>('auth/me').then(({ data }) => {
      const type = data?.tenant?.settings?.business_type || '';
      setBusinessType(type);
      setIsDept(type === 'department_store');
    });
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await apiPost('inventory/categories', { name: name.trim(), parent_id: parentId || null });
    setSaving(false);
    if (error) showError(error);
    else {
      setName('');
      setParentId('');
      success('Category added.');
      load();
    }
  };

  const ensureCategory = async (catName: string, parent?: string | null) => {
    const key = catName.trim().toLowerCase();
    const underSameParent = list.find(
      (c) => c.name.trim().toLowerCase() === key && (parent ? c.parent_id === parent : !c.parent_id),
    );
    if (underSameParent) return underSameParent;
    const { data, error } = await apiPost<Category>('inventory/categories', {
      name: catName.trim(),
      parent_id: parent || null,
    });
    if (error) throw new Error(error);
    return data!;
  };

  const addSuggestion = async (dept: string, sub?: string) => {
    const mark = sub ? `${dept}/${sub}` : dept;
    setAddingSuggestion(mark);
    try {
      if (isDept) {
        const parent = await ensureCategory(dept, null);
        if (sub) await ensureCategory(sub, parent.id);
        success(sub ? `Added ${dept} → ${sub}` : `Added department ${dept}`);
      } else {
        await ensureCategory(sub || dept, null);
        success(`Added ${sub || dept}`);
      }
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not add category');
    } finally {
      setAddingSuggestion(null);
    }
  };

  const addAllSuggestions = async () => {
    setAddingSuggestion('__all__');
    try {
      for (const row of suggestions) {
        if (isDept) {
          const parent = await ensureCategory(row.name, null);
          for (const sub of row.subs || []) {
            await ensureCategory(sub, parent.id);
          }
        } else {
          await ensureCategory(row.name, null);
          for (const sub of row.subs || []) {
            await ensureCategory(sub, null);
          }
        }
      }
      success('Suggested shelves added. Edit or hide any you do not need.');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not add suggestions');
    } finally {
      setAddingSuggestion(null);
    }
  };

  const rename = async (c: Category) => {
    const next = window.prompt('Rename category', c.name);
    if (!next?.trim() || next.trim() === c.name) return;
    const { error } = await apiPatch(`inventory/categories/${c.id}`, { name: next.trim() });
    if (error) showError(error);
    else {
      success('Renamed.');
      load();
    }
  };

  const archive = async (c: Category) => {
    if (!window.confirm(`Hide category “${c.name}”? Items stay; you can still use the name on items.`)) return;
    const { error } = await apiPatch(`inventory/categories/${c.id}`, { is_active: false });
    if (error) showError(error);
    else load();
  };

  return (
    <div>
      <PosSwitcher />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-600">
            {isDept
              ? 'Departments on the left of the counter, and a subcategory under each one.'
              : 'Group the menu or shelf. Then add items under a category.'}
          </p>
        </div>
        <Link href="/pos/manage" className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
          Shop manager
        </Link>
      </div>

      <div className="mb-5 max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Suggested shelves</p>
            <p className="mt-1 text-xs text-slate-600">{categorySetupTip(businessType)}</p>
          </div>
          <button
            type="button"
            disabled={!!addingSuggestion}
            onClick={() => void addAllSuggestions()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {addingSuggestion === '__all__' ? 'Adding…' : 'Add all suggestions'}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {suggestions.map((row) => {
            const deptExists = existingNames.has(row.name.toLowerCase());
            return (
              <div key={row.name}>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!!addingSuggestion || (isDept && deptExists && !(row.subs?.length))}
                    onClick={() => void addSuggestion(row.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px] ${
                      deptExists
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100'
                    } disabled:opacity-50`}
                  >
                    {addingSuggestion === row.name ? '…' : row.name}
                    {deptExists ? ' ✓' : ' +'}
                  </button>
                  {(row.subs || []).map((sub) => {
                    const subExists = existingNames.has(sub.toLowerCase());
                    const mark = `${row.name}/${sub}`;
                    return (
                      <button
                        key={sub}
                        type="button"
                        disabled={!!addingSuggestion || subExists}
                        onClick={() => void addSuggestion(row.name, sub)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium min-h-[32px] ${
                          subExists
                            ? 'border border-slate-200 bg-slate-50 text-slate-500'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                        } disabled:opacity-50`}
                      >
                        {addingSuggestion === mark ? '…' : sub}
                        {subExists ? ' ✓' : ' +'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={add} className="mb-4 flex max-w-xl flex-col gap-2 sm:flex-row">
        {isDept && (
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
          >
            <option value="">Department</option>
            {list
              .filter((c) => !c.parent_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  Under {c.name}
                </option>
              ))}
          </select>
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your own category name"
          className="min-h-[44px] flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </form>
      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul>
            {list.length === 0 && <li className="p-4 text-sm text-slate-500">No categories yet — tap a suggestion above.</li>}
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                <span className="font-medium text-slate-900">
                  {c.parent_id ? `${list.find((p) => p.id === c.parent_id)?.name || 'Department'} / ${c.name}` : c.name}
                </span>
                <span className="flex gap-3 text-sm">
                  <button type="button" onClick={() => rename(c)} className="text-brand-600 hover:underline">
                    Rename
                  </button>
                  <button type="button" onClick={() => archive(c)} className="text-slate-500 hover:underline">
                    Hide
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
