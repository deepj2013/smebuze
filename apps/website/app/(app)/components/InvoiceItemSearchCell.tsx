'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet } from '@/lib/api';
import { unwrapItemList, type PricedItem } from '@/lib/item-pricing';

export type InvoiceSearchLine = {
  item_id?: string;
  item_sku?: string | null;
  item_name?: string;
  item_image_url?: string | null;
};

function matchesQuery(item: PricedItem, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  return [item.name, item.sku, item.barcode, item.category].some(
    (s) => s && String(s).toLowerCase().includes(term),
  );
}

export default function InvoiceItemSearchCell({
  line,
  onSelectItem,
  onClearItem,
}: {
  line: InvoiceSearchLine;
  onSelectItem: (item: PricedItem) => void | Promise<void>;
  onClearItem?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<PricedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const selectingRef = useRef(false);
  const loadingRef = useRef(false);

  const loadCatalog = useCallback(() => {
    if (catalog.length) {
      setOpen(true);
      return;
    }
    if (loadingRef.current) {
      setOpen(true);
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    apiGet<PricedItem[] | { data: PricedItem[] }>('inventory/items?purpose=sale')
      .then(({ data }) => {
        const list = unwrapItemList<PricedItem>(data);
        setCatalog(list);
        setOpen(true);
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, [catalog.length]);

  const results = useMemo(() => {
    const filtered = catalog.filter((it) => matchesQuery(it, query));
    return query.trim() ? filtered.slice(0, 20) : filtered.slice(0, 14);
  }, [catalog, query]);

  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) {
      setDropdownRect(null);
      return;
    }
    const update = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 240) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, results.length, loading, query]);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (selectingRef.current) return;
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const pick = async (item: PricedItem) => {
    selectingRef.current = true;
    setOpen(false);
    setQuery('');
    try {
      await onSelectItem(item);
    } finally {
      selectingRef.current = false;
    }
  };

  const hasItem = Boolean(line.item_id && (line.item_name || line.item_sku));

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
            onClick={() => {
              onClearItem?.();
              setQuery('');
              setOpen(false);
            }}
            className="text-xs text-brand-600 hover:underline shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!catalog.length) loadCatalog();
          }}
          onFocus={() => loadCatalog()}
          placeholder="Click or search by SKU / name..."
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          autoComplete="off"
        />
      )}
      {typeof document !== 'undefined' &&
        open &&
        !hasItem &&
        dropdownRect &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="max-h-56 overflow-auto rounded border border-slate-200 bg-white py-1 shadow-lg"
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 10000,
            }}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!query.trim() && (
              <li className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                Browse items
              </li>
            )}
            {loading ? (
              <li className="px-3 py-2 text-slate-500 text-sm">Loading...</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-slate-500 text-sm">
                {catalog.length === 0 ? 'No items yet. Add items in Inventory.' : 'No items found'}
              </li>
            ) : (
              results.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void pick(it);
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
