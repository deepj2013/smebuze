'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import NumberField from '@/app/(app)/components/NumberField';
import { defaultItemRate, lookupCustomerRate, type PricedItem } from '@/lib/item-pricing';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface Quotation { id: string; number: string; customer_id?: string | null; lead_id?: string | null; customer?: { name: string }; lead?: { name: string } }
interface Item extends PricedItem {}
interface OrderLine { item_id:string; qty:number; rate:number; unit:string; description:string; customer_rate?: boolean }

export default function NewSalesOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationIdParam = searchParams?.get('quotation_id') ?? '';
  const [quotationId, setQuotationId] = useState(quotationIdParam);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items,setItems]=useState<Item[]>([]);
  const [lines,setLines]=useState<OrderLine[]>([{item_id:'',qty:1,rate:0,unit:'pcs',description:''}]);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, qRes,itemRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Quotation[] | { data: Quotation[] }>('sales/quotations'),
        apiGet<Item[]>('inventory/items?purpose=sale'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const qList = Array.isArray(qRes.data) ? qRes.data : (qRes.data as { data?: Quotation[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setQuotations(qList);
      setItems(itemRes.data||[]);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    apiGet<Branch[] | { data: Branch[] }>(`organization/companies/${companyId}/branches`).then(({ data }) => {
      const list = Array.isArray(data) ? data : (data as { data?: Branch[] })?.data ?? [];
      setBranches(list);
      setBranchId(list[0]?.id ?? '');
    });
  }, [companyId]);

  useEffect(() => {
    if (quotationIdParam) setQuotationId(quotationIdParam);
  }, [quotationIdParam]);

  useEffect(() => {
    if (quotationId && quotations.length) {
      const q = quotations.find((x) => x.id === quotationId);
      if (q) setCustomerId((q as { customer_id?: string }).customer_id ?? '');
    }
  }, [quotationId, quotations]);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    apiGet<Array<{ item_id: string; rate: string }>>(`crm/customers/${customerId}/item-rates`).then(({ data }) => {
      if (cancelled || !data?.length) return;
      const map: Record<string, number> = {};
      for (const r of data) map[r.item_id] = Number(r.rate);
      setLines((prev) =>
        prev.map((l) =>
          l.item_id && map[l.item_id] != null && Number.isFinite(map[l.item_id])
            ? { ...l, rate: map[l.item_id], customer_rate: true }
            : l,
        ),
      );
    });
    return () => { cancelled = true; };
  }, [customerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.item_id) { setError(`Line ${i + 1}: select an item`); return; }
      if (!Number.isFinite(l.qty) || l.qty <= 0) { setError(`Line ${i + 1}: quantity must be greater than 0`); return; }
      if (!Number.isFinite(l.rate) || l.rate < 0) { setError(`Line ${i + 1}: rate must be a number 0 or greater`); return; }
    }
    setLoading(true);
    const body = {
      company_id: companyId,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      quotation_id: quotationId || undefined,
      order_date: orderDate,
      lines,
    };
    const { data, error: err } = await apiPost<{ id: string }>('sales/orders', body);
    setLoading(false);
    if (err) setError(err);
    else if (data && typeof data === 'object' && 'id' in data) router.push(`/sales/orders/${(data as { id: string }).id}`);
    else router.push('/sales/orders');
  };

  return (
    <div>
      <Link href="/sales/orders" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Sales orders</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create sales order</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      <form onSubmit={submit} className="max-w-4xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {quotations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Link from quotation</label>
            <select value={quotationId} onChange={(e) => setQuotationId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" aria-label="Quotation">
              <option value="">— None</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>{q.number} — {q.customer?.name ?? q.lead?.name ?? '—'}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Order items — stock is reserved immediately</label>
            <button type="button" onClick={()=>setLines(v=>[...v,{item_id:'',qty:1,rate:0,unit:'pcs',description:''}])} className="text-sm text-brand-600">+ Add line</button>
          </div>
          <div className="mt-2 space-y-2">
            {lines.map((line,i)=>(
              <div key={i} className="grid gap-2 rounded border p-3 sm:grid-cols-5">
                <select
                  required
                  value={line.item_id}
                  onChange={async (e) => {
                    const item = items.find((x) => x.id === e.target.value);
                    const custom = item ? await lookupCustomerRate(customerId, item.id) : null;
                    const rate = custom ?? (item ? defaultItemRate(item) : 0);
                    setLines((v) => v.map((x, j) => j === i ? {
                      ...x,
                      item_id: e.target.value,
                      description: item?.name || '',
                      unit: item?.unit || 'pcs',
                      rate,
                      customer_rate: custom != null,
                    } : x));
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-2 text-slate-900 sm:col-span-2 min-h-[44px]"
                >
                  <option value="">Select SKU</option>
                  {items.map((x) => <option key={x.id} value={x.id}>{x.name} {x.sku ? `(${x.sku})` : ''}</option>)}
                </select>
                <NumberField aria-label="Quantity" required min={0.01} step="0.01" value={line.qty} onNumber={(n)=>setLines(v=>v.map((x,j)=>j===i?{...x,qty:n}:x))} />
                <div>
                  <NumberField aria-label="Rate" required min={0} step="0.01" value={line.rate} onNumber={(n)=>setLines(v=>v.map((x,j)=>j===i?{...x,rate:n,customer_rate:false}:x))} />
                  {line.customer_rate && <p className="text-[10px] text-cyan-700 mt-0.5">Customer rate</p>}
                </div>
                <button type="button" disabled={lines.length===1} onClick={()=>setLines(v=>v.filter((_,j)=>j!==i))} className="text-sm text-red-600 disabled:opacity-30">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Order date *</label>
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create</button>
          <Link href="/sales/orders" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
