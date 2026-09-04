'use client';

import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { limitDecimalPlaces, limitInteger, round2, roundQty } from '@/lib/money';

export const numberInputClass =
  'w-full min-w-[5.5rem] rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 min-h-[44px] tabular-nums [color-scheme:light]';

type NumberProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: number | string;
  onNumber: (n: number) => void;
  invalid?: boolean;
  /** Whole pieces only (qty). Money/rates stay decimal. */
  whole?: boolean;
};

type DecimalProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: string;
  onValue: (v: string) => void;
  invalid?: boolean;
  whole?: boolean;
};

function formatCommitted(n: number, whole: boolean): string {
  return whole ? String(roundQty(n)) : round2(n).toFixed(2);
}

/** String money/qty field. Money formats to 0.00; qty (`whole`) stays an integer. */
export function DecimalInput({ value, onValue, invalid, className = '', min, max, whole = false, ...rest }: DecimalProps) {
  return (
    <input
      {...rest}
      type="text"
      inputMode={whole ? 'numeric' : 'decimal'}
      autoComplete="off"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onValue(whole ? limitInteger(e.target.value) : limitDecimalPlaces(e.target.value))}
      onBlur={() => {
        const raw = String(value ?? '').trim();
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
        let n = whole ? roundQty(Number(raw)) : round2(Number(raw));
        if (!Number.isFinite(n)) return;
        if (min != null && n < Number(min)) n = whole ? roundQty(Number(min)) : round2(Number(min));
        if (max != null && n > Number(max)) n = whole ? roundQty(Number(max)) : round2(Number(max));
        onValue(formatCommitted(n, whole));
      }}
      className={`${numberInputClass} ${invalid ? 'border-red-500' : ''} ${className}`}
    />
  );
}

function displayValue(value: number | string, whole: boolean): string {
  if (value === '' || value == null || Number.isNaN(Number(value))) return '';
  return whole ? String(roundQty(Number(value))) : String(value);
}

/** Visible, touch-sized numeric field. Use `whole` for quantity. */
export default function NumberField({ value, onNumber, invalid, className = '', min = 0, max, whole = false, ...rest }: NumberProps) {
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => displayValue(value, whole));

  useEffect(() => {
    if (focused.current) return;
    setDraft(displayValue(value, whole));
  }, [value, whole]);

  const commit = (raw: string) => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      const fallback = whole ? roundQty(Number(min) || 0) : round2(Number(min) || 0);
      setDraft(formatCommitted(fallback, whole));
      onNumber(fallback);
      return;
    }
    let n = whole ? roundQty(Number(raw)) : round2(Number(raw));
    if (!Number.isFinite(n)) return;
    if (n < Number(min)) n = whole ? roundQty(Number(min)) : round2(Number(min));
    if (max != null && n > Number(max)) n = whole ? roundQty(Number(max)) : round2(Number(max));
    setDraft(formatCommitted(n, whole));
    onNumber(n);
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={whole ? 'numeric' : 'decimal'}
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
        const raw = whole ? limitInteger(e.target.value) : limitDecimalPlaces(e.target.value);
        setDraft(raw);
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.' || raw.endsWith('.')) return;
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onNumber(whole ? roundQty(n) : round2(n));
      }}
      className={`${numberInputClass} ${invalid ? 'border-red-500' : ''} ${className}`}
    />
  );
}
