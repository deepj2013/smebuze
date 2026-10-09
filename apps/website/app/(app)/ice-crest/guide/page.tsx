'use client';

import Link from 'next/link';
import UserGuide from '../../components/UserGuide';

export default function IceCrestGuidePage() {
  return (
    <div className="space-y-4">
      <Link href="/ice-crest/dashboard" className="text-sm text-slate-600 hover:text-slate-900">← Dashboard</Link>
      <UserGuide businessType="ice_crest" />
      <p className="text-sm text-slate-500">
        New to the screens? Start with <Link href="/ice-crest/tutorial" className="font-semibold text-cyan-800 hover:underline">Getting started</Link>.
      </p>
    </div>
  );
}
