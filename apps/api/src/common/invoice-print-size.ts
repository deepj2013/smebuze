/** Printable invoice / quotation text size (tenant branding). Default is Large. */
export type InvoicePrintSize = 's' | 'm' | 'l' | 'xl';

export const INVOICE_PRINT_SIZE_OPTIONS: Record<
  InvoicePrintSize,
  { label: string; scale: number }
> = {
  s: { label: 'Compact', scale: 1 },
  m: { label: 'Normal', scale: 1.15 },
  l: { label: 'Large', scale: 1.3 },
  xl: { label: 'Extra large', scale: 1.5 },
};

export const DEFAULT_INVOICE_PRINT_SIZE: InvoicePrintSize = 'l';

export function parseInvoicePrintSize(value: unknown): InvoicePrintSize {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 's' || s === 'm' || s === 'l' || s === 'xl') return s;
  return DEFAULT_INVOICE_PRINT_SIZE;
}

/** CSS injected into invoice/quotation HTML so every layout (A4 + thermal) scales. */
export function invoicePrintSizeCss(size?: InvoicePrintSize | null): string {
  const scale = INVOICE_PRINT_SIZE_OPTIONS[parseInvoicePrintSize(size)].scale;
  return `html{zoom:${scale}}@media print{html{zoom:${scale}}}`;
}
