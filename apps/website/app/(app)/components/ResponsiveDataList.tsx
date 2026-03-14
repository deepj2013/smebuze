'use client';

import Link from 'next/link';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** For mobile card: label shown next to value (e.g. "Number", "Total") */
  cardLabel?: string;
}

interface ResponsiveDataListProps<T extends object> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  getRowHref?: (row: T) => string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  /** Optional: custom render for mobile card (overrides column-based card) */
  renderMobileCard?: (row: T) => React.ReactNode;
}

export function ResponsiveDataList<T extends object>({
  columns,
  data,
  keyField,
  getRowHref,
  emptyMessage = 'No data yet.',
  emptyAction,
  renderMobileCard,
}: ResponsiveDataListProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 text-center">
        <p className="text-slate-600 mb-3">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  const key = String(keyField);
  const getRowKey = (row: T) => String((row as Record<string, unknown>)[key] ?? '');

  return (
    <>
      {/* Desktop: table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="responsive-table-wrap">
          <table className="w-full text-sm table-min-width">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`text-left p-3 font-medium text-slate-700 ${col.className ?? ''}`}>
                    {col.label}
                  </th>
                ))}
                {getRowHref && <th className="text-right p-3 font-medium text-slate-700 w-20">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const rowKey = getRowKey(row);
                const href = getRowHref?.(row);
                return (
                  <tr key={rowKey} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    {columns.map((col) => (
                      <td key={col.key} className={`p-3 ${col.className ?? ''}`}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                      </td>
                    ))}
                    {getRowHref && (
                      <td className="p-3 text-right">
                        {href && (
                          <Link href={href} className="text-brand-600 hover:underline text-sm">
                            View
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: cards — app-like list */}
      <div className="md:hidden space-y-3">
        {data.map((row) => {
          const rowKey = getRowKey(row);
          const href = getRowHref?.(row);

          if (renderMobileCard) {
            return <div key={rowKey}>{renderMobileCard(row)}</div>;
          }

          const content = (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
              <div className="space-y-2">
                {columns.slice(0, 4).map((col) => (
                  <div key={col.key} className="flex justify-between items-start gap-2 text-sm">
                    <span className="text-slate-500 shrink-0">{col.cardLabel ?? col.label}</span>
                    <span className="text-slate-900 text-right font-medium truncate min-w-0">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
              {href && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-brand-600 font-medium text-sm">View details →</span>
                </div>
              )}
            </div>
          );

          if (href) {
            return (
              <Link key={rowKey} href={href} className="block">
                {content}
              </Link>
            );
          }
          return <div key={rowKey}>{content}</div>;
        })}
      </div>
    </>
  );
}
