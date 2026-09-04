'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/app/(app)/components/ToastContext';
import NumberField from '@/app/(app)/components/NumberField';
import { defaultItemRate, lookupCustomerRate, splitItemGst, type PricedItem } from '@/lib/item-pricing';

interface Company { id: string; name: string }
interface Branch { id: string; name: string }
interface Customer { id: string; name: string }
interface Vendor { id: string; name: string }
interface SalesOrderOption { id:string; number:string; customer_id?:string|null; status:string; lines?:Array<{item_id?:string|null;description?:string|null;quantity:string;unit:string;rate:string;item?:{name:string;sku?:string|null;hsn_sac?:string|null}}> }

interface SearchItem { id: string; name: string; sku: string | null; category?: string | null }
interface FullItem extends PricedItem {}

type PaymentTermKey = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'custom';

const PAYMENT_TERMS: { value: PaymentTermKey; label: string; days?: number }[] = [
  { value: 'due_on_receipt', label: 'Due on receipt', days: 0 },
  { value: 'net_15', label: 'Net 15', days: 15 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_45', label: 'Net 45', days: 45 },
  { value: 'custom', label: 'Custom' },
];

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface LineRow {
  item_id?: string;
  item_sku?: string | null;
  item_name?: string;
  item_image_url?: string | null;
  hsn_sac: string;
  description: string;
  qty: number;
  unit: string;
  rate: number;
  cgst_rate: number;
  sgst_rate: number;
  customer_rate?: boolean;
}

const emptyLine = (gst = { cgst: 9, sgst: 9 }): LineRow => ({
  hsn_sac: '9983',
  description: '',
  qty: 1,
  unit: 'pcs',
  rate: 0,
  cgst_rate: gst.cgst,
  sgst_rate: gst.sgst,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams=useSearchParams();
  const { success, error: showError } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentTerm, setPaymentTerm] = useState<PaymentTermKey>('net_30');
  const [showDueDate, setShowDueDate] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [number, setNumber] = useState('');
  const [lines, setLines] = useState<LineRow[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerCreditLimit, setCustomerCreditLimit] = useState<number | null>(null);
  const [gstApplicable, setGstApplicable] = useState(true);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [salesOrders,setSalesOrders]=useState<SalesOrderOption[]>([]);
  const [salesOrderId,setSalesOrderId]=useState('');
  const [defaultGst, setDefaultGst] = useState({ cgst: 9, sgst: 9 });
  useEffect(() => {
    apiGet<{ tenant?: { slug?: string; settings?: { business_type?: string } } }>('auth/me').then(({ data }) => {
      const t = data?.tenant;
      if (t?.slug === 'ice-crest' || t?.settings?.business_type === 'ice_crest') {
        setDefaultGst({ cgst: 2.5, sgst: 2.5 });
        setLines((prev) => prev.map((l) => (l.item_id ? l : { ...l, cgst_rate: 2.5, sgst_rate: 2.5 })));
        setShowDueDate(false);
        setDueDate('');
      }
    });
  }, []);
  useEffect(()=>{const id=searchParams?.get('sales_order_id');if(id&&salesOrders.some(x=>x.id===id)){const o=salesOrders.find(x=>x.id===id)!;setSalesOrderId(id);setCustomerId(o.customer_id||'');setVendorId('');setLines((o.lines||[]).map(l=>({item_id:l.item_id||undefined,item_sku:l.item?.sku,item_name:l.item?.name,hsn_sac:l.item?.hsn_sac||'22019010',description:l.description||l.item?.name||'Item',qty:Number(l.quantity),unit:l.unit||'pcs',rate:Number(l.rate),cgst_rate:defaultGst.cgst,sgst_rate:defaultGst.sgst}))) }},[searchParams,salesOrders,defaultGst]);

  // Derive due date from payment term and invoice date when they choose to show it
  useEffect(() => {
    if (!showDueDate) {
      setDueDate('');
      return;
    }
    if (paymentTerm === 'custom') return;
    const term = PAYMENT_TERMS.find((t) => t.value === paymentTerm);
    const days = term?.days ?? 30;
    setDueDate(addDays(invoiceDate, days));
  }, [invoiceDate, paymentTerm, showDueDate]);

  useEffect(() => {
    if (!customerId) { setCustomerCreditLimit(null); return; }
    apiGet<{ credit_limit?: string }>(`crm/customers/${customerId}`).then(({ data }) => {
      setCustomerCreditLimit(data?.credit_limit != null ? parseFloat(data.credit_limit) : null);
    }).catch(() => setCustomerCreditLimit(null));
  }, [customerId]);

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

  useEffect(() => {
    (async () => {
      const [cRes, custRes, vRes,orderRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<Vendor[] | { data: Vendor[] }>('purchase/vendors'),
        apiGet<SalesOrderOption[]>('sales/orders'),
      ]);
      const cList = Array.isArray(cRes.data) ? cRes.data : (cRes.data as { data?: Company[] })?.data ?? [];
      const custList = Array.isArray(custRes.data) ? custRes.data : (custRes.data as { data?: Customer[] })?.data ?? [];
      const vList = Array.isArray(vRes.data) ? vRes.data : (vRes.data as { data?: Vendor[] })?.data ?? [];
      setCompanies(cList);
      setCustomers(custList);
      setVendors(vList);
      setSalesOrders((orderRes.data||[]).filter(x=>!['cancelled','rejected','invoiced','closed'].includes(x.status)));
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

  const addLine = () => setLines((prev) => [...prev, emptyLine(defaultGst)]);

  const updateLine = (i: number, field: keyof LineRow, value: string | number) => {
    setLines((prev) =>
      prev.map((line, idx) => (idx === i ? { ...line, [field]: value } : line))
    );
  };

  const setLineFromItem = useCallback(async (lineIndex: number, item: FullItem) => {
    const gst = splitItemGst(item);
    const custom = await lookupCustomerRate(customerId, item.id);
    const rate = custom ?? defaultItemRate(item);
    setLines((prev) =>
      prev.map((line, idx) =>
        idx === lineIndex
          ? {
              ...line,
              item_id: item.id,
              item_sku: item.sku ?? null,
              item_name: item.name,
              item_image_url: Array.isArray(item.image_urls) && item.image_urls[0] ? item.image_urls[0] : null,
              hsn_sac: item.hsn_sac ?? line.hsn_sac,
              description: item.description ?? item.name ?? line.description,
              unit: item.unit ?? line.unit,
              rate: Number.isFinite(rate) ? rate : line.rate,
              cgst_rate: gst.cgst,
              sgst_rate: gst.sgst,
              customer_rate: custom != null,
            }
          : line
      )
    );
  }, [customerId]);

  const removeLine = (i: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId && !vendorId) {
      setError('Select either Customer or Vendor (bill-to).');
      return;
    }
    if (customerId && vendorId) {
      setError('Select only one: Customer or Vendor.');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!Number.isFinite(l.qty) || l.qty <= 0) {
        setError(`Line ${i + 1}: quantity must be greater than 0`);
        return;
      }
      if (!Number.isFinite(l.rate) || l.rate < 0) {
        setError(`Line ${i + 1}: rate must be a number 0 or greater`);
        return;
      }
      if (!Number.isFinite(l.cgst_rate) || l.cgst_rate < 0 || l.cgst_rate > 100 || !Number.isFinite(l.sgst_rate) || l.sgst_rate < 0 || l.sgst_rate > 100) {
        setError(`Line ${i + 1}: CGST and SGST must be between 0 and 100`);
        return;
      }
    }
    setError(null);
    setLoading(true);
    const body = {
      company_id: companyId,
      sales_order_id: salesOrderId||undefined,
      branch_id: branchId || undefined,
      customer_id: customerId || undefined,
      vendor_id: vendorId || undefined,
      invoice_date: invoiceDate,
      due_date: showDueDate && dueDate ? dueDate : null,
      number: number || undefined,
      gst_applicable: gstApplicable,
      shipping_charges: shippingCharges,
      other_charges: otherCharges,
      discount_amount: discountAmount,
      lines: lines.map((l) => ({
        item_id: l.item_id || undefined,
        hsn_sac: l.hsn_sac,
        description: l.description || l.item_name || 'Item',
        qty: l.qty,
        unit: l.unit,
        rate: l.rate,
        cgst_rate: gstApplicable ? l.cgst_rate : 0,
        sgst_rate: gstApplicable ? l.sgst_rate : 0,
      })),
    };
    const { error: err } = await apiPost('sales/invoices', body);
    setLoading(false);
    if (err) {
      setError(err);
      showError(err);
    } else {
      success('Invoice created');
      router.push('/sales/invoices');
    }
  };

  return (
    <div>
      <Link href="/sales/invoices" className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-block">← Invoices</Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Create invoice</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {customerId && customerCreditLimit != null && customerCreditLimit > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Customer credit limit: ₹{customerCreditLimit.toFixed(2)}. Total exposure is validated on save; invoice creation will fail if it exceeds the limit.
        </div>
      )}
      <form onSubmit={submit} className="space-y-6 max-w-5xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Invoice reserved sales order (recommended)</label><select value={salesOrderId} onChange={e=>{const id=e.target.value;setSalesOrderId(id);const o=salesOrders.find(x=>x.id===id);if(o){setCustomerId(o.customer_id||'');setVendorId('');setLines((o.lines||[]).map(l=>({item_id:l.item_id||undefined,item_sku:l.item?.sku,item_name:l.item?.name,hsn_sac:l.item?.hsn_sac||'22019010',description:l.description||l.item?.name||'Item',qty:Number(l.quantity),unit:l.unit||'pcs',rate:Number(l.rate),cgst_rate:defaultGst.cgst,sgst_rate:defaultGst.sgst})));}}} className="w-full rounded border border-slate-300 px-3 py-2 text-sm"><option value="">Direct invoice — use unreserved stock</option>{salesOrders.map(o=><option key={o.id} value={o.id}>{o.number} — {o.status}</option>)}</select><p className="mt-1 text-xs text-slate-500">Linked invoices consume the order reservation atomically and never deduct twice.</p></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Printed invoice uses this company&apos;s logo, name, and bank details.{' '}
              <Link href={companyId ? `/organization/companies/${companyId}/edit` : '/organization/companies'} className="text-brand-600 hover:underline">Edit company</Link>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill to: Customer</label>
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVendorId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bill to: Vendor</label>
            <select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setCustomerId(''); }} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
              <option value="">—</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice date *</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={showDueDate}
                onChange={(e) => setShowDueDate(e.target.checked)}
              />
              Show due date on invoice
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Optional. Leave off to hide the due date on print and WhatsApp copies.
            </p>
          </div>
          {showDueDate && (
            <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment term</label>
            <select
              value={paymentTerm}
              onChange={(e) => setPaymentTerm(e.target.value as PaymentTermKey)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              disabled={paymentTerm !== 'custom'}
            />
          </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice number</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Auto if empty" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-900">Line items</h2>
            <button type="button" onClick={addLine} className="text-sm text-brand-600 hover:underline">+ Add line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="text-left py-2 pr-2 w-[200px]">Item (search by SKU)</th>
                  <th className="text-left py-2 pr-2 w-20">HSN/SAC</th>
                  <th className="text-left py-2 pr-2 min-w-[140px]">Description</th>
                  <th className="text-right py-2 pr-2 w-16">Qty</th>
                  <th className="text-left py-2 pr-2 w-14">Unit</th>
                  <th className="text-right py-2 pr-2 w-20">Rate</th>
                  <th className="text-right py-2 pr-2 w-14">CGST %</th>
                  <th className="text-right py-2 pr-2 w-14">SGST %</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2 overflow-visible relative">
                      <ItemSearchCell
                        line={line}
                        onSelectItem={async (itemId) => {
                          const { data } = await apiGet<FullItem>(`inventory/items/${itemId}`);
                          if (data) setLineFromItem(i, data);
                        }}
                        onClearItem={() => {
                          setLines((prev) =>
                            prev.map((ln, idx) =>
                              idx === i
                                ? {
                                    ...ln,
                                    item_id: undefined,
                                    item_sku: undefined,
                                    item_name: undefined,
                                    item_image_url: undefined,
                                  }
                                : ln
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="py-1 pr-2"><input type="text" value={line.hsn_sac} onChange={(e) => updateLine(i, 'hsn_sac', e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" /></td>
                    <td className="py-1 pr-2"><input type="text" value={line.description} onChange={(e) => updateLine(i, 'description', e.target.value)} className="w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm" placeholder="Description" /></td>
                    <td className="py-1 pr-2 min-w-[5.5rem]"><NumberField whole min={0} value={line.qty} onNumber={(n) => updateLine(i, 'qty', n)} aria-label={`Line ${i + 1} quantity`} /></td>
                    <td className="py-1 pr-2"><input type="text" value={line.unit} onChange={(e) => updateLine(i, 'unit', e.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 min-h-[44px]" /></td>
                    <td className="py-1 pr-2 min-w-[6rem]">
                      <NumberField min={0} step="0.01" value={line.rate} onNumber={(n) => updateLine(i, 'rate', n)} aria-label={`Line ${i + 1} rate`} />
                      {line.customer_rate && <p className="text-[10px] text-cyan-700 mt-0.5">Customer rate</p>}
                    </td>
                    <td className="py-1 pr-2 min-w-[5.5rem]"><NumberField min={0} max={100} step="0.01" value={line.cgst_rate} onNumber={(n) => updateLine(i, 'cgst_rate', n)} aria-label={`Line ${i + 1} CGST`} /></td>
                    <td className="py-1 pr-2 min-w-[5.5rem]"><NumberField min={0} max={100} step="0.01" value={line.sgst_rate} onNumber={(n) => updateLine(i, 'sgst_rate', n)} aria-label={`Line ${i + 1} SGST`} /></td>
                    <td className="py-1"><button type="button" onClick={() => removeLine(i)} className="text-red-600 text-xs hover:underline">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 sm:grid-cols-4">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2"><input type="checkbox" checked={gstApplicable} onChange={(e) => setGstApplicable(e.target.checked)} /> GST customer</label>
          <label className="text-sm text-slate-700">Shipping charges<NumberField min={0} step="0.01" value={shippingCharges} onNumber={setShippingCharges} className="mt-1" /></label>
          <label className="text-sm text-slate-700">Other charges<NumberField min={0} step="0.01" value={otherCharges} onNumber={setOtherCharges} className="mt-1" /></label>
          <label className="text-sm text-slate-700">Discount<NumberField min={0} step="0.01" value={discountAmount} onNumber={setDiscountAmount} className="mt-1" /></label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">Create invoice</button>
          <Link href="/sales/invoices" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

// Debounced item search dropdown; on focus shows suggested items, on type searches
function ItemSearchCell({
  line,
  onSelectItem,
  onClearItem,
}: {
  line: LineRow;
  onSelectItem: (itemId: string) => Promise<void>;
  onClearItem?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) {
      setDropdownRect(null);
      return;
    }
    const el = wrapperRef.current;
    const rect = el.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
  }, [open, results.length, loadingSuggested, searching]);

  const loadSuggestedItems = useCallback(() => {
    setLoadingSuggested(true);
    apiGet<SearchItem[] | { data: SearchItem[] }>('inventory/items?purpose=sale')
      .then(({ data }) => {
        const raw = Array.isArray(data) ? data : (data as { data?: SearchItem[] })?.data ?? [];
        const list = raw.slice(0, 14).map((it: { id: string; name: string; sku?: string | null; category?: string | null }) => ({
          id: it.id,
          name: it.name,
          sku: it.sku ?? null,
          category: it.category ?? null,
        }));
        setResults(list);
        setOpen(list.length > 0);
      })
      .finally(() => setLoadingSuggested(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      apiGet<{ items?: SearchItem[] }>(`search?q=${encodeURIComponent(query)}`)
        .then(({ data }) => {
          const list = data?.items ?? [];
          setResults(list);
          setOpen(list.length > 0);
        })
        .finally(() => setSearching(false));
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasItem = line.item_id && (line.item_name || line.item_sku);
  const showSuggested = open && !query.trim();
  const showSearchResults = open && query.trim();

  return (
    <div ref={wrapperRef} className="relative overflow-visible">
      {hasItem ? (
        <div className="flex items-center gap-2">
          {line.item_image_url ? (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
              <img src={line.item_image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-400 text-xs">—</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-800">{line.item_name || 'Item'}</div>
            {line.item_sku && <div className="truncate text-xs text-slate-500">{line.item_sku}</div>}
          </div>
          <button
            type="button"
            onClick={() => { onClearItem?.(); setQuery(''); setResults([]); setOpen(false); }}
            className="text-xs text-brand-600 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (!query.trim()) {
              loadSuggestedItems();
            } else if (results.length > 0) setOpen(true);
          }}
          onClick={() => {
            if (!query.trim()) loadSuggestedItems();
          }}
          placeholder="Click or search by SKU / name..."
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      )}
      {typeof document !== 'undefined' &&
        open &&
        (showSuggested || showSearchResults || hasItem) &&
        dropdownRect &&
        createPortal(
          <ul
            className="max-h-56 overflow-auto rounded border border-slate-200 bg-white py-1 shadow-lg"
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 10000,
            }}
          >
            {showSuggested && (
              <>
                <li className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  Browse items
                </li>
                {loadingSuggested ? (
                  <li className="px-3 py-2 text-slate-500 text-sm">Loading...</li>
                ) : results.length === 0 ? (
                  <li className="px-3 py-2 text-slate-500 text-sm">No items yet. Add items in Inventory.</li>
                ) : (
                  results.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          onSelectItem(it.id);
                          setQuery('');
                          setResults([]);
                          setOpen(false);
                        }}
                      >
                        <span className="font-medium text-slate-800">{it.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {it.sku && <span>{it.sku}</span>}
                          {it.category && <span className="rounded bg-slate-100 px-1.5 py-0.5">{it.category}</span>}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </>
            )}
            {showSearchResults && (
              <>
                {searching ? (
                  <li className="px-3 py-2 text-slate-500 text-sm">Searching...</li>
                ) : results.length === 0 ? (
                  <li className="px-3 py-2 text-slate-500 text-sm">No items found</li>
                ) : (
                  results.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          onSelectItem(it.id);
                          setQuery('');
                          setResults([]);
                          setOpen(false);
                        }}
                      >
                        <span className="font-medium text-slate-800">{it.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {it.sku && <span>{it.sku}</span>}
                          {it.category && <span className="rounded bg-slate-100 px-1.5 py-0.5">{it.category}</span>}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </>
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
