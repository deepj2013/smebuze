'use client';

import Link from 'next/link';
import { Receipt, Truck } from 'lucide-react';

export default function VendorInvoicesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Vendor invoices</h1>
      <p className="text-slate-600 mb-6">
        Record purchase invoices from vendors and track payments. Use <strong>Purchase orders</strong> to enter order details, then record payment in <strong>Payables</strong>.
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 max-w-md space-y-4">
        <Link href="/purchase/orders" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800">
          <Truck className="h-5 w-5 text-slate-500" />
          <span><strong>Purchase orders</strong> – Enter vendor order / invoice details (vendor, date, amount).</span>
        </Link>
        <Link href="/purchase/payables" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800">
          <Receipt className="h-5 w-5 text-slate-500" />
          <span><strong>Payables</strong> – View pending amounts and record payment done to vendor.</span>
        </Link>
      </div>
    </div>
  );
}
