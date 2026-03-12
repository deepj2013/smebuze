'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getApiUrl, getToken } from '@/lib/api';

export default function InvoicePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    fetch(getApiUrl(`sales/invoices/${id}/print`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.text())
      .then((text) => {
        setLoading(false);
        document.open();
        document.write(text);
        document.close();
      })
      .catch(() => {
        setError('Failed to load invoice');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="p-4">Loading…</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  return <p className="p-4 text-slate-600">Preparing invoice for print…</p>;
}
