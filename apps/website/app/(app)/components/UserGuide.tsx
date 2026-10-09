'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { guideFor, type GuideBlock } from '@/lib/user-guide';

function matches(block: GuideBlock, q: string): boolean {
  if (!q) return true;
  const hay = [
    block.title,
    block.intro,
    ...block.steps.flatMap((s) => [s.title, s.body]),
    ...block.asks.flatMap((a) => [a.q, a.a]),
  ].join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export default function UserGuide({ businessType }: { businessType?: string }) {
  const guide = useMemo(() => guideFor(businessType), [businessType]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const sections = guide.sections.filter((s) => matches(s, q));

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">User guide · {guide.heading}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">How to run {guide.heading} in SMEBUZE</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{guide.lede}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="min-w-[220px] flex-1 text-sm">
          <span className="sr-only">Search the guide</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, for example payment, ledger, GST, stock"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-[44px]"
          />
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800"
        >
          Print guide
        </button>
      </div>

      {!q && (
        <nav className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" aria-label="Guide contents">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2">
            {guide.sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm font-medium text-brand-800 hover:underline">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Nothing matches “{query.trim()}”. Try payment, ledger, invoice, credit note, or GST.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.intro}</p>
            <ol className="mt-4 space-y-4">
              {section.steps.map((step) => (
                <li key={step.title}>
                  <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
                  {step.href && step.link && (
                    <Link href={step.href} className="mt-1 inline-flex text-sm font-semibold text-brand-700 hover:underline">
                      {step.link} →
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            {section.asks.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">People often ask</h3>
                <dl className="mt-3 space-y-3">
                  {section.asks.map((ask) => (
                    <div key={ask.q}>
                      <dt className="text-sm font-semibold text-slate-900">{ask.q}</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-slate-600">{ask.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
