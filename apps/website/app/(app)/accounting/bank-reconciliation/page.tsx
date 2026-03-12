'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface BankLine {
  id: string;
  line_date: string;
  description: string | null;
  amount: string;
  balance_after: string | null;
  reconciled_at: string | null;
  journal_entry_id: string | null;
  statement_ref: string | null;
}

export default function BankReconciliationPage() {
  const [lines, setLines] = useState<BankLine[]>([]);
  const [journalEntries, setJournalEntries] = useState<{ id: string; number: string }[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [matchJeId, setMatchJeId] = useState('');

  useEffect(() => {
    (async () => {
      const [linesRes, journalRes] = await Promise.all([
        apiGet<BankLine[]>('accounting/bank-statement-lines' + (companyId ? `?company_id=${companyId}` : '')),
        apiGet<{ id: string; number: string }[]>('accounting/journal'),
      ]);
      if (linesRes.data && Array.isArray(linesRes.data)) setLines(linesRes.data);
      if (journalRes.data && Array.isArray(journalRes.data)) setJournalEntries(journalRes.data);
      setLoading(false);
    })();
  }, [companyId]);

  const handleReconcile = async (lineId: string) => {
    if (!matchJeId) return;
    setReconcilingId(lineId);
    const { error } = await apiPost(`accounting/bank-statement-lines/${lineId}/reconcile`, { journal_entry_id: matchJeId });
    if (!error) {
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId
            ? { ...l, reconciled_at: new Date().toISOString(), journal_entry_id: matchJeId }
            : l,
        ),
      );
      setReconcilingId(null);
      setMatchJeId('');
    }
    setReconcilingId(null);
  };

  const unmatched = lines.filter((l) => !l.reconciled_at);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Bank reconciliation</h1>
      <p className="text-sm text-slate-600 mb-4">
        Match bank statement lines to journal entries. Upload or create statement lines via API; then match and mark reconciled.
      </p>
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Date</th>
                <th className="text-left p-3 font-medium text-slate-700">Description</th>
                <th className="text-right p-3 font-medium text-slate-700">Amount</th>
                <th className="text-left p-3 font-medium text-slate-700">Status</th>
                <th className="text-left p-3 font-medium text-slate-700">Match to JE</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No bank statement lines. Add lines via POST /accounting/bank-statement-lines (company_id, line_date, amount, description).
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{line.line_date?.slice?.(0, 10) ?? '—'}</td>
                    <td className="p-3">{line.description ?? line.statement_ref ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(line.amount).toFixed(2)}</td>
                    <td className="p-3">{line.reconciled_at ? 'Reconciled' : 'Unmatched'}</td>
                    <td className="p-3">
                      {!line.reconciled_at && (
                        <div className="flex items-center gap-2">
                          <select
                            value={reconcilingId === line.id ? matchJeId : ''}
                            onChange={(e) => {
                              setMatchJeId(e.target.value);
                              setReconcilingId(line.id);
                            }}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Select journal entry</option>
                            {journalEntries.map((je) => (
                              <option key={je.id} value={je.id}>
                                {je.number}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!matchJeId || reconcilingId === line.id}
                            onClick={() => handleReconcile(line.id)}
                            className="rounded bg-brand-600 text-white px-2 py-1 text-xs hover:bg-brand-700 disabled:opacity-50"
                          >
                            Reconcile
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
