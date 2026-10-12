import { apiPost } from './api';
import { getDefaultPrinter, openSystemPrint, printViaProfile, type ReceiptPayload } from './printers';

const LANG_KEY = 'smebuzz_counter_lang';

export type CounterLang = 'en' | 'hi';

export function counterLang(): CounterLang {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANG_KEY) === 'hi' ? 'hi' : 'en';
}

export function setCounterLang(lang: CounterLang): void {
  window.localStorage.setItem(LANG_KEY, lang);
}

export function ct(lang: CounterLang, en: string, hi: string): string {
  return lang === 'hi' ? hi : en;
}

export type HeldBill = {
  id: string;
  at: string;
  label: string;
  customerId: string;
  payMode: string;
  billDiscount: string;
  cart: unknown;
};

function holdStorageKey(tenantKey: string): string {
  return `smebuzz_held_${tenantKey}`;
}

export function loadHeld(tenantKey: string): HeldBill[] {
  if (typeof window === 'undefined' || !tenantKey) return [];
  try {
    const raw = window.localStorage.getItem(holdStorageKey(tenantKey));
    const parsed = raw ? JSON.parse(raw) as HeldBill[] : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHeld(tenantKey: string, bills: HeldBill[]): void {
  window.localStorage.setItem(holdStorageKey(tenantKey), JSON.stringify(bills.slice(0, 12)));
}

export type QueuedBill = {
  id: string;
  createdAt: string;
  invoice: Record<string, unknown>;
  payment: Record<string, unknown> | null;
  invoiceId?: string;
  number?: string;
};

const OUTBOX_KEY = 'smebuzz_counter_outbox';

export function loadOutbox(): QueuedBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) as QueuedBill[] : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOutbox(rows: QueuedBill[]): void {
  window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(rows));
}

export function queueBill(bill: Omit<QueuedBill, 'id' | 'createdAt'>): QueuedBill {
  const row: QueuedBill = {
    ...bill,
    id: `off_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  saveOutbox([...loadOutbox(), row]);
  return row;
}

export function isNetworkError(message: string | undefined): boolean {
  if (!message) return false;
  return /failed to fetch|network|load failed|offline/i.test(message);
}

/** Send queued bills. Stock moves only after the server accepts the invoice. */
export async function syncOutbox(): Promise<{ sent: number; left: number }> {
  const pending = loadOutbox();
  if (!pending.length || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return { sent: 0, left: pending.length };
  }
  let sent = 0;
  const left: QueuedBill[] = [];
  for (const job of pending) {
    try {
      let invoiceId = job.invoiceId;
      let number = job.number;
      if (!invoiceId) {
        const created = await apiPost<{ id: string; number: string }>('sales/invoices', job.invoice);
        if (created.error || !created.data?.id) {
          left.push(job);
          continue;
        }
        invoiceId = created.data.id;
        number = created.data.number;
      }
      if (job.payment) {
        const paid = await apiPost(`sales/invoices/${invoiceId}/payment`, {
          ...job.payment,
          reference: job.payment.reference || 'Counter sync',
        });
        if (paid.error) {
          left.push({ ...job, invoiceId, number });
          continue;
        }
      }
      sent += 1;
    } catch {
      left.push(job);
    }
  }
  saveOutbox(left);
  return { sent, left: left.length };
}

export async function printCounterSlip(input: {
  company: string;
  number: string;
  date: string;
  billTo: string;
  lines: { description: string; qty: number; amount: number }[];
  taxable?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  paid?: number;
  due?: number;
  footer?: string;
}): Promise<void> {
  const money = (n: number | undefined) => (n == null ? undefined : n.toFixed(2));
  const receipt: ReceiptPayload = {
    company: input.company || 'Shop',
    title: 'CASH BILL',
    number: input.number,
    date: input.date,
    billTo: input.billTo,
    lines: input.lines.map((line) => ({
      description: line.description,
      qty: line.qty,
      amount: line.amount.toFixed(2),
    })),
    taxable: money(input.taxable),
    cgst: money(input.cgst),
    sgst: money(input.sgst),
    igst: money(input.igst),
    total: input.total.toFixed(2),
    paid: money(input.paid),
    due: money(input.due),
    footer: input.footer || 'Thank you',
  };
  const rows = receipt.lines
    .map((line) => `<tr><td>${escapeHtml(String(line.description))}</td><td>${line.qty}</td><td style="text-align:right">₹${line.amount}</td></tr>`)
    .join('');
  const html = `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:13px;max-width:72mm">
    <h1 style="font-size:16px;margin:0">${escapeHtml(receipt.company)}</h1>
    <p style="margin:4px 0">${escapeHtml(receipt.number)} · ${escapeHtml(receipt.date)}</p>
    <p style="margin:0 0 8px">${escapeHtml(receipt.billTo)}</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p>Taxable ₹${receipt.taxable || '0.00'}</p>
    <p>CGST ₹${receipt.cgst || '0.00'} · SGST ₹${receipt.sgst || '0.00'} · IGST ₹${receipt.igst || '0.00'}</p>
    <p style="font-size:16px;font-weight:700">Total ₹${receipt.total}</p>
    ${receipt.paid ? `<p>Paid ₹${receipt.paid}</p>` : ''}
    ${receipt.due ? `<p>Due ₹${receipt.due}</p>` : ''}
    <p>${escapeHtml(receipt.footer || '')}</p>
  </div>`;
  const printer = getDefaultPrinter();
  if (printer) await printViaProfile(printer, html, receipt);
  else openSystemPrint(html, 'thermal_80');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

/** Code 39 bars for a shelf sticker. Scanners read the pattern; the number is printed underneath. */
export function code39Svg(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9A-Z \-.]/g, '');
  if (!clean) return '';
  const text = `*${clean}*`;
  let x = 0;
  const parts: string[] = [];
  for (const ch of text) {
    const pat = CODE39[ch];
    if (!pat) continue;
    for (let i = 0; i < pat.length; i += 1) {
      const w = pat[i] === 'w' ? 2.4 : 1;
      if (i % 2 === 0) parts.push(`<rect x="${x.toFixed(2)}" y="0" width="${w}" height="42" fill="#111"/>`);
      x += w;
    }
    x += 1;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x.toFixed(2)} 42" width="168" height="42" role="img" aria-label="${escapeHtml(clean)}">${parts.join('')}</svg>`;
}
