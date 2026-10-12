'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { code39Svg } from '@/lib/counter-desk';

type LabelItem = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  mrp?: string | number | null;
  unit?: string | null;
};

export default function BarcodeLabelsPage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<LabelItem[] | { data: LabelItem[] }>('inventory/items?purpose=sale').then((res) => {
      if (res.error) setError(res.error);
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setItems(list);
    });
  }, []);

  const selected = useMemo(
    () => items.flatMap((item) => {
      const code = (item.barcode || item.sku || '').trim();
      const count = copies[item.id] || 0;
      if (!code || count <= 0) return [];
      return Array.from({ length: Math.min(count, 40) }, (_, index) => ({ ...item, code, key: `${item.id}-${index}` }));
    }),
    [items, copies],
  );

  return (
    <div>
      <Link href="/inventory/items" className="mb-3 inline-block text-sm text-slate-600">← Products</Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Barcode labels</h1>
          <p className="mt-1 text-sm text-slate-600">Choose how many stickers to print. The scanner reads the bars. The price on the sticker is MRP.</p>
        </div>
        <button type="button" onClick={() => window.print()} disabled={selected.length === 0} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Print {selected.length} label{selected.length === 1 ? '' : 's'}
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-700">{error}</p>}
      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white print:hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Code</th>
              <th className="p-2 text-right">MRP</th>
              <th className="p-2 text-right">Copies</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const code = (item.barcode || item.sku || '').trim();
              return (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 font-mono text-xs">{code || 'Add a barcode on the product'}</td>
                  <td className="p-2 text-right">₹{Number(item.mrp || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={copies[item.id] || 0}
                      disabled={!code}
                      onChange={(e) => setCopies((prev) => ({ ...prev, [item.id]: Math.max(0, Math.min(40, Number(e.target.value) || 0)) }))}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-right"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {selected.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-300 bg-white p-2 text-center">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <div className="my-1 flex justify-center" dangerouslySetInnerHTML={{ __html: code39Svg(item.code) }} />
            <p className="font-mono text-[11px] text-slate-700">{item.code}</p>
            <p className="text-sm font-bold">MRP ₹{Number(item.mrp || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
