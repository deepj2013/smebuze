export type InvoiceTemplate = 'auto' | 'gst' | 'tally' | 'busy' | 'marg' | 'thermal';

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'auto';

export const INVOICE_TEMPLATE_OPTIONS: { id: InvoiceTemplate; label: string; hint: string }[] = [
  { id: 'auto', label: 'Current (recommended)', hint: 'POS shops keep 80mm; others keep GST A4' },
  { id: 'gst', label: 'GST A4', hint: 'Boxed tax invoice used for Ice Crest and similar' },
  { id: 'tally', label: 'Tally style', hint: 'Classic boxed voucher — TAX INVOICE, Original' },
  { id: 'busy', label: 'Busy style', hint: 'Blue header GST bill — Original for Recipient' },
  { id: 'marg', label: 'Marg style', hint: 'Retail / chemist look — tax invoice cum bill of supply' },
  { id: 'thermal', label: '80mm thermal', hint: 'Counter roll receipt' },
];

export function parseInvoiceTemplate(value: unknown): InvoiceTemplate {
  const s = String(value ?? '').trim().toLowerCase();
  if (INVOICE_TEMPLATE_OPTIONS.some((o) => o.id === s)) return s as InvoiceTemplate;
  return DEFAULT_INVOICE_TEMPLATE;
}
