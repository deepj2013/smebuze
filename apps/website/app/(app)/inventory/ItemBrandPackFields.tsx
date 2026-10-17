'use client';

/** Brand / pack size / form — one product name, many SKUs (Catch 50g, MDH 100g, whole vs powder). */
export default function ItemBrandPackFields({
  brand,
  setBrand,
  variantSize,
  setVariantSize,
  variantShape,
  setVariantShape,
}: {
  brand: string;
  setBrand: (v: string) => void;
  variantSize: string;
  setVariantSize: (v: string) => void;
  variantShape: string;
  setVariantShape: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3 space-y-2 sm:col-span-2">
      <div>
        <p className="text-sm font-medium text-slate-800">Brand & pack</p>
        <p className="text-xs text-slate-600">
          Same item name for every brand/size. Example: name <strong>Turmeric powder</strong>, brand Catch / MDH / Everest, size 20g / 50g / 100g. Use form for powder vs whole (हल्दी साबुत).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm text-slate-700">
          Brand / company on pack
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Catch, MDH, Everest…"
            list="common-brands"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <datalist id="common-brands">
            <option value="Catch" />
            <option value="MDH" />
            <option value="Everest" />
            <option value="Eastern" />
            <option value="Local / loose" />
          </datalist>
        </label>
        <label className="text-sm text-slate-700">
          Pack size
          <input
            value={variantSize}
            onChange={(e) => setVariantSize(e.target.value)}
            placeholder="20g, 50g, 100g, 1kg"
            list="common-sizes"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <datalist id="common-sizes">
            <option value="20g" />
            <option value="50g" />
            <option value="100g" />
            <option value="200g" />
            <option value="500g" />
            <option value="1kg" />
          </datalist>
        </label>
        <label className="text-sm text-slate-700">
          Form
          <input
            value={variantShape}
            onChange={(e) => setVariantShape(e.target.value)}
            placeholder="powder, whole, flakes"
            list="common-forms"
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <datalist id="common-forms">
            <option value="powder" />
            <option value="whole" />
            <option value="flakes" />
            <option value="paste" />
            <option value="pack" />
          </datalist>
        </label>
      </div>
    </div>
  );
}
