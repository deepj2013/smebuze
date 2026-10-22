'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPatch, apiPost, apiUploadFile, getStaticUrl } from '@/lib/api';
import PayuCheckoutForm, { type PayuCheckoutPayload } from '@/components/PayuCheckoutForm';
import { PageHeader } from '../../components/PageHeader';

type Addon = { id: string; label: string; description: string; monthly_rupees: number };

type Settings = {
  storefront_enabled: boolean;
  mall_enabled: boolean;
  restock_hub_enabled: boolean;
  delivery_mode: string;
  payment_mode: string;
  commission_pct: number;
  pass_fee_to_customer?: boolean;
  upi_qr_image_url?: string | null;
  settle_days?: number;
  listing_fee_monthly: number;
  storefront_paid_until?: string | null;
  mall_paid_until?: string | null;
  storefront_active?: boolean;
  mall_active?: boolean;
  mall_origin_pincode?: string | null;
  mall_coverage?: string;
  mall_coverage_label?: string;
  mall_extra_pincodes?: string[];
  addons?: Addon[];
  fee_example?: { bill: number; customer_pays: number; platform_fee: number; shop_nets: number };
};

type Listing = { id: string; item_id: string; active: boolean; name?: string; sale_price?: string; category?: string | null };
type CatalogItem = { id: string; name: string; portal_listed?: boolean; sale_price?: string | null };

export default function CommerceSettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');
  const [checkout, setCheckout] = useState<PayuCheckoutPayload | null>(null);

  async function load() {
    setLoading(true);
    const [st, li, cat, ord] = await Promise.all([
      apiGet<Settings>('tenant/commerce/settings'),
      apiGet<Listing[]>('tenant/mall/listings'),
      apiGet<CatalogItem[]>('growth/catalog'),
      apiGet<Array<Record<string, unknown>>>('tenant/marketplace/orders'),
    ]);
    if (st.error) setError(Array.isArray(st.error) ? st.error.join(' ') : st.error);
    else setS(st.data ?? null);
    if (li.data) setListings(Array.isArray(li.data) ? li.data : []);
    if (cat.data) setCatalog(Array.isArray(cat.data) ? cat.data : []);
    if (ord.data) setOrders(Array.isArray(ord.data) ? ord.data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('payu') === 'success') {
      setOk('Payment successful — add-on active for 30 days');
      window.history.replaceState({}, '', '/organization/commerce');
      load();
    }
  }, []);

  async function save(patch: Partial<Settings>) {
    setError('');
    setOk('');
    const { data, error: err } = await apiPatch<Settings>('tenant/commerce/settings', patch);
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else {
      setS(data ?? null);
      setOk('Saved');
    }
  }

  async function listOnMall(itemId: string, active: boolean) {
    setError('');
    const { error: err } = await apiPost('tenant/mall/listings', { item_id: itemId, active });
    if (err) setError(Array.isArray(err) ? err.join(' ') : err);
    else load();
  }

  async function payAddon(addon: string) {
    setError('');
    setOk('');
    setPaying(addon);
    const { data, error: err } = await apiPost<{
      free?: boolean;
      activated?: boolean;
      checkout?: PayuCheckoutPayload;
    }>('tenant/commerce/addons/pay', { addon });
    if (err) {
      setError(Array.isArray(err) ? err.join(' ') : err);
      setPaying('');
      return;
    }
    if (data?.free || data?.activated) {
      setOk('Add-on activated');
      setPaying('');
      load();
      return;
    }
    if (data?.checkout) setCheckout(data.checkout);
    else {
      setError('PayU checkout could not start');
      setPaying('');
    }
  }

  const listedIds = new Set(listings.filter((l) => l.active).map((l) => l.item_id));
  const addons = s?.addons ?? [];
  const [extraPins, setExtraPins] = useState('');

  useEffect(() => {
    if (s?.mall_extra_pincodes?.length) setExtraPins(s.mall_extra_pincodes.join(', '));
  }, [s?.mall_extra_pincodes]);

  return (
    <div>
      <PayuCheckoutForm checkout={checkout} />
      <PageHeader
        title="Online commerce"
        description="Pay monthly add-ons for Online shop and Mall. Restock Hub is included. POS is unchanged."
      >
        <Link href="/restock" className="rounded-lg border px-3 py-2 text-sm min-h-[44px] inline-flex items-center">Restock Hub</Link>
        <Link href="/mall" className="rounded-lg border px-3 py-2 text-sm min-h-[44px] inline-flex items-center" target="_blank">Open mall</Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {ok && <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 p-3 text-sm">{ok}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {s && (
        <div className="space-y-6">
          <section className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-medium text-slate-900">Pay add-ons (platform PayU)</h2>
            <p className="text-sm text-slate-600">
              Money for add-ons and mall orders goes to SMEBUZE. We settle mall sales to your shop minus commission.
            </p>
            <ul className="space-y-3">
              {addons.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="font-medium text-sm">{a.label} · ₹{a.monthly_rupees}/mo</p>
                    <p className="text-xs text-slate-500">{a.description}</p>
                    {a.id === 'mall_listing' && s.mall_paid_until && (
                      <p className="text-xs text-emerald-700 mt-1">Paid until {new Date(s.mall_paid_until).toLocaleDateString()}</p>
                    )}
                    {a.id === 'online_shop' && s.storefront_paid_until && (
                      <p className="text-xs text-emerald-700 mt-1">Paid until {new Date(s.storefront_paid_until).toLocaleDateString()}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!!paying}
                    onClick={() => payAddon(a.id)}
                    className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm min-h-[40px] disabled:opacity-50"
                  >
                    {paying === a.id ? 'Opening…' : `Pay ₹${a.monthly_rupees}`}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Status: shop {s.storefront_active ? 'live' : 'off'} · mall {s.mall_active ? 'live' : 'off'} · commission {s.commission_pct}%
            </p>
          </section>

          <section className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-medium text-slate-900">Flags</h2>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={s.restock_hub_enabled} onChange={(e) => save({ restock_hub_enabled: e.target.checked })} />
              Restock Hub (B2B wholesale) — included
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={s.storefront_enabled} onChange={(e) => save({ storefront_enabled: e.target.checked })} />
              Own online shop (/shop) — requires paid add-on
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={s.mall_enabled} onChange={(e) => save({ mall_enabled: e.target.checked })} />
              List on SMEBUZE Mall — requires paid add-on
            </label>
            <div className="grid gap-3 md:grid-cols-2 pt-2">
              <label className="text-sm block">
                Delivery
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={s.delivery_mode}
                  onChange={(e) => save({ delivery_mode: e.target.value })}
                >
                  <option value="own">Own staff</option>
                  <option value="platform">SMEBUZE delivery</option>
                  <option value="both">Buyer chooses</option>
                </select>
              </label>
              <label className="text-sm block">
                Payment collection
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={s.payment_mode}
                  onChange={(e) => save({ payment_mode: e.target.value })}
                  disabled={s.mall_enabled}
                >
                  <option value="tenant_razorpay">My Razorpay / own gateway</option>
                  <option value="platform_collect">SMEBUZE collect (2.5%, T+1 settle)</option>
                  <option value="upi_qr">My UPI QR picture</option>
                </select>
              </label>
            </div>
            {s.payment_mode === 'platform_collect' && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.pass_fee_to_customer !== false}
                    onChange={(e) => save({ pass_fee_to_customer: e.target.checked })}
                  />
                  Add 2.5% on the customer bill (shop nets the sale amount)
                </label>
                {s.fee_example && (
                  <p className="text-xs text-slate-600">
                    Example ₹{s.fee_example.bill}: customer pays ₹{s.fee_example.customer_pays.toFixed(2)}, fee ₹{s.fee_example.platform_fee.toFixed(2)}, you get ₹{s.fee_example.shop_nets.toFixed(2)}. Settled T+{s.settle_days ?? 1}.
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Own gateway:{' '}
                  <Link href="/organization/payments" className="text-brand-600 underline">Scan to pay</Link>
                  {' '}— money goes to your Razorpay, no SMEBUZE fee on the card.
                </p>
              </div>
            )}
            {s.payment_mode === 'upi_qr' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Upload the printed UPI QR. Staff must mark paid — this is not auto-reconciled.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const up = await apiUploadFile<{ url: string }>('inventory/items/upload-image', file);
                    if (up.error) setError(up.error);
                    else if (up.data?.url) save({ upi_qr_image_url: up.data.url, payment_mode: 'upi_qr' });
                  }}
                />
                {s.upi_qr_image_url && <img src={getStaticUrl(s.upi_qr_image_url)} alt="UPI QR" className="h-32 w-32 object-contain border rounded bg-white" />}
              </div>
            )}
          </section>

          {s.mall_enabled && (
            <section className="rounded-xl border bg-white p-4 space-y-3">
              <h2 className="font-medium text-slate-900">Mall delivery area</h2>
              <p className="text-sm text-slate-600">
                Buyers enter their pincode on <Link href="/mall" className="text-brand-600 underline" target="_blank">/mall</Link>.
                Only shops that serve that area appear.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm block">
                  Shop pincode
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={s.mall_origin_pincode ?? ''}
                    onChange={(e) => setS({ ...s, mall_origin_pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    onBlur={() => save({ mall_origin_pincode: s.mall_origin_pincode || null })}
                    placeholder="Uses company pincode if blank"
                    inputMode="numeric"
                  />
                </label>
                <label className="text-sm block">
                  Coverage
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={s.mall_coverage ?? 'local'}
                    onChange={(e) => save({ mall_coverage: e.target.value })}
                  >
                    <option value="local">Nearby (same 3 pincode digits)</option>
                    <option value="city">Wider city (same 2 digits)</option>
                    <option value="pincode_list">Listed pincodes only</option>
                    <option value="pan_india">All India</option>
                  </select>
                </label>
              </div>
              {(s.mall_coverage ?? 'local') === 'pincode_list' && (
                <label className="text-sm block">
                  Extra pincodes
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={extraPins}
                    onChange={(e) => setExtraPins(e.target.value)}
                    onBlur={() =>
                      save({
                        mall_extra_pincodes: extraPins
                          .split(/[,;\s]+/)
                          .map((x) => x.replace(/\D/g, ''))
                          .filter((x) => x.length === 6),
                      })
                    }
                    placeholder="411001, 411002"
                  />
                </label>
              )}
            </section>
          )}

          {s.mall_active && (
            <section className="rounded-xl border bg-white p-4">
              <h2 className="font-medium mb-3">Mall listings</h2>
              <ul className="divide-y">
                {catalog.map((item) => (
                  <li key={item.id} className="py-2 flex justify-between gap-2 text-sm">
                    <span>{item.name} {item.sale_price ? `· ₹${item.sale_price}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => listOnMall(item.id, !listedIds.has(item.id))}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      {listedIds.has(item.id) ? 'Unlist' : 'List on mall'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-medium mb-3">Mall / platform orders</h2>
            {orders.length === 0 && <p className="text-sm text-slate-500">No mall orders yet.</p>}
            <ul className="space-y-2 text-sm">
              {orders.map((o) => (
                <li key={String(o.id)} className="border-b border-slate-100 pb-2">
                  {String(o.buyer_name)} · {String(o.buyer_phone)} · ₹{Number(o.gross_amount).toFixed(2)} · {String(o.payment_status)} / {String(o.status)}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
