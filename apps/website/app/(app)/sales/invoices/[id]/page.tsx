'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string | undefined;

  useEffect(() => {
    if (!id) return;
    // For now, a consolidated (or regular) invoice detail URL
    // simply redirects to the print view, which renders
    // the full HTML invoice from the API.
    router.replace(`/sales/invoices/${id}/print`);
  }, [id, router]);

  return (
    <div className="p-4">
      <p className="text-sm text-slate-600">Loading invoice…</p>
    </div>
  );
}

