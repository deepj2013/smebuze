'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import PosSwitcher from '../../components/PosSwitcher';
import { PageHeader } from '../../components/PageHeader';
import { ResponsiveDataList, type Column } from '../../components/ResponsiveDataList';
import { formatQty } from '@/lib/money';
import { posSellingRate } from '@/lib/business-types';

interface Item {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  unit?: string | null;
  category?: string | null;
  cost_price?: string | number | null;
  mrp?: string | number | null;
  sale_price?: string | number | null;
  discount_percent?: string | number | null;
  hsn_sac?: string | null;
  image_urls?: string[];
  current_stock?: number;
}

function money(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  return Number(v).toFixed(2);
}

export default function ItemsPage() {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await apiGet<Item[] | { data: Item[] }>('inventory/items?with_stock=1');
      if (err) setError(err);
      else if (Array.isArray(data)) setList(data);
      else if (data && typeof data === 'object' && Array.isArray((data as { data?: Item[] }).data)) setList((data as { data: Item[] }).data);
      setLoading(false);
    })();
  }, []);

  const columns: Column<Item>[] = [
    {
      key: 'image',
      label: 'Image',
      className: 'w-12',
      render: (item) =>
        item.image_urls?.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_urls[0]} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />
        ) : (
          <span className="w-10 h-10 flex items-center justify-center rounded bg-slate-100 text-slate-400 text-xs">—</span>
        ),
    },
    { key: 'name', label: 'Name', cardLabel: 'Name', render: (item) => <span className="font-medium">{item.name}</span> },
    { key: 'sku', label: 'SKU', cardLabel: 'SKU', render: (item) => item.sku ?? '—' },
    { key: 'barcode', label: 'Barcode', render: (item) => <span className="font-mono text-xs">{item.barcode ?? '—'}</span> },
    { key: 'unit', label: 'Unit', render: (item) => item.unit ?? '—' },
    { key: 'category', label: 'Category', cardLabel: 'Category', render: (item) => item.category ?? '—' },
    { key: 'cost_price', label: 'Cost', className: 'text-right', render: (item) => <span className="tabular-nums">{money(item.cost_price)}</span> },
    { key: 'mrp', label: 'MRP', className: 'text-right', render: (item) => <span className="tabular-nums">{money(item.mrp)}</span> },
    {
      key: 'counter',
      label: 'Counter',
      className: 'text-right',
      render: (item) => (
        <span className="font-medium tabular-nums">
          ₹{posSellingRate(item).toFixed(2)}
          {item.discount_percent ? ` (−${Number(item.discount_percent)}%)` : ''}
        </span>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      className: 'text-right',
      render: (item) => (
        <span className="font-medium tabular-nums">
          {item.current_stock != null ? formatQty(item.current_stock) : '0'}
        </span>
      ),
    },
    { key: 'hsn_sac', label: 'HSN/SAC', render: (item) => item.hsn_sac ?? '—' },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <Link href={`/inventory/items/${item.id}/edit`} className="text-brand-600 hover:underline text-sm font-medium">
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PosSwitcher />
      <PageHeader title="Items">
        <Link href="/inventory/categories" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px] inline-flex items-center justify-center">
          Categories
        </Link>
        <Link href="/inventory/items/new" className="rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700 min-h-[44px] inline-flex items-center justify-center">
          Add item
        </Link>
      </PageHeader>
      {error && <div className="mb-4 rounded-lg bg-red-50 text-red-800 p-3 text-sm">{error}</div>}
      {loading && <p className="text-slate-600">Loading…</p>}
      {!loading && (
        <ResponsiveDataList<Item>
          columns={columns}
          data={list}
          keyField="id"
          emptyMessage="No items yet."
          emptyAction={
            <Link href="/inventory/items/new" className="inline-block rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-brand-700">
              Add your first item
            </Link>
          }
          renderMobileCard={(item) => (
            <Link href={`/inventory/items/${item.id}/edit`} className="block">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
                <div className="flex gap-3">
                  {item.image_urls?.length ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_urls[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">No img</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {[item.sku, item.category, item.unit].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">MRP</dt>
                    <dd className="tabular-nums font-medium">{money(item.mrp)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Counter</dt>
                    <dd className="tabular-nums font-medium">₹{posSellingRate(item).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Cost</dt>
                    <dd className="tabular-nums">{money(item.cost_price)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Stock</dt>
                    <dd className="tabular-nums font-medium">
                      {item.current_stock != null ? formatQty(item.current_stock) : '0'}
                    </dd>
                  </div>
                </dl>
                <span className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white">
                  Edit item
                </span>
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}
