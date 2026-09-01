import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as QRCode from 'qrcode';

export type TenantRazorpay = {
  enabled: boolean;
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  accept_partial: boolean;
  min_partial_rupees: number;
};

export type RazorpayPublicSettings = {
  enabled: boolean;
  configured: boolean;
  key_id: string;
  key_secret_set: boolean;
  webhook_secret_set: boolean;
  accept_partial: boolean;
  min_partial_rupees: number;
  webhook_url: string;
};

const ENC = 'enc:v1:';

function encKey(): Buffer {
  return createHash('sha256').update(process.env.JWT_SECRET || 'smebuze-dev-key').digest();
}

export function encryptSecret(plain: string): string {
  const value = String(plain ?? '').trim();
  if (!value) return '';
  if (value.startsWith(ENC)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC + Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decryptSecret(stored: string): string {
  const value = String(stored ?? '').trim();
  if (!value) return '';
  if (!value.startsWith(ENC)) return value;
  try {
    const buf = Buffer.from(value.slice(ENC.length), 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', encKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function parseTenantRazorpay(settings: Record<string, unknown> | null | undefined): TenantRazorpay {
  const raw = (settings?.razorpay ?? {}) as Partial<TenantRazorpay>;
  const min = Number(raw.min_partial_rupees);
  return {
    enabled: raw.enabled === true,
    key_id: typeof raw.key_id === 'string' ? raw.key_id.trim() : '',
    key_secret: typeof raw.key_secret === 'string' ? raw.key_secret : '',
    webhook_secret: typeof raw.webhook_secret === 'string' ? raw.webhook_secret : '',
    accept_partial: raw.accept_partial !== false,
    min_partial_rupees: Number.isFinite(min) && min >= 1 ? Math.round(min * 100) / 100 : 1,
  };
}

export function razorpayReady(cfg: TenantRazorpay): boolean {
  return cfg.enabled && cfg.key_id.startsWith('rzp_') && decryptSecret(cfg.key_secret).length > 8;
}

export function publicRazorpaySettings(cfg: TenantRazorpay, webhookUrl: string): RazorpayPublicSettings {
  return {
    enabled: cfg.enabled,
    configured: razorpayReady(cfg),
    key_id: cfg.key_id,
    key_secret_set: Boolean(decryptSecret(cfg.key_secret)),
    webhook_secret_set: Boolean(decryptSecret(cfg.webhook_secret)),
    accept_partial: cfg.accept_partial,
    min_partial_rupees: cfg.min_partial_rupees,
    webhook_url: webhookUrl,
  };
}

export function rupeesToPaise(rupees: number): number {
  return Math.max(0, Math.round(Number(rupees) * 100));
}

export function paiseToRupees(paise: number): number {
  return Math.round(Number(paise)) / 100;
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

export function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  if (!payload || !signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function razorpayRequest<T = Record<string, unknown>>(
  keyId: string,
  keySecret: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!res.ok) {
    const msg = json?.error?.description || `Razorpay error (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

export function frontendPayUrl(token: string): string {
  const base = (process.env.FRONTEND_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '');
  return `${base}/pay/${token}`;
}

export function razorpayWebhookUrl(): string {
  const base = (process.env.API_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/v1/integrations/razorpay/webhook`;
}

export type InvoicePaySlip = {
  enabled: boolean;
  url?: string;
  qr_image?: string;
  outstanding?: number;
  accept_partial?: boolean;
};

export async function payUrlQrDataUri(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, { width: 240, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}

export async function buildInvoicePaySlip(
  cfg: TenantRazorpay,
  invoice: { id: string; tenant_id: string; number: string; total: string | number; paid_amount?: string | number | null },
): Promise<InvoicePaySlip> {
  const total = parseFloat(String(invoice.total ?? 0));
  const paid = parseFloat(String(invoice.paid_amount ?? 0));
  const outstanding = Math.round((total - paid) * 100) / 100;
  if (!razorpayReady(cfg) || outstanding < 1) return { enabled: false, outstanding };
  const token = makeInvoicePayToken(invoice.id, invoice.tenant_id);
  const url = frontendPayUrl(token);
  let qr_image = await payUrlQrDataUri(url);
  try {
    const closeBy = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45;
    const body: Record<string, unknown> = {
      type: 'upi_qr',
      name: `Invoice ${invoice.number}`.slice(0, 40),
      usage: 'multiple_use',
      fixed_amount: !cfg.accept_partial,
      description: `Invoice ${invoice.number}`,
      close_by: closeBy,
      notes: {
        invoice_id: invoice.id,
        tenant_id: invoice.tenant_id,
        invoice_number: invoice.number,
      },
    };
    if (!cfg.accept_partial) body.payment_amount = rupeesToPaise(outstanding);
    const qr = await razorpayRequest<{ image_url?: string }>(
      cfg.key_id,
      decryptSecret(cfg.key_secret),
      'POST',
      '/payments/qr_codes',
      body,
    );
    if (typeof qr.image_url === 'string' && qr.image_url) qr_image = qr.image_url;
  } catch {
    // Pay-page QR is enough when UPI QR is not enabled on the Razorpay account.
  }
  return { enabled: true, url, qr_image, outstanding, accept_partial: cfg.accept_partial };
}
