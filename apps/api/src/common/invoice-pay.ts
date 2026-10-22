import { createHmac, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';
import { createHash } from 'crypto';
import { type TenantPayu, payuReady } from './payu';

function encKey(): Buffer {
  return createHash('sha256').update(process.env.JWT_SECRET || 'smebuze-dev-key').digest();
}

export function makeInvoicePayToken(invoiceId: string, tenantId: string): string {
  const sig = createHmac('sha256', encKey())
    .update(`${invoiceId}.${tenantId}`)
    .digest('base64url')
    .slice(0, 20);
  return Buffer.from(`${invoiceId}.${tenantId}.${sig}`, 'utf8').toString('base64url');
}

export function parseInvoicePayToken(token: string): { invoiceId: string; tenantId: string } | null {
  try {
    const raw = Buffer.from(String(token || ''), 'base64url').toString('utf8');
    const [invoiceId, tenantId, sig] = raw.split('.');
    if (!invoiceId || !tenantId || !sig) return null;
    const expected = createHmac('sha256', encKey())
      .update(`${invoiceId}.${tenantId}`)
      .digest('base64url')
      .slice(0, 20);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { invoiceId, tenantId };
  } catch {
    return null;
  }
}

export function frontendPayUrl(token: string): string {
  const base = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/pay/${token}`;
}

export type InvoicePaySlip = {
  enabled: boolean;
  url?: string;
  qr_image?: string;
  outstanding?: number;
  accept_partial?: boolean;
};

export async function buildInvoicePaySlip(
  cfg: TenantPayu,
  invoice: { id: string; tenant_id: string; number: string; total: string | number; paid_amount?: string | number | null },
): Promise<InvoicePaySlip> {
  const total = parseFloat(String(invoice.total ?? 0));
  const paid = parseFloat(String(invoice.paid_amount ?? 0));
  const outstanding = Math.round((total - paid) * 100) / 100;
  if (!payuReady(cfg) || !cfg.enabled || outstanding < 1) return { enabled: false, outstanding };
  const token = makeInvoicePayToken(invoice.id, invoice.tenant_id);
  const url = frontendPayUrl(token);
  const qr_image = await payUrlQrDataUri(url);
  return { enabled: true, url, qr_image, outstanding, accept_partial: cfg.accept_partial };
}

async function payUrlQrDataUri(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}
