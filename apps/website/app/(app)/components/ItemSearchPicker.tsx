'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { matchesPosNameSearch } from '@/lib/pos-search';

export type SearchableItem = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  variant_size?: string | null;
  category?: string | null;
};

function labelOf(item: SearchableItem): string {
  const bits = [
    item.name,
    item.brand,
    item.variant_size,
    item.sku ? `(${item.sku})` : null,
  ].filter(Boolean);
  return bits.join(' · ');
}

/**
 * Search-and-pick product for stock receive / transfers / orders.
 * Long dropdowns are hard on phone — type name, brand, SKU or barcode instead.
 */
export default function ItemSearchPicker({
  items,
  value,
  onChange,
  placeholder = 'Search name, brand, SKU or barcode…',
  required,
  className = '',
}: {
  items: SearchableItem[];
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => items.find((i) => i.id === value) || null, [items, value]);

  const filtered = useMemo(() => {
    const list = items.filter((i) =>
      matchesPosNameSearch(query, {
        name: i.name,
        extra: [i.sku, i.barcode, i.brand, i.variant_size, i.category],
      }),
    );
    return list.slice(0, 40);
  }, [items, query]);

  return (
    <div className={`relative ${className}`}>
      {selected && !open && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{selected.name}</p>
            <p className="truncate text-xs text-slate-600">
              {[selected.brand, selected.variant_size, selected.sku, selected.barcode].filter(Boolean).join(' · ') || 'Selected'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setQuery('');
            }}
            className="shrink-0 text-xs font-semibold text-brand-700"
          >
            Change
          </button>
        </div>
      )}

      {(open || !selected) && (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 py-2.5 pl-10 pr-3 text-sm min-h-[44px]"
              aria-label="Search products"
            />
          </div>
          {open && (
            <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-sm text-slate-500">No matching product. Try another word or create the item first.</li>
              )}
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={`flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-sky-50 ${
                      item.id === value ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span className="font-medium text-slate-900">{labelOf(item)}</span>
                    {item.barcode && <span className="text-[11px] text-slate-500">{item.barcode}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Keep a hidden required field for native form validation when needed */}
      {required && (
        <input type="text" value={value} required readOnly tabIndex={-1} className="sr-only" aria-hidden />
      )}
    </div>
  );
}
