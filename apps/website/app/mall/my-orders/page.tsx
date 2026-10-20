'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { readMallPhone, saveMallPhone } from '@/lib/mall-local';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

type OrderRow = {
  tracking_token: string;
  track_path: string;
  order_number: string | null;
  seller_name: string;
  status: string;
  payment_status: string;
  total: number;
  delivery_mode: string;
  created_at: string | null;
};

export default function MallMyOrdersPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async (rawPhone: string) => {
    const p = rawPhone.replace(/\D/g, '').slice(-10);
    if (p.length !== 10) {
      setError('Enter your 10-digit mobile');
      return;
    }
    setLoading(true);
    setError('');
    saveMallPhone(p);
    try {
      const res = await fetch(`${API}/api/v1/public/mall/orders/by-phone?phone=${encodeURIComponent(p)}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Could not load orders');
      setOrders(Array.isArray(j.orders) ? j.orders : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = readMallPhone();
    if (saved) {
      setPhone(saved);
      void fetchOrders(saved);
    }
  }, [fetchOrders]);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    await fetchOrders(phone);
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/mall" className="text-sm text-brand-600 hover:underline">← Mall</Link>
      <h1 className="mt-3 text-2xl font-semibold">My mall orders</h1>
      <p className="text-sm text-slate-600 mt-1">Same mobile you used when booking. Track delivery and payment status.</p>

      <form onSubmit={load} className="mt-4 flex gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile"
          inputMode="tel"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50">
          {loading ? '…' : 'Show'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.tracking_token} className="rounded-xl border bg-white p-4">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{o.seller_name}</span>
              <span className="tabular-nums font-semibold">₹{o.total.toFixed(0)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {o.order_number || o.tracking_token.slice(0, 8)} · {o.created_at?.slice(0, 10) ?? '—'}
            </p>
            <p className="text-sm mt-1 capitalize">
              {o.status.replace(/_/g, ' ')} · payment {o.payment_status}
            </p>
            <Link href={o.track_path} className="mt-3 inline-block text-sm text-brand-600 underline">
              Track & delivery
            </Link>
          </li>
        ))}
      </ul>

      {!loading && orders.length === 0 && !error && phone.replace(/\D/g, '').length === 10 && (
        <p className="mt-8 text-center text-sm text-slate-500">No orders for this number yet.</p>
      )}
    </div>
  );
}
