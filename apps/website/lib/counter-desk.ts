import { apiPatch, apiPost } from './api';
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

const BELOW_TWENTY = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function wordsBelowThousand(n: number): string {
  if (n < 20) return BELOW_TWENTY[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${BELOW_TWENTY[n % 10]}` : ''}`;
  const rest = n % 100;
  return `${BELOW_TWENTY[Math.floor(n / 100)]} hundred${rest ? ` ${wordsBelowThousand(rest)}` : ''}`;
}

/** "fifty-one rupees" style line for a thermal bill. */
export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount) + 0.001);
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${wordsBelowThousand(crore)} crore`);
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} lakh`);
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} thousand`);
  if (rest) parts.push(wordsBelowThousand(rest));
  const head = parts.join(' ') || 'zero';
  const rupeeWords = `${head} rupee${rupees === 1 ? '' : 's'}`;
  if (!paise) return rupeeWords;
  return `${rupeeWords} and ${wordsBelowThousand(paise)} paise`;
}

export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

export async function rememberCounterCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  customers: { id: string; name: string; phone?: string | null }[];
  fallbackId: string;
  companyId?: string;
}): Promise<{ id: string; name: string; phone: string } | null> {
  const key = phoneKey(input.phone);
  if (!key) return null;
  const name = input.name.trim() || 'Customer';
  const address = input.address?.trim();
  const match = input.customers.find((c) => phoneKey(c.phone || '') === key);
  if (match) {
    await apiPatch(`crm/customers/${match.id}`, {
      name,
      phone: key,
      entity_type: 'individual',
      ...(address ? { address: { line1: address } } : {}),
    });
    return { id: match.id, name, phone: key };
  }
  const { data } = await apiPost<{ id: string }>('crm/customers', {
    name,
    phone: key,
    entity_type: 'individual',
    tags: ['counter'],
    company_id: input.companyId || undefined,
    ...(address ? { address: { line1: address } } : {}),
  });
  if (!data?.id) return { id: input.fallbackId, name, phone: key };
  return { id: data.id, name, phone: key };
}

export function shopFromCompany(company?: {
  name?: string | null;
  gstin?: string | null;
  address?: Record<string, unknown> | null;
} | null): { company: string; gstin?: string; phone?: string; address: string[] } {
  const address = company?.address || {};
  const pick = (key: string) => (typeof address[key] === 'string' ? String(address[key]).trim() : '');
  const city = [pick('city'), pick('state'), pick('pincode')].filter(Boolean).join(', ');
  return {
    company: company?.name || 'Shop',
    gstin: company?.gstin || undefined,
    phone: pick('phone') || pick('mobile') || undefined,
    address: [pick('line1'), pick('line2'), pick('street'), pick('address'), city].filter(Boolean),
  };
}

export async function printCounterSlip(input: {
  company: string;
  number: string;
  date: string;
  billTo: string;
  lines: { description: string; qty: number; rate?: number; amount: number }[];
  address?: string[];
  phone?: string;
  gstin?: string;
  taxable?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  paid?: number;
  due?: number;
  paidBy?: string;
  footer?: string;
}): Promise<void> {
  const money = (n: number | undefined) => (n == null ? undefined : n.toFixed(2));
  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const qtyTotal = input.lines.reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const paidBy = input.paidBy || (input.due && input.due > 0 ? 'Credit' : 'Cash');
  const receipt: ReceiptPayload = {
    company: input.company || 'Shop',
    gstin: input.gstin,
    title: 'TAX INVOICE',
    number: input.number,
    date: `${input.date} ${time}`,
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
    footer: input.footer || `Paid by ${paidBy}. Thank you.`,
  };
  const rows = input.lines
    .map((line) => {
      const rate = line.rate != null ? line.rate.toFixed(2) : (line.qty ? (line.amount / line.qty).toFixed(2) : '0.00');
      return `<tr>
        <td style="text-align:left;padding:2px 0">${escapeHtml(line.description)}</td>
        <td style="text-align:right">${line.qty}</td>
        <td style="text-align:right">${rate}</td>
        <td style="text-align:right">${line.amount.toFixed(2)}</td>
      </tr>`;
    })
    .join('');
  const address = (input.address || []).filter(Boolean).map((line) => `<div>${escapeHtml(line)}</div>`).join('');
  const gstLine = [
    input.cgst ? `CGST ${input.cgst.toFixed(2)}` : '',
    input.sgst ? `SGST ${input.sgst.toFixed(2)}` : '',
    input.igst ? `IGST ${input.igst.toFixed(2)}` : '',
  ].filter(Boolean).join(' · ');
  const html = `<div style="font-family:ui-monospace,monospace;font-size:12px;width:72mm;margin:0 auto;color:#111">
    <div style="text-align:center">
      <div style="font-size:11px">Counter</div>
      <div style="font-size:15px;font-weight:700;text-transform:uppercase">${escapeHtml(receipt.company)}</div>
      ${address}
      ${input.phone ? `<div>MOB: ${escapeHtml(input.phone)}</div>` : ''}
      ${input.gstin ? `<div>GSTIN: ${escapeHtml(input.gstin)}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #111;margin:6px 0"></div>
    <div>Bill No: ${escapeHtml(input.number)}</div>
    <div style="display:flex;justify-content:space-between"><span>Date: ${escapeHtml(input.date)}</span><span>Time: ${escapeHtml(time)}</span></div>
    <div>Customer: ${escapeHtml(input.billTo || 'Walk-in')}</div>
    <div style="border-top:1px dashed #111;margin:6px 0"></div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="border-top:1px dashed #111;margin:6px 0"></div>
    <div style="display:flex;justify-content:space-between"><span>Total qty ${qtyTotal}</span><span>${input.total.toFixed(2)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>TOTAL TAXABLE</span><span>${(input.taxable ?? input.total).toFixed(2)}</span></div>
    ${gstLine ? `<div style="text-align:right">${escapeHtml(gstLine)}</div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-top:4px"><span>BILL AMOUNT</span><span>${input.total.toFixed(2)}</span></div>
    <div style="text-align:center;margin-top:6px">In words: ${escapeHtml(rupeesInWords(input.total))}</div>
    <div style="border-top:1px dashed #111;margin:6px 0"></div>
    <div style="text-align:center;font-weight:700">*** THANK YOU PLEASE VISIT AGAIN ***</div>
    <div style="text-align:center">PAID BY ${escapeHtml(paidBy.toUpperCase())}</div>
    ${input.footer ? `<div style="text-align:center;margin-top:4px">${escapeHtml(input.footer)}</div>` : ''}
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
