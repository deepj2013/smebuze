'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPatch } from '@/lib/api';
import { Barcode, ImagePlus, X } from 'lucide-react';
import CategoryPicker from '../../../../components/CategoryPicker';
import PosSwitcher from '../../../../components/PosSwitcher';
import BarcodeCapture from '../../../../components/BarcodeCapture';
import { DecimalInput } from '../../../../components/NumberField';
import { parseNonNeg, splitItemGst } from '@/lib/item-pricing';
import { parseMoney, parseQty } from '@/lib/money';

function validateHsnSac(v: string): string | null {
  if (!v.trim()) return null;
  if (!/^[0-9A-Za-z]+$/.test(v.trim())) return 'HSN/SAC must be alphanumeric';
  if (v.trim().length < 4 || v.trim().length > 15) return 'HSN/SAC should be 4–15 characters';
  return null;
}

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
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
  const [cgstRate, setCgstRate] = useState('');
  const [sgstRate, setSgstRate] = useState('');
  const [forSale, setForSale] = useState(true);
  const [forConsume, setForConsume] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<Record<string, unknown>>(`inventory/items/${id}`).then((res) => {
      if (res.error) setLoadErr(res.error);
      else if (res.data) {
        const d = res.data as Record<string, unknown>;
        setName((d.name as string) ?? '');
        setSku((d.sku as string) ?? '');
        setBarcode((d.barcode as string) ?? '');
        setDescription((d.description as string) ?? '');
        setUnit((d.unit as string) ?? 'pcs');
        setCategory((d.category as string) ?? '');
        setHsnSac((d.hsn_sac as string) ?? '9983');
        setReorderLevel(d.reorder_level != null ? String(d.reorder_level) : '');
        setMrp(d.mrp != null ? String(d.mrp) : '');
        setCostPrice(d.cost_price != null ? String(d.cost_price) : '');
        setSalePrice(d.sale_price != null ? String(d.sale_price) : '');
        setDiscountPercent(d.discount_percent != null ? String(d.discount_percent) : '');
        const gst = splitItemGst({
          id,
          name: String(d.name ?? ''),
          tax_rate: d.tax_rate as string | number | null,
          cgst_rate: d.cgst_rate as string | number | null,
          sgst_rate: d.sgst_rate as string | number | null,
        });
        setCgstRate(String(gst.cgst));
        setSgstRate(String(gst.sgst));
        setForSale(d.for_sale !== false);
        setForConsume(d.for_consume !== false);
        setImageUrls(Array.isArray(d.image_urls) ? (d.image_urls as string[]) : []);
      }
    });
  }, [id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 10 - imageUrls.length;
    for (let i = 0; i < Math.min(files.length, remaining); i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrls((prev) => (prev.length >= 10 ? prev : [...prev, reader.result as string]));
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
      image_urls: imageUrls,
      description: description || undefined,
      unit: unit || undefined,
      category: category || undefined,
      hsn_sac: hsnSac.trim() || undefined,
    };
    if (reorderLevel.trim() !== '') body.reorder_level = parseQty(reorderLevel);
    if (mrp.trim() !== '') body.mrp = parseMoney(mrp);
    else body.mrp = null;
    if (costPrice.trim() !== '') body.cost_price = parseMoney(costPrice);
    else body.cost_price = null;
    if (salePrice.trim() !== '') body.sale_price = parseMoney(salePrice);
    else body.sale_price = null;
    if (discountPercent.trim() !== '') body.discount_percent = parseMoney(discountPercent);
    else body.discount_percent = null;
    body.cgst_rate = parseMoney(cgstRate);
    body.sgst_rate = parseMoney(sgstRate);
    body.for_sale = forSale;
    body.for_consume = forConsume;
    const { error: err } = await apiPatch(`inventory/items/${id}`, body);
    setLoading(false);
    if (err) setError(err);
    else router.push('/inventory/items');
  };

  if (loadErr) return <div className="p-4 text-red-600">{loadErr}</div>;
  return (
    <div>
      <PosSwitcher />
      <Link href="/inventory/items" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Items</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Edit item</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4">
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
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Barcode className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan with a reader, camera, or type"
                className="w-full min-w-0 rounded border border-slate-300 px-3 py-2 text-sm"
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
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <CategoryPicker value={category} onChange={setCategory} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <DecimalInput whole min={0} value={reorderLevel} onValue={(v) => { setReorderLevel(v); setFieldErrors((p) => ({ ...p, reorderLevel: '' })); }} invalid={!!fieldErrors.reorderLevel} />
              {fieldErrors.reorderLevel && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.reorderLevel}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <DecimalInput min={0} value={salePrice} onValue={(v) => { setSalePrice(v); setFieldErrors((p) => ({ ...p, salePrice: '' })); }} invalid={!!fieldErrors.salePrice} />
              {fieldErrors.salePrice && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.salePrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount % (optional)</label>
              <DecimalInput min={0} max={100} value={discountPercent} onValue={(v) => { setDiscountPercent(v); setFieldErrors((p) => ({ ...p, discountPercent: '' })); }} invalid={!!fieldErrors.discountPercent} />
              {fieldErrors.discountPercent && <p className="mt-0.5 text-sm text-red-600">{fieldErrors.discountPercent}</p>}
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
            <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
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
        <div className="sticky bottom-20 z-10 -mx-4 flex gap-2 border-t border-slate-200 bg-[var(--tenant-canvas,#f8fafc)] px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          <button type="submit" disabled={loading} className="min-h-[44px] flex-1 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 sm:flex-none">Save</button>
          <Link href="/inventory/items" className="min-h-[44px] inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
