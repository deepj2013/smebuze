'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

interface Item {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  category?: string | null;
  hsn_sac?: string | null;
  image_urls?: string[];
}

export default function ItemsPage() {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Item[] | { data: Item[] }>('inventory/items');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Item[] }).data)) setList((data as { data: Item[] }).data);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Items</h1>
        <Link href="/inventory/items/new" className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700">Add item</Link>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700 w-12">Image</th>
                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                <th className="text-left p-3 font-medium text-slate-700">SKU</th>
                <th className="text-left p-3 font-medium text-slate-700">Barcode</th>
                <th className="text-left p-3 font-medium text-slate-700">Unit</th>
                <th className="text-left p-3 font-medium text-slate-700">Category</th>
                <th className="text-left p-3 font-medium text-slate-700">HSN/SAC</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-slate-500">No items yet.</td></tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-2">
                      {item.image_urls?.length ? (
                        <img src={item.image_urls[0]} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
                      ) : (
                        <span className="w-10 h-10 flex items-center justify-center rounded bg-slate-100 text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">{item.sku ?? '—'}</td>
                    <td className="p-3 font-mono text-xs">{item.barcode ?? '—'}</td>
                    <td className="p-3">{item.unit ?? '—'}</td>
                    <td className="p-3">{item.category ?? '—'}</td>
                    <td className="p-3">{item.hsn_sac ?? '—'}</td>
                    <td className="p-3"><Link href={`/inventory/items/${item.id}/edit`} className="text-brand-600 hover:underline text-sm">Edit</Link></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
