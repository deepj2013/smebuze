/** Printed invoice layout (tenant branding). `auto` keeps current POS vs GST behaviour. */
export type InvoiceTemplate = 'auto' | 'gst' | 'tally' | 'busy' | 'marg' | 'thermal';

export const DEFAULT_INVOICE_TEMPLATE: InvoiceTemplate = 'auto';

export const INVOICE_TEMPLATE_IDS: InvoiceTemplate[] = ['auto', 'gst', 'tally', 'busy', 'marg', 'thermal'];

export function parseInvoiceTemplate(value: unknown): InvoiceTemplate {
  const s = String(value ?? '').trim().toLowerCase();
  if (INVOICE_TEMPLATE_IDS.includes(s as InvoiceTemplate)) return s as InvoiceTemplate;
  return DEFAULT_INVOICE_TEMPLATE;
}

export function invoiceTemplateCopyLabel(template: InvoiceTemplate): string {
  if (template === 'tally' || template === 'marg') return 'Original';
  if (template === 'busy') return 'Original for Recipient';
  return 'Original for recipient';
}

export function invoiceTemplateDocTitle(template: InvoiceTemplate, gstApplicable: boolean): string {
  if (template === 'tally' || template === 'busy') return gstApplicable ? 'TAX INVOICE' : 'INVOICE';
  if (template === 'marg') return gstApplicable ? 'TAX INVOICE CUM BILL OF SUPPLY' : 'BILL OF SUPPLY';
  return gstApplicable ? 'Tax Invoice' : 'Invoice';
}

/** Extra CSS layered on the GST A4 sheet for Tally / Busy / Marg looks. */
export function invoiceTemplateSkinCss(template: InvoiceTemplate): string {
  if (template === 'tally') {
    return `body{font-family:'Times New Roman',Times,serif}
.sheet{border:2px solid #000}
.topbar{justify-content:center;position:relative;background:#fff}
.topbar h1{font-size:20px;letter-spacing:.14em}
.copy{position:absolute;right:12px;top:10px}
.head-right th,table.grid th{background:#e6e6e6}
.parties h3{border-bottom:1px solid #000;display:inline-block;padding-bottom:1px}`;
  }
  if (template === 'busy') {
    return `body{font-family:Tahoma,Arial,sans-serif}
.topbar{background:#0f4c81;color:#fff;border-bottom:3px solid #c9a227}
.topbar h1,.copy{color:#fff}
.head-right th,table.grid th{background:#e8f0f8}
.parties h3,.foot h3,.co h2{color:#0f4c81}`;
  }
  if (template === 'marg') {
    return `body{font-family:Verdana,Geneva,sans-serif}
.sheet{border:2px double #333}
.topbar{background:#f7f2e8;border-bottom:2px solid #8b1e1e}
.topbar h1{color:#8b1e1e;font-size:17px;letter-spacing:.06em}
.co h2{font-size:20px;color:#8b1e1e}
table.grid th{background:#8b1e1e;color:#fff}
.head-right th{background:#f7f2e8}`;
  }
  return '';
}
