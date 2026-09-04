/** Indian-style amount in words for GST invoices. */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  if (n <= 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`.trim();
  const rest = belowThousand(n % 100);
  return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` ${rest}` : ''}`;
}

function toIndianWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 1_00_00_000);
  n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000);
  n %= 1_00_000;
  const thousand = Math.floor(n / 1000);
  const rest = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInInrWords(amount: number): string {
  const rounded = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(rounded) || rounded < 0) return 'Zero Rupees only';
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  const rupeeWords = toIndianWords(rupees);
  if (paise > 0) return `${rupeeWords} Rupees and ${toIndianWords(paise)} Paise only`;
  return `${rupeeWords} Rupees only`;
}

const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

export function gstPlaceOfSupply(gstin?: string | null, address?: Record<string, unknown> | null): string {
  const state = typeof address?.state === 'string' ? address.state.trim() : '';
  const code = typeof address?.state_code === 'string' ? address.state_code.trim() : '';
  if (code && state) return /^\d{2}$/.test(code) ? `${code}-${state}` : `${code}-${state}`;
  const g = String(gstin || '').replace(/\s/g, '').toUpperCase();
  if (g.length >= 2 && GST_STATES[g.slice(0, 2)]) return `${g.slice(0, 2)}-${GST_STATES[g.slice(0, 2)]}`;
  if (state) return state;
  return '';
}

export function formatInr(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInvoiceDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}
