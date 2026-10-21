export type InvoiceQrPosition = 'with_bank' | 'bottom_left' | 'bottom_right';

export function parseInvoiceQrPosition(value: unknown): InvoiceQrPosition {
  const s = String(value ?? '').trim();
  if (s === 'bottom_left' || s === 'bottom_right') return s;
  return 'with_bank';
}
