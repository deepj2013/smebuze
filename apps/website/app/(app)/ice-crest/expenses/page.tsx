'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { limitDecimalPlaces, round2 } from '@/lib/money';

type Vendor = { id: string; name: string; gstin?: string | null };
type Expense = {
  id: string; expense_number?: string; entry_type: string; category: string; nature?: string;
  amount: string; paid_amount: string; tds_amount: string; status: string; expense_date: string;
  description?: string; employee_name?: string; invoice_number?: string; journal_entry_id?: string | null;
};
const categories = ['Purchase / raw material', 'Salary', 'Daily wages', 'Contract labour', 'Transport', 'Fuel', 'Electricity', 'Water', 'Rent', 'Repairs & maintenance', 'Plastic/packaging charges', 'Machinery / equipment', 'Marketing', 'Professional fees', 'Bank charges', 'Taxes & licences', 'Miscellaneous', 'Other operational expenses'];
const natures = [
  ['production', 'Production / productivity'],
  ['operations', 'Operations'],
  ['selling', 'Selling & marketing'],
  ['admin', 'Administration'],
  ['finance', 'Finance & bank'],
  ['statutory', 'Statutory / tax'],
  ['capex', 'Capital / asset'],
];
const types = [['purchase', 'Purchase entry'], ['wage', 'Wages'], ['salary', 'Salary'], ['operating_expense', 'Operating expense'], ['asset_purchase', 'Asset/machinery purchase'], ['statutory_payment', 'Tax/statutory payment']];
const natureFor = (category: string, entryType: string) => {
  if (entryType === 'asset_purchase' || category === 'Machinery / equipment') return 'capex';
  if (category === 'Purchase / raw material' || category === 'Daily wages' || category === 'Contract labour' || category === 'Plastic/packaging charges' || category === 'Fuel') return 'production';
  if (category === 'Marketing') return 'selling';
  if (category === 'Salary' || category === 'Professional fees' || category === 'Miscellaneous') return 'admin';
  if (category === 'Bank charges') return 'finance';
  if (category === 'Taxes & licences') return 'statutory';
  return 'operations';
};
const blank = () => ({
  entry_type: 'operating_expense', category: 'Miscellaneous', nature: 'admin', vendor_id: '', employee_name: '',
  taxable_amount: '', gst_rate: '0', tds_amount: '0', paid_amount: '0', expense_date: new Date().toISOString().slice(0, 10),
  due_date: '', invoice_number: '', hsn_sac: '', itc_eligible: false, description: '', payment_mode: 'Cash', reference: '',
});

export default function Expenses() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState(blank());
  const [filter, setFilter] = useState('');
  const [natureFilter, setNatureFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const base = round2(Number(form.taxable_amount || 0));
  const gst = round2(base * Number(form.gst_rate || 0) / 100);
  const total = round2(base + gst);
  const due = round2(total - Number(form.paid_amount || 0) - Number(form.tds_amount || 0));
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filter) p.set('category', filter);
    if (natureFilter) p.set('nature', natureFilter);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
  }, [filter, natureFilter, from, to]);
  const load = () => apiGet<Expense[]>(`ice-crest/expenses${query ? `?${query}` : ''}`).then((r) => setRows(r.data || []));
  useEffect(() => { void load(); }, [query]);
  useEffect(() => { void apiGet<Vendor[]>('purchase/vendors').then((r) => setVendors(r.data || [])); }, []);
  function changeType(v: string) {
    const category = v === 'purchase' ? 'Purchase / raw material' : v === 'wage' ? 'Daily wages' : v === 'salary' ? 'Salary' : v === 'asset_purchase' ? 'Machinery / equipment' : v === 'statutory_payment' ? 'Taxes & licences' : 'Miscellaneous';
    setForm({ ...form, entry_type: v, category, nature: natureFor(category, v), vendor_id: '', employee_name: '', itc_eligible: v === 'purchase' });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const r = await apiPost('ice-crest/expenses', {
      ...form,
      taxable_amount: base,
      gst_rate: Number(form.gst_rate),
      tds_amount: Number(form.tds_amount),
      paid_amount: Number(form.paid_amount),
      vendor_id: form.vendor_id || undefined,
      due_date: form.due_date || undefined,
      hsn_sac: form.hsn_sac || undefined,
    });
    setSaving(false);
    if (r.error) setMsg(r.error);
    else {
      setMsg(r.data && (r.data as Expense).journal_entry_id ? 'Entry recorded and posted to accounts.' : 'Entry recorded.');
      setForm(blank());
      load();
    }
  }
  async function payFull(x: Expense) {
    const outstanding = Math.max(0, Number(x.amount) - Number(x.paid_amount) - Number(x.tds_amount));
    if (!outstanding) return;
    const r = await apiPost(`ice-crest/expenses/${x.id}/payment`, { amount: outstanding, payment_mode: 'Bank transfer' });
    setMsg(r.error || 'Outstanding amount marked paid');
    if (!r.error) load();
  }
  const input = 'mt-1 w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2 text-base text-slate-900';
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-cyan-700">ICE CREST</p>
        <h1 className="text-2xl font-bold">Purchases, wages & expenses</h1>
        <p className="text-sm text-slate-500">
          Book costs by purpose (production, operations, selling, admin). GST vendor bills with a GSTIN flow into GSTR-2A recon and a journal is posted so the books stay complete.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/reports/gstr-2a" className="text-cyan-700">GSTR-2A recon →</Link>
          <Link href="/reports/gstr-1" className="text-cyan-700">GSTR-1 from sales →</Link>
          <Link href="/accounting/journal" className="text-cyan-700">Journal →</Link>
        </div>
      </div>
      {msg && <p className="rounded bg-cyan-50 p-3 text-sm text-cyan-800">{msg}</p>}
      <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Entry type<select value={form.entry_type} onChange={(e) => changeType(e.target.value)} className={input}>{types.map((x) => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label>
        <label className="text-sm">Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, nature: natureFor(e.target.value, form.entry_type) })} className={input}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm">Purpose / nature<select value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })} className={input}>{natures.map((n) => <option key={n[0]} value={n[0]}>{n[1]}</option>)}</select></label>
        {form.entry_type === 'purchase' && (
          <label className="text-sm">Vendor *<select required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className={input}><option value="">Select vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.gstin ? ` · ${v.gstin}` : ''}</option>)}</select></label>
        )}
        {['wage', 'salary'].includes(form.entry_type) && <label className="text-sm">Employee / worker *<input required value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} className={input} /></label>}
        <label className="text-sm">Expense date *<input required type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className={input} /></label>
        <label className="text-sm">Supplier invoice / wage ref<input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className={input} /></label>
        <label className="text-sm">HSN / SAC<input value={form.hsn_sac} onChange={(e) => setForm({ ...form, hsn_sac: e.target.value })} className={input} placeholder="For GST purchases" /></label>
        <label className="text-sm">Base amount *<input required inputMode="decimal" value={form.taxable_amount} onChange={(e) => setForm({ ...form, taxable_amount: limitDecimalPlaces(e.target.value) })} className={input} /></label>
        <label className="text-sm">GST rate<select value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value, itc_eligible: Number(e.target.value) > 0 && form.entry_type === 'purchase' })} className={input}>{[0, 5, 12, 18, 28].map((x) => <option key={x} value={x}>{x}%</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm lg:col-span-2 pt-6">
          <input type="checkbox" checked={form.itc_eligible} onChange={(e) => setForm({ ...form, itc_eligible: e.target.checked })} />
          ITC eligible (input GST posted to books, used in GSTR-2A)
        </label>
        <label className="text-sm">TDS deducted<input inputMode="decimal" value={form.tds_amount} onChange={(e) => setForm({ ...form, tds_amount: limitDecimalPlaces(e.target.value) })} className={input} /></label>
        <label className="text-sm">Paid amount<input inputMode="decimal" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: limitDecimalPlaces(e.target.value) })} className={input} /></label>
        <label className="text-sm">Due date<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={input} /></label>
        <label className="text-sm">Payment mode<select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })} className={input}>{['Cash', 'UPI', 'Bank transfer', 'Card', 'Cheque', 'Credit', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="text-sm lg:col-span-2">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} /></label>
        <div className="rounded bg-slate-50 p-3 text-sm">
          <p>GST: <b>₹{gst.toFixed(2)}</b></p>
          <p>Total: <b>₹{total.toFixed(2)}</b></p>
          <p>Outstanding: <b>₹{Math.max(0, due).toFixed(2)}</b></p>
        </div>
        <button disabled={saving} className="h-fit w-fit rounded bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Record entry'}</button>
      </form>
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-semibold">Entry history</h2>
          <div className="flex flex-wrap gap-2">
            <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border px-2 py-2 text-sm" />
            <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border px-2 py-2 text-sm" />
            <select value={natureFilter} onChange={(e) => setNatureFilter(e.target.value)} className="rounded border px-2 py-2 text-sm">
              <option value="">All purposes</option>
              {natures.map((n) => <option key={n[0]} value={n[0]}>{n[1]}</option>)}
            </select>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border px-2 py-2 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Date / No.</th><th>Type / purpose</th><th>Party / Description</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Due</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => {
                const outstanding = Math.max(0, Number(x.amount) - Number(x.paid_amount) - Number(x.tds_amount));
                return (
                  <tr key={x.id} className="border-b">
                    <td className="py-2">{String(x.expense_date).slice(0, 10)}<br /><span className="text-xs">{x.expense_number}</span></td>
                    <td>{types.find((t) => t[0] === x.entry_type)?.[1] || x.entry_type}<br /><span className="text-xs text-slate-500">{natures.find((n) => n[0] === x.nature)?.[1] || x.category}</span></td>
                    <td>{x.employee_name || x.description || x.invoice_number || '—'}</td>
                    <td className="capitalize">{x.status}{x.journal_entry_id ? <span className="block text-xs text-emerald-700">In books</span> : null}</td>
                    <td className="text-right font-semibold">₹{Number(x.amount).toFixed(2)}</td>
                    <td className="text-right">₹{outstanding.toFixed(2)}</td>
                    <td>{outstanding > 0 && <button type="button" onClick={() => payFull(x)} className="text-xs text-cyan-700">Pay full</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
