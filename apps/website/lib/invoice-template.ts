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

/** Ready-made print themes — pick one, no custom layout work. */
export const INVOICE_THEME_CARDS: {
  id: InvoiceTemplate;
  label: string;
  hint: string;
  preview: { bar: string; border: string; title: string };
}[] = [
  { id: 'gst', label: 'Standard GST', hint: 'Clean A4 tax invoice — good default for most businesses', preview: { bar: 'bg-slate-800', border: 'border-slate-300', title: 'Tax Invoice' } },
  { id: 'tally', label: 'Tally style', hint: 'Black border, serif look — familiar to CA / accounts teams', preview: { bar: 'bg-white border-b-2 border-black', border: 'border-2 border-black', title: 'TAX INVOICE' } },
  { id: 'busy', label: 'Busy style', hint: 'Blue header band — “Original for Recipient” wording', preview: { bar: 'bg-[#0f4c81]', border: 'border-slate-300', title: 'TAX INVOICE' } },
  { id: 'marg', label: 'Marg style', hint: 'Maroon accent — retail / chemist style bill of supply', preview: { bar: 'bg-[#8b1e1e]', border: 'border-double border-slate-400', title: 'Tax Invoice' } },
  { id: 'thermal', label: '80mm roll', hint: 'Narrow receipt for thermal printers', preview: { bar: 'bg-slate-700', border: 'border-slate-200', title: 'Invoice' } },
];

export function invoiceTemplatesForWorkspace(businessType: unknown): typeof INVOICE_TEMPLATE_OPTIONS {
  if (businessType === 'invoicing_lite') {
    return INVOICE_THEME_CARDS.map((c) => ({ id: c.id, label: c.label, hint: c.hint }));
  }
  return INVOICE_TEMPLATE_OPTIONS;
}

export function parseInvoiceTemplate(value: unknown): InvoiceTemplate {
  const s = String(value ?? '').trim().toLowerCase();
  if (INVOICE_TEMPLATE_OPTIONS.some((o) => o.id === s)) return s as InvoiceTemplate;
  return DEFAULT_INVOICE_TEMPLATE;
}
