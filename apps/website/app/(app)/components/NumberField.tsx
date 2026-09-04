'use client';

import type { InputHTMLAttributes } from 'react';

export const numberInputClass =
  'w-full min-w-[5.5rem] rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 min-h-[44px] tabular-nums [color-scheme:light]';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  value: number | string;
  onNumber: (n: number) => void;
  invalid?: boolean;
};

/** Visible, touch-sized numeric field. Keeps digits readable on mobile (no clipped table cells / spinner overlay). */
export default function NumberField({ value, onNumber, invalid, className = '', min = 0, step = '0.01', ...rest }: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={value === '' || value == null || Number.isNaN(Number(value)) ? '' : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onNumber(Number(min) || 0);
          return;
        }
        const n = parseFloat(raw);
        if (!Number.isFinite(n)) return;
        onNumber(n);
      }}
      className={`${numberInputClass} ${invalid ? 'border-red-500' : ''} ${className}`}
      {...rest}
    />
  );
}
