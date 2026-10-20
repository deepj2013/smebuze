'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  lookupCounterCustomer,
  loyaltyPts,
  matchLocalCustomers,
  type CounterParty,
} from '@/lib/counter-customer';
import { phoneKey } from '@/lib/counter-desk';

type Props = {
  name: string;
  phone: string;
  customers: CounterParty[];
  selectedId: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onSelect: (c: CounterParty) => void;
  onSave: () => void;
  compact?: boolean;
};

export default function CounterCustomerBar({
  name,
  phone,
  customers,
  selectedId,
  onName,
  onPhone,
  onSelect,
  onSave,
  compact,
}: Props) {
  const [hint, setHint] = useState('');
  const selected = customers.find((c) => c.id === selectedId);
  const matches = useMemo(() => matchLocalCustomers(customers, phone || name), [customers, phone, name]);

  useEffect(() => {
    const digits = phoneKey(phone);
    const cardish = phone.replace(/\s/g, '');
    if (digits.length !== 10 && cardish.length < 6) return;
    const t = window.setTimeout(() => {
      void lookupCounterCustomer(phone, customers).then((c) => {
        if (!c?.id) {
          setHint(digits.length === 10 ? 'New number — Save to create' : '');
          return;
        }
        onSelect(c);
        if (c.name && !name.trim()) onName(c.name);
        if (c.phone && phoneKey(c.phone) && phoneKey(phone) !== phoneKey(c.phone)) onPhone(c.phone);
        setHint(`${c.name} · ${loyaltyPts(c.loyalty_points)} pts`);
      });
    }, 280);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lookup on typed phone/card only
  }, [phone]);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex gap-1">
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Name"
          className={`${compact ? 'h-7 text-[11px]' : 'h-8 text-xs'} min-w-0 flex-1 rounded border border-slate-200 px-1.5`}
        />
        <input
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          inputMode="tel"
          placeholder="Mobile or RFID"
          title="Type mobile to find the account, or scan the loyalty card"
          className={`${compact ? 'h-7 w-[7.2rem] text-[11px]' : 'h-8 min-w-[7.5rem] text-xs'} rounded border border-slate-200 px-1.5`}
        />
        <button
          type="button"
          onClick={onSave}
          className={`${compact ? 'h-7 px-2 text-[10px]' : 'h-8 px-2.5 text-[11px]'} shrink-0 rounded bg-slate-800 font-semibold text-white`}
        >
          Save
        </button>
      </div>
      {selected && !isWalkIn(selected) && (
        <p className="truncate text-[11px] text-emerald-800">
          Bill → {selected.name}
          {selected.phone ? ` · ${selected.phone}` : ''}
          {` · ${loyaltyPts(selected.loyalty_points)} pts`}
          {selected.loyalty_card ? ' · card on file' : ''}
        </p>
      )}
      {!selected && hint && <p className="truncate text-[11px] text-slate-500">{hint}</p>}
      {matches.length > 0 && (
        <ul className="max-h-24 overflow-y-auto rounded border border-slate-200 bg-white">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(c);
                  onName(c.name);
                  if (c.phone) onPhone(c.phone);
                }}
                className={`flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-[11px] ${
                  c.id === selectedId ? 'bg-brand-50 text-brand-900' : 'hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{c.name}{c.phone ? ` · ${c.phone}` : ''}</span>
                <span className="shrink-0 tabular-nums text-slate-500">{loyaltyPts(c.loyalty_points)} pts</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isWalkIn(c: CounterParty): boolean {
  return c.tags?.includes('walk_in') || /walk-?in/i.test(c.name);
}
