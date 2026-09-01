'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface Category {
  id: string;
  name: string;
}

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [custom, setCustom] = useState(false);

  useEffect(() => {
    apiGet<Category[]>('inventory/categories').then((r) => {
      if (Array.isArray(r.data)) setCategories(r.data);
    });
  }, []);

  useEffect(() => {
    if (value && categories.length && !categories.some((c) => c.name === value)) setCustom(true);
  }, [value, categories]);

  const createNew = async () => {
    const name = window.prompt('New category name');
    if (!name?.trim()) return;
    const { data, error } = await apiPost<Category>('inventory/categories', { name: name.trim() });
    if (error || !data?.name) {
      onChange(name.trim());
      return;
    }
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(data.name);
    setCustom(false);
  };

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => setCustom(false)} className="text-xs text-slate-500 shrink-0">
          List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="">—</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <button type="button" onClick={createNew} className="shrink-0 rounded border border-slate-300 px-2 text-xs font-medium text-slate-700">
        New
      </button>
    </div>
  );
}
