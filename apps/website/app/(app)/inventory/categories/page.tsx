'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { useToast } from '../../components/ToastContext';
import PosSwitcher from '../../components/PosSwitcher';

interface Category {
  id: string;
  name: string;
  sort_order?: number;
}

export default function CategoriesPage() {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await apiGet<Category[]>('inventory/categories');
    if (error) showError(error);
    else if (Array.isArray(data)) setList(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await apiPost('inventory/categories', { name: name.trim() });
    setSaving(false);
    if (error) showError(error);
    else {
      setName('');
      success('Category added.');
      load();
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-600">Group the menu or shelf. Then add items under a category.</p>
        </div>
        <Link href="/pos/manage" className="text-sm font-medium text-brand-700 hover:underline">Shop manager</Link>
      </div>
      <form onSubmit={add} className="mb-4 flex gap-2 max-w-lg">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm min-h-[44px]"
        />
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Add'}
        </button>
      </form>
      {loading ? (
        <p className="text-slate-600">Loading…</p>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-w-lg">
          <ul>
            {list.length === 0 && <li className="p-4 text-slate-500 text-sm">No categories yet.</li>}
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="flex gap-3 text-sm">
                  <button type="button" onClick={() => rename(c)} className="text-brand-600 hover:underline">Rename</button>
                  <button type="button" onClick={() => archive(c)} className="text-slate-500 hover:underline">Hide</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
