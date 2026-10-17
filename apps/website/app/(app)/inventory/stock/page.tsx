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
  batch_code?: string | null;
  expiry_date?: string | Date | null;
  item?: { name?: string; sku?: string; brand?: string | null };
  warehouse?: { name?: string };
}

type ExpiringRow = {
  id: string;
  name: string;
  expiry_date: string;
  days_left: number;
  quantity: number;
  status: 'expired' | 'this_week' | 'this_month' | 'upcoming';
};

export default function StockPage() {
  const [list, setList] = useState<StockRow[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [short, setShort] = useState<{ item_id: string; name: string; current_stock: number; reorder_level: number }[]>([]);
  const [expiring, setExpiring] = useState<ExpiringRow[]>([]);

  useEffect(() => {
    setLoading(true);
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
    apiGet<ExpiringRow[]>('inventory/stock/expiring?within_days=30').then((r) => {
      if (Array.isArray(r.data)) setExpiring(r.data.slice(0, 8));
    });
  }, []);

  const formatExpiry = (raw: string | Date | null | undefined) => {
    if (!raw) return '—';
    return String(raw).slice(0, 10);
  };

  return (
    <div>
      <PosSwitcher />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Stock</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory/stock/expiring"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
          >
            Soon to expire{expiring.length > 0 ? ` (${expiring.length}+)` : ''}
          </Link>
          <Link
            href="/inventory/stock/receive"
            className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add stock (receive)
          </Link>
        </div>
      </div>
      {short.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">Short items</p>
          <ul className="mt-2 grid gap-1 text-sm text-amber-900 sm:grid-cols-2">
            {short.map((s) => (
              <li key={s.item_id} className="flex justify-between gap-2">
                <span>{s.name}</span>
                <span className="tabular-nums">
                  Stock {s.current_stock}
                  {s.reorder_level ? ` / alert ${s.reorder_level}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-orange-950">Expiring in the next 30 days</p>
            <Link href="/inventory/stock/expiring" className="text-sm font-medium text-orange-900 underline">
              View all
            </Link>
          </div>
          <ul className="mt-2 grid gap-1 text-sm text-orange-950 sm:grid-cols-2">
            {expiring.map((row) => (
              <li key={row.id} className="flex justify-between gap-2">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums">
                  {row.status === 'expired'
                    ? `Expired · qty ${row.quantity}`
                    : `${row.expiry_date} · ${row.days_left}d · qty ${row.quantity}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-4">
        <label className="mr-2 text-sm font-medium text-slate-700">Warehouse</label>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="responsive-table-wrap">
            <table className="w-full table-min-width text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 text-left font-medium text-slate-700">Item</th>
                  <th className="p-3 text-left font-medium text-slate-700">Warehouse</th>
                  <th className="p-3 text-left font-medium text-slate-700">Batch</th>
                  <th className="p-3 text-left font-medium text-slate-700">Expiry</th>
                  <th className="p-3 text-right font-medium text-slate-700">Quantity</th>
                  <th className="p-3 text-right font-medium text-slate-700">Reserved</th>
                  <th className="p-3 text-right font-medium text-slate-700">Available</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-slate-500">
                      No stock records.
                    </td>
                  </tr>
                ) : (
                  list.map((row, i) => (
                    <tr key={row.id ?? i} className="border-b border-slate-100 last:border-0">
                      <td className="p-3">{row.item?.name ?? row.item?.sku ?? '—'}</td>
                      <td className="p-3">{row.warehouse?.name ?? '—'}</td>
                      <td className="p-3">{row.batch_code || '—'}</td>
                      <td className="p-3 tabular-nums">{formatExpiry(row.expiry_date)}</td>
                      <td className="p-3 text-right">{Number(row.quantity ?? 0)}</td>
                      <td className="p-3 text-right">{Number(row.reserved ?? 0)}</td>
                      <td className="p-3 text-right font-semibold">
                        {Number(row.quantity ?? 0) - Number(row.reserved ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
