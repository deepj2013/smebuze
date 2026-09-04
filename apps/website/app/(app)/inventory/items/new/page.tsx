'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { RefreshCw, Barcode, ImagePlus, X } from 'lucide-react';
import CategoryPicker from '../../../components/CategoryPicker';
import PosSwitcher from '../../../components/PosSwitcher';
import BarcodeCapture from '../../../components/BarcodeCapture';
import { DecimalInput } from '../../../components/NumberField';
import { parseNonNeg } from '@/lib/item-pricing';
import { parseMoney } from '@/lib/money';

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
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [openingQty, setOpeningQty] = useState('');
  const [cgstRate, setCgstRate] = useState('');
  const [sgstRate, setSgstRate] = useState('');
  const [forSale, setForSale] = useState(true);
  const [forConsume, setForConsume] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSku, setLoadingSku] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<{ tenant?: { slug?: string; settings?: { business_type?: string } } }>('auth/me').then(({ data }) => {
      const t = data?.tenant;
      if (t?.slug === 'ice-crest' || t?.settings?.business_type === 'ice_crest') {
        setCgstRate((prev) => prev || '2.5');
        setSgstRate((prev) => prev || '2.5');
      }
    });
  }, []);

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
      const err = parseNonNeg(mrp, 'MRP');
      if (err) errs.mrp = err;
    }
    if (costPrice.trim()) {
      const err = parseNonNeg(costPrice, 'Cost');
      if (err) errs.costPrice = err;
    }
    if (salePrice.trim()) {
      const err = parseNonNeg(salePrice, 'Sale price');
      if (err) errs.salePrice = err;
    }
    if (discountPercent.trim()) {
      const err = parseNonNeg(discountPercent, 'Discount', { max: 100 });
      if (err) errs.discountPercent = err;
    }
    if (cgstRate.trim()) {
      const err = parseNonNeg(cgstRate, 'CGST', { max: 100 });
      if (err) errs.cgstRate = err;
    }
    if (sgstRate.trim()) {
      const err = parseNonNeg(sgstRate, 'SGST', { max: 100 });
      if (err) errs.sgstRate = err;
    }
    if (!forSale && !forConsume) errs.purpose = 'Select For sale, For consume, or both';
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
    if (reorderLevel.trim() !== '') body.reorder_level = parseMoney(reorderLevel);
    if (mrp.trim() !== '') body.mrp = parseMoney(mrp);
    if (costPrice.trim() !== '') body.cost_price = parseMoney(costPrice);
    if (salePrice.trim() !== '') body.sale_price = parseMoney(salePrice);
    if (discountPercent.trim() !== '') body.discount_percent = parseMoney(discountPercent);
    if (openingQty.trim() !== '') body.opening_qty = parseMoney(openingQty);
    if (cgstRate.trim() !== '') body.cgst_rate = parseMoney(cgstRate);
    if (sgstRate.trim() !== '') body.sgst_rate = parseMoney(sgstRate);
    body.for_sale = forSale;
    body.for_consume = forConsume;
    const { error: err } = await apiPost('inventory/items', body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/inventory/items');
  };

  return (
    <div>
      <PosSwitcher />
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
              <Barcode className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan with a reader, camera, or type"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <BarcodeCapture onDetected={(code) => setBarcode(code)} label="Scan" />
            </div>
            <p className="text-xs text-slate-500 mt-1">USB/Bluetooth reader: click the field and scan. Phone: tap Scan.</p>
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
              <CategoryPicker value={category} onChange={setCategory} />
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
              <DecimalInput min={0} value={reorderLevel} onValue={(v) => { setReorderLevel(v); setFieldErrors((p) => ({ ...p, reorderLevel: '' })); }} invalid={!!fieldErrors.reorderLevel} />
              {fieldErrors.reorderLevel && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.reorderLevel}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost price</label>
              <DecimalInput min={0} value={costPrice} onValue={(v) => { setCostPrice(v); setFieldErrors((p) => ({ ...p, costPrice: '' })); }} invalid={!!fieldErrors.costPrice} />
              {fieldErrors.costPrice && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.costPrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">MRP</label>
              <DecimalInput min={0} value={mrp} onValue={(v) => { setMrp(v); setFieldErrors((p) => ({ ...p, mrp: '' })); }} invalid={!!fieldErrors.mrp} />
              {fieldErrors.mrp && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.mrp}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sale price</label>
              <DecimalInput min={0} value={salePrice} onValue={(v) => { setSalePrice(v); setFieldErrors((p) => ({ ...p, salePrice: '' })); }} invalid={!!fieldErrors.salePrice} placeholder="Defaults to MRP" />
              {fieldErrors.salePrice && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.salePrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount % (optional)</label>
              <DecimalInput min={0} max={100} value={discountPercent} onValue={(v) => { setDiscountPercent(v); setFieldErrors((p) => ({ ...p, discountPercent: '' })); }} invalid={!!fieldErrors.discountPercent} />
              {fieldErrors.discountPercent && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.discountPercent}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening stock</label>
              <DecimalInput min={0} value={openingQty} onValue={setOpeningQty} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CGST %</label>
              <DecimalInput min={0} max={100} value={cgstRate} onValue={(v) => { setCgstRate(v); setFieldErrors((p) => ({ ...p, cgstRate: '' })); }} invalid={!!fieldErrors.cgstRate} aria-label="CGST percent" />
              {fieldErrors.cgstRate && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.cgstRate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SGST %</label>
              <DecimalInput min={0} max={100} value={sgstRate} onValue={(v) => { setSgstRate(v); setFieldErrors((p) => ({ ...p, sgstRate: '' })); }} invalid={!!fieldErrors.sgstRate} aria-label="SGST percent" />
              {fieldErrors.sgstRate && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.sgstRate}</p>}
              <p className="text-xs text-slate-500 mt-0.5">
                Combined GST {((parseFloat(cgstRate) || 0) + (parseFloat(sgstRate) || 0)).toFixed(2)}%. Copied onto invoices and still editable there.
              </p>
            </div>
            <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-sm font-medium text-slate-800">This product is used for</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={forSale} onChange={(e) => { setForSale(e.target.checked); setFieldErrors((p) => ({ ...p, purpose: '' })); }} />
                For sale (invoices, orders, quotations)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={forConsume} onChange={(e) => { setForConsume(e.target.checked); setFieldErrors((p) => ({ ...p, purpose: '' })); }} />
                For consume (stock inward / outward / production)
              </label>
              {fieldErrors.purpose && <p className="text-sm text-red-600">{fieldErrors.purpose}</p>}
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
