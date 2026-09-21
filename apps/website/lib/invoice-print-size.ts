/** Printable invoice / quotation text size (tenant branding). Default is Large. */
export type InvoicePrintSize = 's' | 'm' | 'l' | 'xl';

export const INVOICE_PRINT_SIZE_OPTIONS: { id: InvoicePrintSize; label: string; hint: string }[] = [
  { id: 's', label: 'Compact', hint: 'Fits more lines on one page' },
  { id: 'm', label: 'Normal', hint: 'Slightly larger than the old default' },
  { id: 'l', label: 'Large', hint: 'Recommended — easier to read' },
  { id: 'xl', label: 'Extra large', hint: 'Maximum readability' },
];

export const DEFAULT_INVOICE_PRINT_SIZE: InvoicePrintSize = 'l';

export function parseInvoicePrintSize(value: unknown): InvoicePrintSize {
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 's' || s === 'm' || s === 'l' || s === 'xl') return s;
  return DEFAULT_INVOICE_PRINT_SIZE;
}
