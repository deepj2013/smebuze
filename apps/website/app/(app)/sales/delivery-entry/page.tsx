'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiUploadFile } from '@/lib/api';

interface Customer { id: string; name: string }
interface Company { id: string; name: string }
interface OrderLine { id: string; item_id?: string; item?: { name: string }; description?: string; quantity: string; rate: string; unit?: string }
interface SalesOrder { id: string; number: string; order_date: string; customer_id?: string; customer?: { name: string }; lines?: OrderLine[] }
interface PendingItem { customer_id: string; customer_name: string; orders: Array<{ order: SalesOrder; pending_lines: Array<{ line: OrderLine; delivered_qty: number; pending_qty: number }> }> }

export default function DeliveryEntryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10));
  const [signedImageFile, setSignedImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const [cRes, custRes, pRes] = await Promise.all([
        apiGet<Company[] | { data: Company[] }>('organization/companies'),
        apiGet<Customer[] | { data: Customer[] }>('crm/customers'),
        apiGet<PendingItem[] | { data: PendingItem[] }>('sales/pending-requirements'),
      ]);
      const cList = Array.isArray((cRes as { data?: unknown }).data) ? (cRes as { data: Company[] }).data : [];
      const custList = Array.isArray((custRes as { data?: unknown }).data) ? (custRes as { data: Customer[] }).data : [];
      const pList = Array.isArray((pRes as { data?: unknown }).data) ? (pRes as { data: PendingItem[] }).data : [];
      setCompanies(cList);
      setCustomers(custList);
      setPending(pList);
      if (cList.length) setCompanyId(cList[0].id);
    })();
  }, [done]);

  const selectedCustomerPending = customerId ? pending.find((p) => p.customer_id === customerId) : null;
  const orders = selectedCustomerPending?.orders ?? [];

  const submitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyId || !customerId || !selectedOrderId) {
      setError('Select customer and a requirement (order) to deliver.');
      return;
    }
    setLoading(true);
    let signedImageUrl: string | undefined;
    if (signedImageFile) {
      setUploading(true);
      const uploadRes = await apiUploadFile<{ url: string }>('sales/upload-challan-image', signedImageFile);
      setUploading(false);
      if (uploadRes.error) {
        setError(uploadRes.error);
        setLoading(false);
        return;
      }
      signedImageUrl = uploadRes.data?.url;
    }
    const orderRes = await apiGet<SalesOrder>(`sales/orders/${selectedOrderId}`);
    const order = (orderRes as { data?: SalesOrder }).data;
    if (!order?.lines?.length) {
      setError('Selected order has no lines.');
      setLoading(false);
      return;
    }
    const createRes = await apiPost<{ id: string }>('sales/delivery-challans', {
      company_id: companyId,
      customer_id: customerId,
      order_id: selectedOrderId,
      challan_date: challanDate,
    });
    const challanId = (createRes as { data?: { id: string } }).data?.id;
    if (!challanId) {
      setError((createRes as { error?: string }).error || 'Failed to create challan');
      setLoading(false);
      return;
    }
    const lines = order.lines.map((l, i) => ({
      item_id: l.item_id || undefined,
      description: l.item?.name || l.description,
      quantity: parseFloat(l.quantity) || 0,
      unit: l.unit || 'pcs',
      unit_price: parseFloat(l.rate) || 0,
      sort_order: i,
    }));
    await apiPatch(`sales/delivery-challans/${challanId}`, {
      status: 'delivered',
      signed_challan_image_url: signedImageUrl,
      lines,
    });
    setLoading(false);
    setSignedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedOrderId('');
    setDone((d) => !d);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Delivery entry</h1>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}

      <form onSubmit={submitDelivery} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setSelectedOrderId(''); }}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {customerId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requirement (pending delivery) *</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select requirement</option>
                {orders.map(({ order }) => (
                  <option key={order.id} value={order.id}>{order.number} – {(order as SalesOrder).customer?.name ?? ''}</option>
                ))}
              </select>
              {orders.length === 0 && <p className="text-sm text-slate-500 mt-1">No pending requirements for this customer.</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Delivery date *</label>
            <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Signed challan image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setSignedImageFile(e.target.files?.[0] ?? null)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="text-xs text-slate-500 mt-1">Upload or take a photo of the signed delivery challan (on mobile, tap to use camera). Max 5 MB.</p>
            {signedImageFile && <p className="text-sm text-slate-600 mt-1">Selected: {signedImageFile.name}</p>}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={loading || uploading || !selectedOrderId} className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {uploading ? 'Uploading image…' : loading ? 'Saving…' : 'Create delivery & mark delivered'}
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-600">
        <Link href="/sales/delivery-challans" className="text-brand-600 hover:underline">View all delivery challans</Link>
      </p>
    </div>
  );
}
