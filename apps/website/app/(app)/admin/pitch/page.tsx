'use client';

import { allPitches, type PitchReadiness } from '@/lib/client-pitch';
import { SIGNUP_GROUPS } from '@/lib/business-types';

const READY: Record<PitchReadiness, { label: string; className: string }> = {
  ready: { label: 'Pitch now', className: 'text-emerald-700 bg-emerald-50' },
  good: { label: 'Ready', className: 'text-sky-700 bg-sky-50' },
  desk: { label: 'Desk / B2B', className: 'text-slate-700 bg-slate-100' },
};

export default function AdminPitchGuidePage() {
  const pitches = allPitches();
  const byGroup = SIGNUP_GROUPS.map((g) => ({
    ...g,
    items: pitches.filter((p) => p.group === g.id),
  }));
  const extras = pitches.filter((p) => !SIGNUP_GROUPS.some((g) => g.id === p.group));

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Client type pitch guide</h1>
      <p className="text-sm text-slate-600 mb-6 max-w-3xl">
        Each shop type gets only the modules it needs. Use this when you visit a prospect: open the demo list,
        keep the rest of the menu hidden via business type + enabled modules.
      </p>

      {byGroup.map((g) => (
        <section key={g.id} className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">{g.label}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((p) => (
              <article key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-slate-800">{p.title}</h3>
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${READY[p.readiness].className}`}>
                    {READY[p.readiness].label}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{p.pitch}</p>
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">Demo:</span> {p.demo.join(' → ')}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">On:</span> {p.modules.join(', ')} · home {p.home}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Hide:</span> {p.hide.join(', ')}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      {extras.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Special verticals</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {extras.map((p) => (
              <article key={p.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-slate-800">{p.title}</h3>
                  <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${READY[p.readiness].className}`}>
                    {READY[p.readiness].label}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3">{p.pitch}</p>
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-medium text-slate-700">Demo:</span> {p.demo.join(' → ')}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">On:</span> {p.modules.join(', ')} · hide {p.hide.join(', ')}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
