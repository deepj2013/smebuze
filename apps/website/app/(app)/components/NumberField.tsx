'use client';

import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { limitDecimalPlaces, round2 } from '@/lib/money';

export const numberInputClass =
  'w-full min-w-[5.5rem] rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 min-h-[44px] tabular-nums [color-scheme:light]';

type NumberProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: number | string;
  onNumber: (n: number) => void;
  invalid?: boolean;
};

type DecimalProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: string;
  onValue: (v: string) => void;
  invalid?: boolean;
};

/** String money/qty field. Blocks a 3rd digit after the decimal and formats to 0.00 on blur. */
export function DecimalInput({ value, onValue, invalid, className = '', min, max, ...rest }: DecimalProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onValue(limitDecimalPlaces(e.target.value))}
      onBlur={() => {
        const raw = String(value ?? '').trim();
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
        let n = round2(Number(raw));
        if (!Number.isFinite(n)) return;
        if (min != null && n < Number(min)) n = round2(Number(min));
        if (max != null && n > Number(max)) n = round2(Number(max));
        onValue(n.toFixed(2));
      }}
      className={`${numberInputClass} ${invalid ? 'border-red-500' : ''} ${className}`}
    />
  );
}

/** Visible, touch-sized numeric field. Always 2 decimal places. */
export default function NumberField({ value, onNumber, invalid, className = '', min = 0, max, ...rest }: NumberProps) {
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => (value === '' || value == null || Number.isNaN(Number(value)) ? '' : String(value)));

  useEffect(() => {
    if (focused.current) return;
    setDraft(value === '' || value == null || Number.isNaN(Number(value)) ? '' : String(value));
  }, [value]);

  const commit = (raw: string) => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      const fallback = round2(Number(min) || 0);
      setDraft(fallback.toFixed(2));
      onNumber(fallback);
      return;
    }
    let n = round2(Number(raw));
    if (!Number.isFinite(n)) return;
    if (n < Number(min)) n = round2(Number(min));
    if (max != null && n > Number(max)) n = round2(Number(max));
    setDraft(n.toFixed(2));
    onNumber(n);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      min={min}
      max={max}
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        commit(draft);
      }}
      onChange={(e) => {
        const raw = limitDecimalPlaces(e.target.value);
        setDraft(raw);
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.')) return;
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onNumber(round2(n));
      }}
      className={`${numberInputClass} ${invalid ? 'border-red-500' : ''} ${className}`}
    />
  );
}
