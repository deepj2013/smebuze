'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import PosSwitcher from '../../components/PosSwitcher';

interface StockRow {
  id?: string;
  item_id?: string;
  warehouse_id?: string;
  quantity?: string | number;
  reserved?: string | number;
  item?: { name?: string; sku?: string };
  warehouse?: { name?: string };
}

export default function StockPage() {
  const [list, setList] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [short, setShort] = useState<{ item_id: string; name: string; current_stock: number; reorder_level: number }[]>([]);

  useEffect(() => {
    apiGet<StockRow[] | { data: StockRow[] }>(`inventory/stock${warehouseId ? `?warehouse_id=${warehouseId}` : ''}`).then((res) => {
      if (res.error) setError(res.error);
      else if (Array.isArray(res.data)) setList(res.data);
      else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as { data?: StockRow[] }).data)) setList((res.data as { data: StockRow[] }).data);
      setLoading(false);
    });
  }, [warehouseId]);

  useEffect(() => {
    apiGet<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>('inventory/warehouses').then((r) => {
      const d = r.data;
      const arr = Array.isArray(d) ? d : (d as { data?: { id: string; name: string }[] })?.data ?? [];
      setWarehouses(arr);
    });
    apiGet<{ item_id: string; name: string; current_stock: number; reorder_level: number }[]>('inventory/stock/low').then((r) => {
      if (Array.isArray(r.data)) setShort(r.data);
    });
  }, []);

  return (
    <div>
      <PosSwitcher />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Stock</h1>
        <Link href="/inventory/stock/receive" className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm font-medium hover:bg-brand-700">Add stock (receive)</Link>
      </div>
      {short.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">Short items</p>
          <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-sm text-amber-900">
            {short.map((s) => (
              <li key={s.item_id} className="flex justify-between gap-2">
                <span>{s.name}</span>
                <span className="tabular-nums">Stock {s.current_stock}{s.reorder_level ? ` / alert ${s.reorder_level}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mr-2">Warehouse</label>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Item</th>
                <th className="text-left p-3 font-medium text-slate-700">Warehouse</th>
                <th className="text-right p-3 font-medium text-slate-700">Quantity</th>
                <th className="text-right p-3 font-medium text-slate-700">Reserved</th>
                <th className="text-right p-3 font-medium text-slate-700">Available</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">No stock records.</td></tr>
              ) : (
                list.map((row, i) => (
                  <tr key={row.id ?? i} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{row.item?.name ?? row.item?.sku ?? '—'}</td>
                    <td className="p-3">{row.warehouse?.name ?? '—'}</td>
                    <td className="p-3 text-right">{Number(row.quantity ?? 0)}</td>
                    <td className="p-3 text-right">{Number(row.reserved ?? 0)}</td>
                    <td className="p-3 text-right font-semibold">{Number(row.quantity ?? 0)-Number(row.reserved ?? 0)}</td>
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
