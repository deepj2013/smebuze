'use client';

import { ITEM_NAME_LANGS, type ItemNamesMap } from '@/lib/item-i18n';

/** Optional local-script names shown on the POS when staff switch language. */
export default function ItemLocaleNames({
  names,
  onChange,
}: {
  names: ItemNamesMap;
  onChange: (next: ItemNamesMap) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-slate-800">Other language names</p>
        <p className="text-xs text-slate-600">
          English name stays above. Add हिंदी / other names so the counter shows them when language is switched (e.g. Turmeric → हल्दी).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ITEM_NAME_LANGS.map((row) => (
          <label key={row.id} className="text-xs text-slate-600">
            {row.native} ({row.label})
            <input
              type="text"
              value={names[row.id] || ''}
              onChange={(e) => {
                const v = e.target.value;
                const next = { ...names };
                if (v.trim()) next[row.id] = v;
                else delete next[row.id];
                onChange(next);
              }}
              placeholder={row.id === 'hi' ? 'हल्दी पाउडर' : ''}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
