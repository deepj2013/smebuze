'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { RefreshCw, Barcode, ImagePlus, X } from 'lucide-react';

function validateHsnSac(v: string): string | null {
  if (!v.trim()) return null;
  if (!/^[0-9A-Za-z]+$/.test(v.trim())) return 'HSN/SAC must be alphanumeric';
  if (v.trim().length < 4 || v.trim().length > 15) return 'HSN/SAC should be 4–15 characters';
  return null;
}

export default function NewItemPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [category, setCategory] = useState('');
  const [hsnSac, setHsnSac] = useState('9983');
  const [reorderLevel, setReorderLevel] = useState('');
  const [mrp, setMrp] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSku, setLoadingSku] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleGenerateSku = async () => {
    setLoadingSku(true);
    setError(null);
    const { data, error: err } = await apiGet<unknown>('inventory/items/next-sku');
    setLoadingSku(false);
    if (err) setError(err);
    else if (data != null) {
      const next = typeof data === 'string' ? data : (data as { next_sku?: string; sku?: string }).next_sku ?? (data as { sku?: string }).sku ?? String(data);
      setSku(next);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 10 - imageUrls.length;
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageUrls((prev) => (prev.length >= 10 ? prev : [...prev, dataUrl]));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const runValidation = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (mrp.trim()) {
      const n = parseFloat(mrp);
      if (Number.isNaN(n) || n < 0) errs.mrp = 'MRP must be 0 or greater';
    }
    if (taxRate.trim()) {
      const n = parseFloat(taxRate);
      if (Number.isNaN(n) || n < 0 || n > 100) errs.taxRate = 'Tax rate must be between 0 and 100';
    }
    if (reorderLevel.trim()) {
      const n = parseFloat(reorderLevel);
      if (Number.isNaN(n) || n < 0) errs.reorderLevel = 'Reorder level must be 0 or greater';
    }
    const hsnErr = validateHsnSac(hsnSac);
    if (hsnErr) errs.hsnSac = hsnErr;
    if (imageUrls.length > 10) errs.pictures = 'Maximum 10 images allowed';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!runValidation()) return;
    setLoading(true);
    const body: Record<string, unknown> = {
      name: name.trim(),
      sku: sku || undefined,
      barcode: barcode || undefined,
      image_urls: imageUrls.length ? imageUrls : undefined,
      description: description || undefined,
      unit: unit || undefined,
      category: category || undefined,
      hsn_sac: hsnSac.trim() || undefined,
    };
    if (reorderLevel.trim() !== '') body.reorder_level = parseFloat(reorderLevel) || 0;
    if (mrp.trim() !== '') body.mrp = parseFloat(mrp);
    if (taxRate.trim() !== '') body.tax_rate = parseFloat(taxRate) || 0;
    const { error: err } = await apiPost('inventory/items', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/inventory/items');
  };

  return (
    <div>
      <Link href="/inventory/items" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Items</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Add item</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: '' })); }}
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.name ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.name && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <div className="flex gap-2">
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generated if empty" className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={handleGenerateSku} disabled={loadingSku} className="flex items-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50" title="Generate next SKU">
                  <RefreshCw className={`h-4 w-4 ${loadingSku ? 'animate-spin' : ''}`} />
                  Generate
                </button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
            <div className="flex items-center gap-2">
              <Barcode className="h-4 w-4 text-slate-400" />
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional barcode" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pictures (up to 10)</label>
            <div className="flex flex-wrap gap-3">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute -top-1 -right-1 rounded-full bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-600"
                >
                  <ImagePlus className="h-8 w-8" />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            <p className="text-xs text-slate-500 mt-1">Upload one or multiple images. They are stored with the item.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">HSN/SAC</label>
              <input
                type="text"
                value={hsnSac}
                onChange={(e) => { setHsnSac(e.target.value); setFieldErrors((p) => ({ ...p, hsnSac: '' })); }}
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.hsnSac ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.hsnSac && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.hsnSac}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder level</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={reorderLevel}
                onChange={(e) => { setReorderLevel(e.target.value); setFieldErrors((p) => ({ ...p, reorderLevel: '' })); }}
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.reorderLevel ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.reorderLevel && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.reorderLevel}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">MRP</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={mrp}
                onChange={(e) => { setMrp(e.target.value); setFieldErrors((p) => ({ ...p, mrp: '' })); }}
                placeholder="Default price when no client-specific rate"
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.mrp ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.mrp && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.mrp}</p>}
              <p className="text-xs text-slate-500 mt-0.5">Used as default selling price if no price is set for a particular client.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax rate (%)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => { setTaxRate(e.target.value); setFieldErrors((p) => ({ ...p, taxRate: '' })); }}
                placeholder="e.g. 0, 5, 12, 18, 28"
                className={`w-full rounded border px-3 py-2 text-sm ${fieldErrors.taxRate ? 'border-red-500' : 'border-slate-300'}`}
              />
              {fieldErrors.taxRate && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.taxRate}</p>}
              <p className="text-xs text-slate-500 mt-0.5">GST/tax % applied on this item for tax calculation.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Save</button>
          <Link href="/inventory/items" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
