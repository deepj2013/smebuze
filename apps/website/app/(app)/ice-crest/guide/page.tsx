'use client';

import Link from 'next/link';

const STEPS = [
  { n: 1, title: 'Record stock inward', body: 'After production or purchase, go to Stock Management → Stock inward / outward. Select the ice SKU, enter quantity and post as inward or opening stock.', href: '/ice-crest/stock-movements' },
  { n: 2, title: 'Capture enquiries', body: 'Website and WhatsApp enquiries appear automatically in CRM → Leads. Call the customer and move the lead through the pipeline.', href: '/crm/leads' },
  { n: 3, title: 'Send quotation', body: 'Create a quotation with SKU lines and rates. Mark as sent, then print/download the branded PDF to share with the customer.', href: '/sales/quotations' },
  { n: 4, title: 'Confirm order', body: 'Convert accepted quotation to a sales order. Stock is reserved immediately — available qty drops but physical stock stays until invoiced.', href: '/sales/orders/new' },
  { n: 5, title: 'Check production plan', body: 'Before the next production run, open Production plan to see confirmed orders minus available stock plus safety buffer.', href: '/ice-crest/production-plan' },
  { n: 6, title: 'Invoice & deduct stock', body: 'Create invoice from the reserved order. GST, shipping and discounts can be added. Stock outward is posted automatically.', href: '/sales/invoices/new' },
  { n: 7, title: 'Delivery & payment', body: 'Record delivery challan when goods leave the factory. Track pending payments under Payment tracking.', href: '/sales/invoices/pending' },
  { n: 8, title: 'Record expenses', body: 'Log transport, electricity, wages, packaging and purchases under Expenses. These feed the profit dashboard.', href: '/ice-crest/expenses' },
  { n: 9, title: 'Review dashboard', body: 'End of day: check sales, expenses, profit margin, SKU stock and sales trend on the Ice Crest dashboard.', href: '/ice-crest/dashboard' },
];

export default function IceCrestGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-cyan-700">ICE CREST — Staff training</p>
        <h1 className="text-2xl font-bold">Daily workflow guide</h1>
        <p className="mt-1 text-sm text-slate-500">Follow these steps in order. Each link opens the screen in the CRM.</p>
      </div>
      <ol className="space-y-4">
        {STEPS.map(s => (
          <li key={s.n} className="rounded-xl border bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-sm font-bold text-white">{s.n}</span>
              <div>
                <h2 className="font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                <Link href={s.href} className="mt-2 inline-block text-sm font-medium text-cyan-700 hover:underline">Open screen →</Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl bg-cyan-950 p-5 text-white text-sm">
        <p className="font-semibold">WhatsApp & website leads</p>
        <p className="mt-1 text-cyan-100">Website form: <Link href="/ice-crest" className="underline" target="_blank">/ice-crest</Link> · WhatsApp messages create leads when Meta API credentials are configured in .env</p>
      </div>
    </div>
  );
}
