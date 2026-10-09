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

interface Company {
  id: string;
  name: string;
}

export default function BankReconciliationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [lines, setLines] = useState<BankLine[]>([]);
  const [journalEntries, setJournalEntries] = useState<{ id: string; number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [matchJeId, setMatchJeId] = useState('');
  const [form, setForm] = useState({ line_date: '', amount: '', description: '', statement_ref: '' });
  const [csvText, setCsvText] = useState('');

  async function load() {
    setLoading(true);
    const q = companyId ? `?company_id=${companyId}` : '';
    const [linesRes, journalRes] = await Promise.all([
      apiGet<BankLine[]>(`accounting/bank-statement-lines${q}`),
      apiGet<{ id: string; number: string }[]>(`accounting/journal${q}`),
    ]);
    if (linesRes.error) setError(linesRes.error);
    if (linesRes.data && Array.isArray(linesRes.data)) setLines(linesRes.data);
    if (journalRes.data && Array.isArray(journalRes.data)) setJournalEntries(journalRes.data);
    setLoading(false);
  }

  useEffect(() => {
    apiGet<Company[]>('organization/companies').then((r) => {
      const arr = Array.isArray(r.data) ? r.data : [];
      setCompanies(arr);
      if (arr[0]) setCompanyId(arr[0].id);
    });
  }, []);

  useEffect(() => {
    if (companyId) void load();
  }, [companyId]);

  const handleReconcile = async (lineId: string) => {
    if (!matchJeId) return;
    setReconcilingId(lineId);
    const { error: err } = await apiPost(`accounting/bank-statement-lines/${lineId}/reconcile`, {
      journal_entry_id: matchJeId,
    });
    if (err) setError(err);
    else {
      setOk('Matched');
      setMatchJeId('');
      await load();
    }
    setReconcilingId(null);
  };

  async function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    const { error: err } = await apiPost('accounting/bank-statement-lines', {
      company_id: companyId,
      line_date: form.line_date,
      amount: Number(form.amount),
      description: form.description || undefined,
      statement_ref: form.statement_ref || undefined,
    });
    if (err) setError(err);
    else {
      setForm({ line_date: '', amount: '', description: '', statement_ref: '' });
      setOk('Line added');
      await load();
    }
  }

  async function importCsv(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !csvText.trim()) return;
    const rows = csvText
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(',').map((c) => c.trim()))
      .filter((cols) => cols.length >= 2 && cols[0] && cols[0].toLowerCase() !== 'date');
    const linesPayload = rows.map((cols) => ({
      line_date: cols[0],
      amount: Number(cols[1]),
      description: cols[2] || undefined,
      statement_ref: cols[3] || undefined,
    }));
    const { error: err } = await apiPost('accounting/bank-statement-lines/bulk', {
      company_id: companyId,
      lines: linesPayload,
    });
    if (err) setError(err);
    else {
      setCsvText('');
      setOk(`Imported ${linesPayload.length} lines`);
      await load();
    }
  }

  async function unreconcile(id: string) {
    const { error: err } = await apiPost(`accounting/bank-statement-lines/${id}/unreconcile`, {});
    if (err) setError(err);
    else await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Bank reconciliation</h1>
      <p className="text-sm text-slate-600 mb-4">
        Import statement lines, match to journal entries, mark reconciled. Format for CSV: date,amount,description,ref
      </p>
      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</p>}

      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mr-2">Company</label>
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={addLine} className="mb-4 grid gap-2 sm:grid-cols-5 rounded-xl border border-slate-200 bg-white p-4">
        <input
          required
          type="date"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.line_date}
          onChange={(e) => setForm({ ...form, line_date: e.target.value })}
        />
        <input
          required
          type="number"
          step="0.01"
          placeholder="Amount"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          placeholder="Description"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          placeholder="Ref"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={form.statement_ref}
          onChange={(e) => setForm({ ...form, statement_ref: e.target.value })}
        />
        <button type="submit" className="rounded-lg bg-brand-600 text-white text-sm font-medium px-3 py-2">
          Add line
        </button>
      </form>

      <form onSubmit={importCsv} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-medium">Bulk import CSV</p>
        <textarea
          rows={4}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono"
          placeholder={'2026-03-01,1500.00,NEFT customer,UTR123\n2026-03-02,-500.00,Bank charges,'}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Import
        </button>
      </form>

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
                <th className="text-left p-3 font-medium text-slate-700">Match</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No bank statement lines yet.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="border-b border-slate-100 last:border-0">
                    <td className="p-3">{String(line.line_date).slice(0, 10)}</td>
                    <td className="p-3">{line.description ?? line.statement_ref ?? '—'}</td>
                    <td className="p-3 text-right">₹{Number(line.amount).toFixed(2)}</td>
                    <td className="p-3">{line.reconciled_at ? 'Reconciled' : 'Open'}</td>
                    <td className="p-3">
                      {!line.reconciled_at ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={reconcilingId === line.id ? matchJeId : ''}
                            onChange={(e) => {
                              setMatchJeId(e.target.value);
                              setReconcilingId(line.id);
                            }}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Journal…</option>
                            {journalEntries.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.number}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!matchJeId || reconcilingId !== line.id}
                            onClick={() => void handleReconcile(line.id)}
                            className="text-brand-700 text-sm disabled:opacity-40"
                          >
                            Match
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="text-slate-600 text-sm underline" onClick={() => void unreconcile(line.id)}>
                          Undo
                        </button>
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
