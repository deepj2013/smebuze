'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function BulkUploadPage() {
  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [itemsFile, setItemsFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [customersResult, setCustomersResult] = useState<string | null>(null);
  const [itemsResult, setItemsResult] = useState<string | null>(null);
  const [menuResult, setMenuResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCsv = (text: string): Record<string, unknown>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
      rows.push(row);
    }
    return rows;
  };

  const uploadCustomers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customersFile) return;
    setError(null);
    setCustomersResult(null);
    setLoading(true);
    try {
      const text = await customersFile.text();
      const rows = parseCsv(text);
      const { data, error: err } = await apiPost<{ received?: number; message?: string }>('bulk-upload/customers', { rows });
      setLoading(false);
      if (err) setError(err);
      else setCustomersResult(data?.message ?? `Received ${data?.received ?? 0} rows.`);
    } catch {
      setLoading(false);
      setError('Failed to read file.');
    }
  };

  const uploadMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFile) return;
    setError(null);
    setMenuResult(null);
    setLoading(true);
    try {
      const text = await menuFile.text();
      const rows = parseCsv(text);
      const { data, error: err } = await apiPost<{ received?: number; inserted?: number; failed?: number; message?: string }>('bulk-upload/categories', { rows });
      setLoading(false);
      if (err) setError(err);
      else setMenuResult(data?.message ?? `Saved ${data?.inserted ?? 0} of ${data?.received ?? 0}. Failed ${data?.failed ?? 0}.`);
    } catch {
      setLoading(false);
      setError('Failed to read file.');
    }
  };

  const uploadItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsFile) return;
    setError(null);
    setItemsResult(null);
    setLoading(true);
    try {
      const text = await itemsFile.text();
      const rows = parseCsv(text);
      const { data, error: err } = await apiPost<{ received?: number; inserted?: number; failed?: number; message?: string }>('bulk-upload/items', { rows });
      setLoading(false);
      if (err) setError(err);
      else setItemsResult(data?.message ?? `Saved ${data?.inserted ?? 0} of ${data?.received ?? 0}. Failed ${data?.failed ?? 0}.`);
    } catch {
      setLoading(false);
      setError('Failed to read file.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Bulk upload</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900 mb-2">Upload categories and subcategories (CSV)</h2>
        <p className="text-sm text-slate-500 mb-2">Use this first when moving a menu from another billing system. One row is a category. Fill subcategory when that category has one. The same category can repeat for each subcategory.</p>
        <a
          href="data:text/csv;charset=utf-8,category,subcategory%0ADelicious%20Sweets,%0ADelicious%20Sweets,Ladoo%0ANamkeen,Mixture"
          download="smebuzz-categories-sample.csv"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Download sample CSV
        </a>
        <form onSubmit={uploadMenu} className="mt-4 space-y-3">
          <input type="file" accept=".csv,.txt" onChange={(e) => setMenuFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
          <button type="submit" disabled={loading || !menuFile} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Upload categories</button>
        </form>
        {menuResult && <p className="mt-3 text-sm text-green-700">{menuResult}</p>}
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Upload customers (CSV)</h2>
          <p className="text-sm text-slate-500 mb-2">Headers: name, email, phone, gstin, address (optional).</p>
          <a
            href="data:text/csv;charset=utf-8,name,email,phone,gstin,address%0AExample%20Customer,contact%40example.com,9876543210,29XXXXX1234X1Z5,123%20Street%20City"
            download="smebuzz-customers-sample.csv"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Download sample CSV
          </a>
          <p className="text-xs text-slate-400 mt-1 mb-4">Use this template and fill your data.</p>
          <form onSubmit={uploadCustomers} className="space-y-3">
            <input type="file" accept=".csv,.txt" onChange={(e) => setCustomersFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
            <button type="submit" disabled={loading || !customersFile} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Upload</button>
          </form>
          {customersResult && <p className="mt-3 text-sm text-green-700">{customersResult}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Upload items (CSV)</h2>
          <p className="text-sm text-slate-500 mb-2">Headers: name, sku, unit, category, subcategory, sale_mode, hsn_sac, description. sale_mode is fixed or loose. A shop sheet can also include barcode, mrp, cost_price, discount_percent, tax_rate, variant_size, variant_shape, pack_sku, pack_qty, for_sale, opening_qty. Upload categories first, then items. A file with only the first old headers still imports.</p>
          <a
            href="data:text/csv;charset=utf-8,name,sku,unit,category,subcategory,sale_mode,mrp%0AKaju%20Katli,KK250,pcs,Delicious%20Sweets,,fixed,450%0ABesan%20Ladoo,BL1,kg,Delicious%20Sweets,Ladoo,loose,320"
            download="smebuzz-items-sample.csv"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Download sample CSV
          </a>
          <p className="text-xs text-slate-400 mt-1 mb-4">Use this template and fill your data.</p>
          <form onSubmit={uploadItems} className="space-y-3">
            <input type="file" accept=".csv,.txt" onChange={(e) => setItemsFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
            <button type="submit" disabled={loading || !itemsFile} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Upload</button>
          </form>
          {itemsResult && <p className="mt-3 text-sm text-green-700">{itemsResult}</p>}
        </div>
      </div>
    </div>
  );
}
