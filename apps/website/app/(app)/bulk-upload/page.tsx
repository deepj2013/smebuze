'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';

export default function BulkUploadPage() {
  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [itemsFile, setItemsFile] = useState<File | null>(null);
  const [customersResult, setCustomersResult] = useState<string | null>(null);
  const [itemsResult, setItemsResult] = useState<string | null>(null);
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

  const uploadItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemsFile) return;
    setError(null);
    setItemsResult(null);
    setLoading(true);
    try {
      const text = await itemsFile.text();
      const rows = parseCsv(text);
      const { data, error: err } = await apiPost<{ received?: number; message?: string }>('bulk-upload/items', { rows });
      setLoading(false);
      if (err) setError(err);
      else setItemsResult(data?.message ?? `Received ${data?.received ?? 0} rows.`);
    } catch {
      setLoading(false);
      setError('Failed to read file.');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Bulk upload</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
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
          <p className="text-sm text-slate-500 mb-2">Headers: name, sku, unit, category, hsn_sac, description (optional).</p>
          <a
            href="data:text/csv;charset=utf-8,name,sku,unit,category,hsn_sac,description%0ASample%20Item,SKU001,nos,General,998314,Sample%20product"
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
