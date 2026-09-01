'use client';

import Link from 'next/link';
import IceCrestTutorial from '../../components/IceCrestTutorial';

export default function IceCrestTutorialPage() {
  return (
    <div className="space-y-4">
      <Link href="/ice-crest/dashboard" className="text-sm text-slate-600 hover:text-slate-900">← Dashboard</Link>
      <IceCrestTutorial mode="page" />
      <p className="text-center text-sm text-slate-500">
        Need the daily workflow? See the <Link href="/ice-crest/guide" className="text-cyan-700 underline">staff training guide</Link>.
      </p>
    </div>
  );
}
