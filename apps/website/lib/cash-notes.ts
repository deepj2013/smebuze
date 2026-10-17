/** Indian cash denominations for counter / drawer counting. */
export const CASH_DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export type CashDenom = (typeof CASH_DENOMS)[number];
export type NoteCounts = Partial<Record<CashDenom, number>>;

export function notesTotal(counts: NoteCounts): number {
  return CASH_DENOMS.reduce((sum, d) => sum + d * (Math.max(0, Math.floor(Number(counts[d]) || 0))), 0);
}

export function formatNotesSummary(counts: NoteCounts): string {
  return CASH_DENOMS.filter((d) => (counts[d] || 0) > 0)
    .map((d) => `₹${d}×${counts[d]}`)
    .join(', ');
}

/** Suggest note mix for an amount (greedy largest first). */
export function suggestNotes(amount: number): NoteCounts {
  let left = Math.max(0, Math.round(amount));
  const out: NoteCounts = {};
  for (const d of CASH_DENOMS) {
    const n = Math.floor(left / d);
    if (n > 0) {
      out[d] = n;
      left -= n * d;
    }
  }
  return out;
}
