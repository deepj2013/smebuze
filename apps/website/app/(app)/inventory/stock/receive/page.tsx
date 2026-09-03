'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import BarcodeCapture from '../../../components/BarcodeCapture';
import PosSwitcher from '../../../components/PosSwitcher';

type StockItem = { id: string; name: string; sku?: string; barcode?: string | null };

export default function ReceiveStockPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ id: string; name: string }[] | { data: unknown }>('inventory/warehouses'),
      apiGet<StockItem[] | { data: unknown }>('inventory/items'),
    ]).then(([wRes, iRes]) => {
      const w = Array.isArray(wRes.data) ? wRes.data : (wRes.data as { data?: { id: string; name: string }[] })?.data ?? [];
      const i = Array.isArray(iRes.data) ? iRes.data : (iRes.data as { data?: StockItem[] })?.data ?? [];
      setWarehouses(w);
      setItems(i);
      if (w.length) setWarehouseId(w[0].id);
      if (i.length) setItemId(i[0].id);
    });
  }, []);

  const pickByCode = (code: string) => {
    const q = code.trim().toLowerCase();
    if (!q) return;
    const found = items.find(
      (i) => (i.barcode || '').toLowerCase() === q || (i.sku || '').toLowerCase() === q,
    );
    if (found) {
      setItemId(found.id);
      setScanCode(found.barcode || found.sku || code);
      setError(null);
    } else {
      setError(`No item for barcode ${code}. Create it first under Items.`);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = parseFloat(quantity);
    if (!warehouseId || !itemId || !Number.isFinite(qty) || qty <= 0) {
      setError('Select warehouse, item and enter a positive quantity.');
      return;
    }
    setLoading(true);
    const { error: err } = await apiPost('inventory/stock/receive', { warehouse_id: warehouseId, item_id: itemId, quantity: qty });
    setLoading(false);
    if (err) setError(err);
    else {
      setQuantity('');
      router.push('/inventory/stock');
    }
  };

  return (
    <div>
      <PosSwitcher />
      <Link href="/inventory/stock" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Stock</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Receive stock</h1>
      <p className="text-sm text-slate-600 mb-4">Scan the pack barcode to pick the item, then enter qty from the truck or supplier.</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Warehouse *</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Scan barcode</label>
          <div className="flex gap-2">
            <input
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pickByCode(scanCode);
                }
              }}
              placeholder="Scan or type, then Enter"
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <BarcodeCapture onDetected={pickByCode} label="Scan" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Item *</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} {i.sku ? `(${i.sku})` : ''} {i.barcode ? `· ${i.barcode}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
          <input type="number" step="0.01" min="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Add to stock</button>
          <Link href="/inventory/stock" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
