'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Search, Users, Truck, FileText, Package } from 'lucide-react';

interface SearchResults {
  customers: { id: string; name: string; email: string | null }[];
  vendors: { id: string; name: string; email: string | null }[];
  invoices: { id: string; number: string; total: string }[];
  items: { id: string; name: string; sku: string | null }[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const term = (q || '').trim();
    if (!term) {
      setResults(null);
      return;
    }
    setLoading(true);
    const { data } = await apiGet<SearchResults>(`search?q=${encodeURIComponent(term)}`);
    setResults(data || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) runSearch(query);
      else setResults(null);
    }, 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => {
      setOpen(true);
      setQuery('');
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('smebuzz-open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('smebuzz-open-search', onOpen);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-0 sm:pt-[15vh] p-4 sm:p-0"
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl max-h-[85vh] sm:max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 sm:px-4 py-3 min-h-[52px]">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, vendors, invoices…"
            className="flex-1 min-w-0 border-0 bg-transparent py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 text-base"
            autoFocus
          />
          <kbd className="hidden sm:inline rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Esc</kbd>
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {loading && <p className="p-4 text-sm text-slate-500">Searching…</p>}
          {!loading && query.trim() && results && (
            <>
              {results.customers.length === 0 && results.vendors.length === 0 && results.invoices.length === 0 && results.items.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No results.</p>
              )}
              {results.customers.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Customers</p>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => go(`/crm/customers/${c.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-100 min-h-[44px]"
                    >
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.email && <span className="text-slate-500 truncate">{c.email}</span>}
                    </button>
                  ))}
                </div>
              )}
              {results.vendors.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Vendors</p>
                  {results.vendors.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => go(`/purchase/vendors`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-100 min-h-[44px]"
                    >
                      <Truck className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{v.name}</span>
                      {v.email && <span className="text-slate-500 truncate">{v.email}</span>}
                    </button>
                  ))}
                </div>
              )}
              {results.invoices.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Invoices</p>
                  {results.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => go(`/sales/invoices/${inv.id}/edit`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-100 min-h-[44px]"
                    >
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{inv.number}</span>
                      <span className="text-slate-500">₹{inv.total}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.items.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 py-1 text-xs font-medium text-slate-400 uppercase tracking-wide">Items</p>
                  {results.items.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => go(`/inventory/items`)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm hover:bg-slate-100 min-h-[44px]"
                    >
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{i.name}</span>
                      {i.sku && <span className="text-slate-500">{i.sku}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {!query.trim() && (
            <p className="p-4 text-sm text-slate-500">Type to search. Use <kbd className="rounded bg-slate-100 px-1.5 py-0.5">⌘K</kbd> to open.</p>
          )}
        </div>
      </div>
    </div>
  );
}
