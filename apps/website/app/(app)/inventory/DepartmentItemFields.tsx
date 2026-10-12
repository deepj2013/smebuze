'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api';
import { DecimalInput } from '../components/NumberField';
import { round2 } from '@/lib/money';

interface BulkItem {
  id: string;
  name: string;
  unit?: string | null;
  for_sale?: boolean;
}

export function DepartmentItemFields({
  subcategory,
  setSubcategory,
  variantSize,
  setVariantSize,
  variantShape,
  setVariantShape,
  packSourceId,
  setPackSourceId,
  packQty,
  setPackQty,
  mrp,
  discountPercent,
  costPrice,
  cgstRate,
  sgstRate,
}: {
  subcategory: string;
  setSubcategory: (v: string) => void;
  variantSize: string;
  setVariantSize: (v: string) => void;
  variantShape: string;
  setVariantShape: (v: string) => void;
  packSourceId: string;
  setPackSourceId: (v: string) => void;
  packQty: string;
  setPackQty: (v: string) => void;
  mrp: string;
  discountPercent: string;
  costPrice: string;
  cgstRate: string;
  sgstRate: string;
}) {
  const [bulk, setBulk] = useState<BulkItem[]>([]);
  useEffect(() => {
    apiGet<BulkItem[]>('inventory/items?purpose=consume').then(({ data }) => {
      if (Array.isArray(data)) setBulk(data);
    });
  }, []);

  const preview = useMemo(() => {
    const m = Number(mrp) || 0;
    const disc = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const gst = (Number(cgstRate) || 0) + (Number(sgstRate) || 0);
    const shelf = round2(m * (1 - disc / 100));
    const taxable = gst > 0 ? round2(shelf / (1 + gst / 100)) : shelf;
    const tax = round2(shelf - taxable);
    const cost = Number(costPrice) || 0;
    return { shelf, taxable, tax, cgst: round2(tax / 2), sgst: round2(tax - tax / 2), margin: round2(shelf - cost) };
  }, [mrp, discountPercent, costPrice, cgstRate, sgstRate]);

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-slate-800">Department store</p>
      <p className="text-xs text-slate-600">MRP includes GST. The discount % is the maximum the counter can give, on the line or on the whole bill. A 50g pack sold from a 50kg bag uses 0.05 kg of that bag.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-slate-700">Subcategory
          <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Staples" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-slate-700">Size
          <input value={variantSize} onChange={(e) => setVariantSize(e.target.value)} placeholder="50g, 1kg, 500ml" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-slate-700">Shape
          <input value={variantShape} onChange={(e) => setVariantShape(e.target.value)} placeholder="pack, bottle, box" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-slate-700">Filled from bulk stock
          <select value={packSourceId} onChange={(e) => setPackSourceId(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">This item is the stock itself</option>
            {bulk.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.unit || 'unit'})</option>
            ))}
          </select>
        </label>
        {packSourceId && (
          <label className="text-sm text-slate-700">Bulk used by one pack
            <DecimalInput min={0} value={packQty} onValue={setPackQty} />
            <span className="mt-1 block text-xs text-slate-500">In the bulk unit. 50g from a kg bag is 0.05.</span>
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-700">
        <p>Shelf price <strong>₹{preview.shelf.toFixed(2)}</strong></p>
        <p>Taxable <strong>₹{preview.taxable.toFixed(2)}</strong></p>
        <p>GST <strong>₹{preview.tax.toFixed(2)}</strong></p>
        <p>CGST <strong>₹{preview.cgst.toFixed(2)}</strong></p>
        <p>SGST <strong>₹{preview.sgst.toFixed(2)}</strong></p>
        <p>Margin <strong>₹{preview.margin.toFixed(2)}</strong></p>
      </div>
    </div>
  );
}
