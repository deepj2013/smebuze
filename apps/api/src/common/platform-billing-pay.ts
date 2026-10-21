/** SMEBUZE platform subscription — bank / UPI / QR when Razorpay is not live. */

export type PlatformManualPay = {
  enabled: boolean;
  payee_name: string;
  upi_id: string | null;
  bank_name: string | null;
  branch: string | null;
  account_no: string | null;
  ifsc: string | null;
  qr_url: string | null;
  note: string;
};

function resolvePublicUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

export function platformManualPayInstructions(): PlatformManualPay {
  const upi = (process.env.PLATFORM_BILLING_UPI || '').trim() || null;
  const payee = (process.env.PLATFORM_BILLING_PAYEE_NAME || 'SMEBUZE').trim();
  const bank = (process.env.PLATFORM_BILLING_BANK_NAME || '').trim() || null;
  const branch = (process.env.PLATFORM_BILLING_BANK_BRANCH || '').trim() || null;
  const account = (process.env.PLATFORM_BILLING_ACCOUNT_NO || '').trim() || null;
  const ifsc = (process.env.PLATFORM_BILLING_IFSC || '').trim() || null;
  const qrRaw = (process.env.PLATFORM_BILLING_QR_URL || '').trim();
  const qr_url = qrRaw ? resolvePublicUrl(qrRaw) : null;
  const note =
    (process.env.PLATFORM_BILLING_NOTE || '').trim() ||
    'Pay the amount below by UPI or bank transfer, then upload the payment screenshot. SMEBUZE will activate your workspace after verification.';
  const enabled = Boolean(upi || account || qr_url);
  return {
    enabled,
    payee_name: payee,
    upi_id: upi,
    bank_name: bank,
    branch,
    account_no: account,
    ifsc,
    qr_url,
    note,
  };
}
