'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPatch } from '@/lib/api';
import { code39Svg } from '@/lib/counter-desk';
import { RefreshCw } from 'lucide-react';

type LabelItem = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  mrp?: string | number | null;
  unit?: string | null;
};

export default function BarcodeLabelsPage() {
  const searchParams = useSearchParams();
  const focusItemId = searchParams.get('item') || '';
  const [items, setItems] = useState<LabelItem[]>([]);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const load = useCallback(() => {
    void apiGet<LabelItem[] | { data: LabelItem[] }>('inventory/items?purpose=sale').then((res) => {
      if (res.error) setError(res.error);
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setItems(list);
      if (focusItemId) {
        setCopies((prev) => ({ ...prev, [focusItemId]: prev[focusItemId] || 1 }));
      }
    });
  }, [focusItemId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.name} ${item.sku || ''} ${item.barcode || ''}`.toLowerCase();
      return hay.includes(q) || hay.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
    });
  }, [items, query]);

  const selected = useMemo(
    () =>
      items.flatMap((item) => {
        const code = (item.barcode || item.sku || '').trim();
        const count = copies[item.id] || 0;
        if (!code || count <= 0) return [];
        return Array.from({ length: Math.min(count, 40) }, (_, index) => ({
          ...item,
          code,
          key: `${item.id}-${index}`,
        }));
      }),
    [items, copies],
  );

  const generateBarcode = async (item: LabelItem) => {
    setGeneratingId(item.id);
    setError(null);
    setStatus(null);
    const { data, error: err } = await apiGet<{ barcode?: string } | string>('inventory/items/next-barcode');
    if (err) {
      setGeneratingId(null);
      setError(err);
      return;
    }
    const code =
      typeof data === 'string'
        ? data.trim()
        : data && typeof data === 'object' && typeof data.barcode === 'string'
          ? data.barcode
          : '';
    if (!code) {
      setGeneratingId(null);
      setError('Could not generate barcode.');
      return;
    }
    const { error: saveErr } = await apiPatch(`inventory/items/${item.id}`, { barcode: code });
    setGeneratingId(null);
    if (saveErr) {
      setError(saveErr);
      return;
    }
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, barcode: code } : row)));
    setCopies((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, 1) }));
    setStatus(`Barcode ${code} saved on ${item.name}. Print stickers below.`);
  };

  return (
    <div>
      <Link href="/inventory/items" className="mb-3 inline-block text-sm text-slate-600">
        ← Products
      </Link>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Barcode labels</h1>
          <p className="mt-1 text-sm text-slate-600">
            Print stickers for thermal or sticky paper. Search by name, SKU or barcode to reprint a damaged label.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={selected.length === 0}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Print {selected.length} label{selected.length === 1 ? '' : 's'}
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-700 print:hidden">{error}</p>}
      {status && <p className="mb-3 text-sm text-emerald-700 print:hidden">{status}</p>}

      <div className="mb-3 flex flex-wrap gap-2 print:hidden">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, SKU or barcode to reprint…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[44px] sm:max-w-md"
        />
      </div>

      <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white print:hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Barcode</th>
              <th className="p-2 text-right">MRP</th>
              <th className="p-2 text-right">Copies</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const code = (item.barcode || item.sku || '').trim();
              const focused = item.id === focusItemId;
              return (
                <tr key={item.id} className={`border-t border-slate-100 ${focused ? 'bg-sky-50' : ''}`}>
                  <td className="p-2 font-medium text-slate-900">{item.name}</td>
                  <td className="p-2 font-mono text-xs text-slate-600">{item.sku || '—'}</td>
                  <td className="p-2 font-mono text-xs">{item.barcode || <span className="text-amber-700">None</span>}</td>
                  <td className="p-2 text-right">₹{Number(item.mrp || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={copies[item.id] || 0}
                      disabled={!code}
                      onChange={(e) =>
                        setCopies((prev) => ({
                          ...prev,
                          [item.id]: Math.max(0, Math.min(40, Number(e.target.value) || 0)),
                        }))
                      }
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-50"
                    />
                  </td>
                  <td className="p-2 text-right">
                    {!item.barcode?.trim() ? (
                      <button
                        type="button"
                        onClick={() => void generateBarcode(item)}
                        disabled={generatingId === item.id}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${generatingId === item.id ? 'animate-spin' : ''}`} />
                        Generate code
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCopies((prev) => ({ ...prev, [item.id]: Math.max(prev[item.id] || 0, 1) }))}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reprint
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No products match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        {selected.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-300 bg-white p-2 text-center break-inside-avoid">
            <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
            <div className="my-1 flex justify-center" dangerouslySetInnerHTML={{ __html: code39Svg(item.code) }} />
            <p className="font-mono text-[11px] text-slate-700">{item.code}</p>
            {item.sku && item.sku !== item.code && (
              <p className="text-[10px] text-slate-500">SKU {item.sku}</p>
            )}
            <p className="text-sm font-bold">MRP ₹{Number(item.mrp || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-sm text-slate-500 print:hidden">Set copies above (or Generate code), then Print.</p>
      )}
    </div>
  );
}
