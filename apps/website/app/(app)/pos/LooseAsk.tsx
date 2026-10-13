'use client';

import { useState } from 'react';
import { looseQuantity, formatLooseQty } from '@/lib/loose-sale';
import { round2 } from '@/lib/money';

export default function LooseAsk({
  name,
  unit,
  rate,
  onAdd,
  onClose,
}: {
  name: string;
  unit: string;
  rate: number;
  onAdd: (qty: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'weight' | 'rupee'>('weight');
  const [value, setValue] = useState('');
  const [weightAs, setWeightAs] = useState<'g' | 'kg'>('g');
  const amount = Number(value);
  const qty = looseQuantity({ mode, value: amount, weightAs, unit: unit || 'kg', rate });
  const line = qty > 0 ? round2(qty * rate) : 0;

  const pickWeight = (n: number, as: 'g' | 'kg') => {
    setMode('weight');
    setWeightAs(as);
    setValue(String(n));
  };
  const pickRupee = (n: number) => {
    setMode('rupee');
    setValue(String(n));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">₹{rate.toFixed(2)} per {unit || 'kg'}. Enter 500 g or ₹100 — quantity calculates itself.</p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button type="button" onClick={() => setMode('weight')} className={`h-8 rounded text-xs font-semibold ${mode === 'weight' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`}>By weight</button>
          <button type="button" onClick={() => setMode('rupee')} className={`h-8 rounded text-xs font-semibold ${mode === 'rupee' ? 'bg-brand-600 text-white' : 'border border-slate-200'}`}>By rupees</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {mode === 'weight' ? (
            <>
              <button type="button" onClick={() => pickWeight(100, 'g')} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">100 g</button>
              <button type="button" onClick={() => pickWeight(250, 'g')} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">250 g</button>
              <button type="button" onClick={() => pickWeight(500, 'g')} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">500 g</button>
              <button type="button" onClick={() => pickWeight(1, 'kg')} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">1 kg</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => pickRupee(50)} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">₹50</button>
              <button type="button" onClick={() => pickRupee(100)} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">₹100</button>
              <button type="button" onClick={() => pickRupee(200)} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">₹200</button>
              <button type="button" onClick={() => pickRupee(500)} className="h-7 rounded border border-slate-200 px-2 text-[11px] font-semibold">₹500</button>
            </>
          )}
        </div>
        <div className="mt-2 flex gap-1">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && qty > 0) onAdd(qty);
            }}
            placeholder={mode === 'rupee' ? '100' : '500'}
            className="h-9 min-w-0 flex-1 rounded border border-slate-300 px-2 text-sm"
          />
          {mode === 'weight' ? (
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={() => setWeightAs('g')} className={`h-9 rounded px-2 text-xs font-semibold ${weightAs === 'g' ? 'bg-slate-900 text-white' : 'border border-slate-200'}`}>g</button>
              <button type="button" onClick={() => setWeightAs('kg')} className={`h-9 rounded px-2 text-xs font-semibold ${weightAs === 'kg' ? 'bg-slate-900 text-white' : 'border border-slate-200'}`}>kg</button>
            </div>
          ) : (
            <span className="flex h-9 items-center px-2 text-sm font-semibold">₹</span>
          )}
        </div>
        <p className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800">
          {qty > 0
            ? `Adds ${formatLooseQty(qty, unit || 'kg')} · bill ₹${line.toFixed(2)}`
            : 'Type the grams or the rupee amount. The line fills itself.'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button type="button" onClick={onClose} className="h-9 rounded border border-slate-300 text-xs font-semibold">Close</button>
          <button type="button" disabled={qty <= 0} onClick={() => onAdd(qty)} className="h-9 rounded bg-brand-600 text-xs font-semibold text-white disabled:opacity-50">Add to bill</button>
        </div>
      </div>
    </div>
  );
}
