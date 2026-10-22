import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

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

export type PayuEnv = 'test' | 'prod';

export type PayuConfig = {
  key: string;
  salt: string;
  env: PayuEnv;
};

export type TenantPayu = PayuConfig & {
  enabled: boolean;
  accept_partial: boolean;
  min_partial_rupees: number;
};

export type PayuPublicSettings = {
  enabled: boolean;
  configured: boolean;
  merchant_key: string;
  salt_set: boolean;
  accept_partial: boolean;
  min_partial_rupees: number;
  return_url: string;
  env: PayuEnv;
};

export function payuEnvFromProcess(): PayuEnv {
  const v = String(process.env.PAYU_ENV || 'test').trim().toLowerCase();
  return v === 'prod' || v === 'production' || v === 'live' ? 'prod' : 'test';
}

export function platformPayu(): TenantPayu {
  const key = (process.env.PAYU_MERCHANT_KEY || '').trim();
  const salt = (process.env.PAYU_MERCHANT_SALT || '').trim();
  return {
    enabled: Boolean(key && salt),
    key,
    salt,
    env: payuEnvFromProcess(),
    accept_partial: true,
    min_partial_rupees: 1,
  };
}

export function parseTenantPayu(settings: Record<string, unknown> | null | undefined): TenantPayu {
  const raw = (settings?.payu ?? settings?.razorpay ?? {}) as Record<string, unknown>;
  const min = Number(raw.min_partial_rupees);
  const key = typeof raw.key === 'string' ? raw.key.trim() : typeof raw.key_id === 'string' ? raw.key_id.trim() : '';
  const saltStored = typeof raw.salt === 'string' ? raw.salt : typeof raw.key_secret === 'string' ? raw.key_secret : '';
  const envRaw = String(raw.env || payuEnvFromProcess());
  return {
    enabled: raw.enabled === true,
    key,
    salt: saltStored,
    env: envRaw === 'prod' || envRaw === 'production' ? 'prod' : 'test',
    accept_partial: raw.accept_partial !== false,
    min_partial_rupees: Number.isFinite(min) && min >= 1 ? Math.round(min * 100) / 100 : 1,
  };
}

export function payuReady(cfg: PayuConfig & { enabled?: boolean }): boolean {
  const salt = decryptSecret(cfg.salt) || cfg.salt;
  return Boolean(cfg.enabled !== false && cfg.key && salt.length >= 4);
}

export function payuSalt(cfg: PayuConfig): string {
  return decryptSecret(cfg.salt) || cfg.salt;
}

export function publicPayuSettings(cfg: TenantPayu, returnUrl: string): PayuPublicSettings {
  return {
    enabled: cfg.enabled,
    configured: payuReady(cfg),
    merchant_key: cfg.key,
    salt_set: Boolean(payuSalt(cfg)),
    accept_partial: cfg.accept_partial,
    min_partial_rupees: cfg.min_partial_rupees,
    return_url: returnUrl,
    env: cfg.env,
  };
}

export function payuPaymentUrl(env: PayuEnv): string {
  return env === 'prod' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment';
}

export function payuPostServiceUrl(env: PayuEnv): string {
  return env === 'prod'
    ? 'https://info.payu.in/merchant/postservice.php?form=2'
    : 'https://test.payu.in/merchant/postservice?form=2';
}

/** Request hash for hosted checkout (_payment). */
export function hashPayuPaymentRequest(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  salt: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string {
  const u1 = params.udf1 ?? '';
  const u2 = params.udf2 ?? '';
  const u3 = params.udf3 ?? '';
  const u4 = params.udf4 ?? '';
  const u5 = params.udf5 ?? '';
  const seq = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${u1}|${u2}|${u3}|${u4}|${u5}||||||${params.salt}`;
  return createHash('sha512').update(seq).digest('hex');
}

export function hashPayuVerify(key: string, txnid: string, salt: string): string {
  return createHash('sha512').update(`${key}|verify_payment|${txnid}|${salt}`).digest('hex');
}

export function formatPayuAmount(rupees: number): string {
  return Number(rupees).toFixed(2);
}

export function makePayuTxnId(prefix: string): string {
  const base = `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9]/g, '');
  return base.slice(0, 25);
}

export function apiPublicUrl(): string {
  return (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

export function frontendUrl(): string {
  return (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function payuReturnUrl(): string {
  return `${apiPublicUrl()}/api/v1/payu/return`;
}

export type PayuHostedForm = {
  action: string;
  method: 'POST';
  fields: Record<string, string>;
};

export function buildHostedCheckoutForm(
  cfg: PayuConfig,
  input: {
    txnid: string;
    amountRupees: number;
    productinfo: string;
    firstname: string;
    email: string;
    phone?: string;
    surl?: string;
    furl?: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
  },
): PayuHostedForm {
  const salt = payuSalt(cfg);
  const amount = formatPayuAmount(input.amountRupees);
  const surl = input.surl || payuReturnUrl();
  const furl = input.furl || payuReturnUrl();
  const hash = hashPayuPaymentRequest({
    key: cfg.key,
    txnid: input.txnid,
    amount,
    productinfo: input.productinfo,
    firstname: input.firstname,
    email: input.email,
    salt,
    udf1: input.udf1,
    udf2: input.udf2,
    udf3: input.udf3,
    udf4: input.udf4,
    udf5: input.udf5,
  });
  return {
    action: payuPaymentUrl(cfg.env),
    method: 'POST',
    fields: {
      key: cfg.key,
      txnid: input.txnid,
      amount,
      productinfo: input.productinfo,
      firstname: input.firstname,
      email: input.email,
      phone: input.phone || '',
      surl,
      furl,
      hash,
      service_provider: 'payu_paisa',
      udf1: input.udf1 || '',
      udf2: input.udf2 || '',
      udf3: input.udf3 || '',
      udf4: input.udf4 || '',
      udf5: input.udf5 || '',
    },
  };
}

export async function verifyPayuTransaction(cfg: PayuConfig, txnid: string): Promise<{
  status: string;
  mihpayid?: string;
  amt?: string;
  raw?: unknown;
}> {
  const salt = payuSalt(cfg);
  const hash = hashPayuVerify(cfg.key, txnid, salt);
  const body = new URLSearchParams({
    key: cfg.key,
    command: 'verify_payment',
    var1: txnid,
    hash,
  });
  const res = await fetch(payuPostServiceUrl(cfg.env), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { status: 'unknown', raw: text };
  }
  const details = (json.transaction_details as Record<string, Record<string, string>>) || {};
  const row = details[txnid] || Object.values(details)[0] || {};
  const status = String(row.status || json.status || '').toLowerCase();
  return {
    status,
    mihpayid: row.mihpayid,
    amt: row.amt || row.transaction_amount,
    raw: json,
  };
}

export type PayuReturnBody = Record<string, string>;

export function normalizePayuBody(body: unknown): PayuReturnBody {
  if (!body || typeof body !== 'object') return {};
  const out: PayuReturnBody = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}
