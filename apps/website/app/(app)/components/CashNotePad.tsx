'use client';

import { CASH_DENOMS, notesTotal, suggestNotes, type NoteCounts } from '@/lib/cash-notes';

/**
 * Count ₹ notes/coins when collecting cash at the counter or closing the drawer.
 */
export default function CashNotePad({
  counts,
  onChange,
  targetAmount,
  compact,
  label = 'Count notes',
}: {
  counts: NoteCounts;
  onChange: (next: NoteCounts) => void;
  /** Bill total — shows shortfall / change vs counted notes */
  targetAmount?: number;
  compact?: boolean;
  label?: string;
}) {
  const total = notesTotal(counts);
  const target = targetAmount != null && Number.isFinite(targetAmount) ? Math.round(targetAmount) : null;
  const diff = target != null ? total - target : null;

  const setCount = (denom: number, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw.replace(/\D/g, '')) || 0));
    onChange({ ...counts, [denom]: n || undefined });
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 ${compact ? 'p-1.5' : 'p-2'}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className={`font-semibold text-slate-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>{label}</p>
        {target != null && target > 0 && (
          <button
            type="button"
            onClick={() => onChange(suggestNotes(target))}
            className="text-[10px] font-semibold text-brand-700 hover:underline"
          >
            Auto for ₹{target}
          </button>
        )}
      </div>
      <div className={`grid gap-1 ${compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-5'}`}>
        {CASH_DENOMS.map((d) => (
          <label key={d} className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1 py-0.5">
            <span className={`shrink-0 font-semibold text-slate-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>₹{d}</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={counts[d] || ''}
              onChange={(e) => setCount(d, e.target.value)}
              placeholder="0"
              className={`min-w-0 flex-1 rounded border-0 bg-transparent text-right font-semibold tabular-nums outline-none ${compact ? 'h-6 text-xs' : 'h-7 text-sm'}`}
              aria-label={`Count of ₹${d} notes`}
            />
          </label>
        ))}
      </div>
      <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        <span className="font-bold tabular-nums text-slate-900">Counted ₹{total.toFixed(0)}</span>
        {diff != null && (
          <span className={`font-semibold tabular-nums ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-sky-700' : 'text-amber-700'}`}>
            {diff === 0 ? 'Exact' : diff > 0 ? `Change ₹${diff}` : `Short ₹${Math.abs(diff)}`}
          </span>
        )}
      </div>
    </div>
  );
}
