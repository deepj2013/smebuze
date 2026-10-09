import { getStaticUrl } from './api';

export type StatementCompany = {
  name: string;
  legal_name?: string | null;
  gstin?: string | null;
  logo_url?: string | null;
  address?: Record<string, unknown> | null;
  bank_details?: Record<string, unknown> | null;
};

export type StatementBranding = {
  logo_url?: string | null;
  display_name?: string | null;
  primary_color?: string | null;
};

export type LedgerInvoice = {
  number: string;
  invoice_date: string;
  due_date: string | null;
  payment_status: string;
  total_invoiced: number;
  total_received: number;
  total_pending: number;
};

export type LedgerParty = {
  name: string;
  gstin?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: Record<string, unknown> | null;
};

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function text(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function formatAddress(address?: Record<string, unknown> | null): string {
  if (!address) return '';
  const line1 = text(address.line1 || address.line_1 || address.street);
  const line2 = text(address.line2 || address.line_2);
  const city = text(address.city);
  const state = text(address.state);
  const pin = text(address.pincode || address.pin || address.zip);
  const cityLine = [city, state].filter(Boolean).join(', ');
  return [line1, line2, [cityLine, pin].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

export function moneyIn(n: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
}

function localToday(): string {
  const n = new Date();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${n.getFullYear()}-${m}-${d}`;
}

function prettyDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: string): string {
  if (status === 'partial') return 'Partial';
  if (status === 'paid') return 'Paid';
  if (status === 'credit') return 'Credit';
  if (status === 'pending') return 'Pending';
  return status || '—';
}

function logoSrc(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return getStaticUrl(path);
}

function bankLines(bank?: Record<string, unknown> | null): string[] {
  if (!bank) return [];
  const name = text(bank.bank_name);
  const branch = text(bank.branch);
  const accountName = text(bank.account_name);
  const account = text(bank.account_no);
  const ifsc = text(bank.ifsc);
  const lines: string[] = [];
  if (name) lines.push(`Bank: ${name}${branch ? `, ${branch}` : ''}`);
  if (accountName) lines.push(`Account name: ${accountName}`);
  if (account) lines.push(`A/C No.: ${account}`);
  if (ifsc) lines.push(`IFSC: ${ifsc}`);
  return lines;
}

const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #0f172a; font-family: "Segoe UI", "Source Sans 3", sans-serif; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 0; letter-spacing: -0.02em; }
  h2 { font-size: 16px; margin: 0; }
  p { margin: 0; }
  .sheet { max-width: 800px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #0f172a; padding-bottom: 12px; }
  .brand { display: flex; gap: 12px; align-items: flex-start; }
  .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; background: #fff; }
  .mark { width: 64px; height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 18px; }
  .muted { color: #475569; }
  .title { text-align: right; }
  .title p { margin-top: 4px; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin-top: 16px; }
  .box { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .due { margin-top: 14px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
  .due strong { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; vertical-align: top; }
  th { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #475569; background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .over { color: #b91c1c; font-weight: 700; }
  .totals { margin-top: 8px; margin-left: auto; width: 280px; }
  .totals td { border: none; padding: 3px 0; }
  .bank { margin-top: 22px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .note { margin-top: 16px; color: #64748b; font-size: 11px; }
  .report table { width: 100%; }
  .report th, .report td { border: 1px solid #cbd5e1; }
  .report button, .report a[href] { color: inherit; text-decoration: none; }
  @media print { .no-print { display: none !important; } }
`;

function letterheadHtml(company: StatementCompany | null, branding: StatementBranding | null, docTitle: string, subtitle: string): string {
  const heading = branding?.display_name || company?.legal_name || company?.name || 'Statement';
  const trade = company?.name && company.name !== heading ? company.name : '';
  const addr = company?.address;
  const address = formatAddress(addr);
  const phone = text(addr?.phone);
  const email = text(addr?.email);
  const gstin = text(company?.gstin);
  const fssai = text(addr?.fssai);
  const msme = text(addr?.msme);
  const color = branding?.primary_color && /^#[0-9a-fA-F]{6}$/.test(branding.primary_color) ? branding.primary_color : '#0f172a';
  const logo = logoSrc(company?.logo_url || branding?.logo_url);
  const initials = heading.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'SB';
  const mark = logo
    ? `<img class="logo" src="${esc(logo)}" alt="Logo" />`
    : `<div class="mark" style="background:${esc(color)}">${esc(initials)}</div>`;
  const lines = [
    trade ? `<p>${esc(trade)}</p>` : '',
    address ? `<p>${esc(address)}</p>` : '',
    phone ? `<p>Phone: ${esc(phone)}</p>` : '',
    email ? `<p>Email: ${esc(email)}</p>` : '',
    gstin ? `<p><strong>GSTIN:</strong> ${esc(gstin)}</p>` : '',
    fssai ? `<p>FSSAI: ${esc(fssai)}</p>` : '',
    msme ? `<p>MSME: ${esc(msme)}</p>` : '',
  ].join('');
  return `<div class="head"><div class="brand">${mark}<div><h1>${esc(heading)}</h1><div class="muted">${lines}</div></div></div><div class="title"><h2>${esc(docTitle)}</h2><p class="muted">${esc(subtitle)}</p><p class="muted">Issued ${esc(prettyDate(localToday()))}</p></div></div>`;
}

export function customerLedgerHtml(input: {
  company: StatementCompany | null;
  branding: StatementBranding | null;
  party: LedgerParty;
  invoices: LedgerInvoice[];
}): string {
  const today = localToday();
  const invoices = [...input.invoices].sort((a, b) => a.invoice_date.localeCompare(b.invoice_date) || a.number.localeCompare(b.number));
  const invoiced = invoices.reduce((s, row) => s + Number(row.total_invoiced || 0), 0);
  const received = invoices.reduce((s, row) => s + Number(row.total_received || 0), 0);
  const pending = invoices.reduce((s, row) => s + Number(row.total_pending || 0), 0);
  const partyAddress = formatAddress(input.party.address);
  const partyBits = [
    input.party.gstin ? `<p>GSTIN: ${esc(input.party.gstin)}</p>` : '',
    partyAddress ? `<p>${esc(partyAddress)}</p>` : '',
    input.party.phone ? `<p>Phone: ${esc(input.party.phone)}</p>` : '',
    input.party.email ? `<p>Email: ${esc(input.party.email)}</p>` : '',
  ].join('');
  let running = 0;
  const rows = invoices.length
    ? invoices.map((inv) => {
        running = Math.round((running + Number(inv.total_pending || 0)) * 100) / 100;
        const overdue = !!inv.due_date && inv.due_date.slice(0, 10) < today && inv.payment_status !== 'paid' && inv.payment_status !== 'credit';
        return `<tr>
          <td>${esc(prettyDate(inv.invoice_date))}</td>
          <td>${esc(inv.number)}</td>
          <td>${esc(prettyDate(inv.due_date))}${overdue ? ' <span class="over">Overdue</span>' : ''}</td>
          <td>${esc(statusLabel(inv.payment_status))}</td>
          <td class="num">${esc(moneyIn(inv.total_invoiced))}</td>
          <td class="num">${esc(moneyIn(inv.total_received))}</td>
          <td class="num">${esc(moneyIn(inv.total_pending))}</td>
          <td class="num">${esc(moneyIn(running))}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="8">No invoices for this customer.</td></tr>`;
  const bank = bankLines(input.company?.bank_details);
  return `<div class="sheet">
    ${letterheadHtml(input.company, input.branding, 'Customer ledger', 'Invoices, payments received, and amount due')}
    <div class="parties">
      <div class="box">
        <p class="label">Customer</p>
        <p><strong>${esc(input.party.name || 'Customer')}</strong></p>
        <div class="muted">${partyBits}</div>
      </div>
      <div class="box">
        <p class="label">Statement</p>
        <p>${invoices.length} invoice${invoices.length === 1 ? '' : 's'}</p>
        <p class="muted">Balance is after credit notes and debit notes.</p>
      </div>
    </div>
    <div class="due"><span>Amount due</span><strong>${esc(moneyIn(pending))}</strong></div>
    <table>
      <thead><tr>
        <th>Date</th><th>Invoice</th><th>Due</th><th>Status</th>
        <th class="num">Invoiced</th><th class="num">Received</th><th class="num">Pending</th><th class="num">Balance</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      <tbody>
        <tr><td>Total invoiced</td><td class="num">${esc(moneyIn(invoiced))}</td></tr>
        <tr><td>Total received</td><td class="num">${esc(moneyIn(received))}</td></tr>
        <tr><td><strong>Amount due</strong></td><td class="num"><strong>${esc(moneyIn(pending))}</strong></td></tr>
      </tbody>
    </table>
    ${bank.length ? `<div class="bank"><p class="label">Bank details for payment</p>${bank.map((line) => `<p>${esc(line)}</p>`).join('')}</div>` : ''}
    <p class="note">Please pay the amount due. Quote the invoice number on your payment so it can be matched.</p>
  </div>`;
}

export function reportDocumentHtml(input: {
  company: StatementCompany | null;
  branding: StatementBranding | null;
  title: string;
  subtitle: string;
  bodyHtml: string;
}): string {
  return `<div class="sheet">${letterheadHtml(input.company, input.branding, input.title, input.subtitle)}<div class="report">${input.bodyHtml}</div></div>`;
}

export function openPrintDocument(title: string, innerHtml: string): boolean {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${innerHtml}<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},300);});</script></body></html>`;
  const popup = window.open('', '_blank', 'width=960,height=720');
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return true;
  }
  const frame = document.createElement('iframe');
  frame.setAttribute('title', title);
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.right = '0';
  frame.style.bottom = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const view = frame.contentWindow;
  if (!doc || !view) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => frame.remove(), 60_000);
  return true;
}
