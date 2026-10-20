'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import ItemSearchPicker, { type SearchableItem } from '../../../components/ItemSearchPicker';

type Line = {
  item_id: string;
  description: string;
  qty: number;
  unit_cost: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  batch_code: string;
  expiry_date: string;
};

export default function NewVendorInvoicePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<SearchableItem[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [receiveStock, setReceiveStock] = useState(true);
  const [lines, setLines] = useState<Line[]>([
    { item_id: '', description: '', qty: 1, unit_cost: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, batch_code: '', expiry_date: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Array<{ id: string; name: string }>>('organization/companies'),
      apiGet<Array<{ id: string; name: string }>>('purchase/vendors'),
      apiGet<Array<{ id: string; name: string }>>('inventory/warehouses'),
      apiGet<SearchableItem[]>('inventory/items'),
    ]).then(([c, v, w, i]) => {
      const cl = Array.isArray(c.data) ? c.data : [];
      const vl = Array.isArray(v.data) ? v.data : [];
      const wl = Array.isArray(w.data) ? w.data : [];
      const il = Array.isArray(i.data) ? i.data : [];
      setCompanies(cl);
      setVendors(vl);
      setWarehouses(wl);
      setItems(il);
      if (cl[0]) setCompanyId(cl[0].id);
      if (wl[0]) setWarehouseId(wl[0].id);
    });
  }, []);

  const totals = useMemo(() => {
    let taxable = 0;
    let gst = 0;
    for (const l of lines) {
      const t = Number(l.qty || 0) * Number(l.unit_cost || 0);
      taxable += t;
      gst += t * (Number(l.cgst_rate) + Number(l.sgst_rate) + Number(l.igst_rate)) / 100;
    }
    return { taxable, gst, total: taxable + gst };
  }, [lines]);

  const update = (i: number, patch: Partial<Line>) => {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !vendorId) {
      setError('Select company and vendor.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await apiPost('purchase/vendor-invoices', {
      company_id: companyId,
      vendor_id: vendorId,
      warehouse_id: warehouseId || undefined,
      bill_date: billDate,
      vendor_bill_no: vendorBillNo || undefined,
      receive_stock: receiveStock && !!warehouseId,
      lines: lines
        .filter((l) => l.item_id || l.qty)
        .map((l) => ({
          item_id: l.item_id || undefined,
          description: l.description || undefined,
          qty: Number(l.qty) || 0,
          unit_cost: Number(l.unit_cost) || 0,
          cgst_rate: Number(l.cgst_rate) || 0,
          sgst_rate: Number(l.sgst_rate) || 0,
          igst_rate: Number(l.igst_rate) || 0,
          batch_code: l.batch_code || undefined,
          expiry_date: l.expiry_date || undefined,
        })),
    });
    setLoading(false);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else router.push('/purchase/vendor-invoices');
  };

  return (
    <div>
      <Link href="/purchase/vendor-invoices" className="text-sm text-slate-600 mb-4 inline-block">← Vendor bills</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Supplier bill</h1>
      <p className="text-sm text-slate-600 mb-4">Sets cost + input GST. Tick receive stock to inward quantity (batch/expiry optional).</p>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6 max-w-3xl">
        <div className="rounded-xl border bg-white p-5 grid gap-3 md:grid-cols-2">
          <label className="text-sm">Company *
            <select required value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Vendor *
            <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">Select</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Bill date
            <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">Vendor bill no
            <input value={vendorBillNo} onChange={(e) => setVendorBillNo(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">Warehouse (for receive)
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">None</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={receiveStock} onChange={(e) => setReceiveStock(e.target.checked)} />
            Receive quantity into stock
          </label>
        </div>
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex justify-between">
            <h2 className="font-medium">Lines</h2>
            <button type="button" className="text-sm text-brand-600" onClick={() => setLines((p) => [...p, { item_id: '', description: '', qty: 1, unit_cost: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, batch_code: '', expiry_date: '' }])}>+ Add line</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="border-b border-slate-100 pb-3 space-y-2">
              <ItemSearchPicker items={items} value={line.item_id} onChange={(id) => update(i, { item_id: id })} placeholder="Search item…" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="text-xs">Qty<input type="number" step="0.001" value={line.qty} onChange={(e) => update(i, { qty: Number(e.target.value) })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">Cost / unit<input type="number" step="0.01" value={line.unit_cost} onChange={(e) => update(i, { unit_cost: Number(e.target.value) })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">CGST %<input type="number" step="0.01" value={line.cgst_rate} onChange={(e) => update(i, { cgst_rate: Number(e.target.value) })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">SGST %<input type="number" step="0.01" value={line.sgst_rate} onChange={(e) => update(i, { sgst_rate: Number(e.target.value) })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">IGST %<input type="number" step="0.01" value={line.igst_rate} onChange={(e) => update(i, { igst_rate: Number(e.target.value) })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">Batch<input value={line.batch_code} onChange={(e) => update(i, { batch_code: e.target.value })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
                <label className="text-xs">Expiry<input type="date" value={line.expiry_date} onChange={(e) => update(i, { expiry_date: e.target.value })} className="mt-0.5 w-full rounded border px-2 py-1" /></label>
              </div>
            </div>
          ))}
          <p className="text-sm font-medium">Taxable ₹{totals.taxable.toFixed(2)} + GST ₹{totals.gst.toFixed(2)} = <strong>₹{totals.total.toFixed(2)}</strong></p>
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm disabled:opacity-50">{loading ? 'Saving…' : 'Save bill'}</button>
      </form>
    </div>
  );
}
