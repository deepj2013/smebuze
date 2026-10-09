import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { round2 } from './money';

/** GST document series a tenant can turn on from a chosen date. Rule 46: consecutive, unique in the FY, max 16 characters. */
export const SERIES_KINDS = ['invoice', 'credit_note', 'sales_debit_note', 'purchase_debit_note'] as const;
export type SeriesKind = (typeof SERIES_KINDS)[number];

export interface DocumentSeriesConfig {
  enabled: boolean;
  prefix: string;
  separator: '-' | '/';
  include_fy: boolean;
  pad: number;
  start_number: number;
  effective_from: string;
}

export type DocumentSeriesSettings = Record<SeriesKind, DocumentSeriesConfig>;

const TABLES: Record<SeriesKind, string> = {
  invoice: 'sales_invoices',
  credit_note: 'credit_notes',
  sales_debit_note: 'sales_debit_notes',
  purchase_debit_note: 'debit_notes',
};

export const DEFAULT_SERIES: DocumentSeriesSettings = {
  invoice: { enabled: false, prefix: 'INV', separator: '/', include_fy: true, pad: 4, start_number: 1, effective_from: '' },
  credit_note: { enabled: false, prefix: 'CN', separator: '/', include_fy: true, pad: 4, start_number: 1, effective_from: '' },
  sales_debit_note: { enabled: false, prefix: 'DN', separator: '/', include_fy: true, pad: 4, start_number: 1, effective_from: '' },
  purchase_debit_note: { enabled: false, prefix: 'PDN', separator: '/', include_fy: true, pad: 4, start_number: 1, effective_from: '' },
};

export const CREDIT_NOTE_REASONS = [
  { code: 'sales_return', label: 'Sales return' },
  { code: 'post_sale_discount', label: 'Post-sale discount' },
  { code: 'deficiency', label: 'Deficiency in goods or service' },
  { code: 'rate_difference', label: 'Rate difference' },
  { code: 'other', label: 'Other' },
] as const;

export const SALES_DEBIT_NOTE_REASONS = [
  { code: 'price_increase', label: 'Price increased after invoice' },
  { code: 'additional_charges', label: 'Additional charges' },
  { code: 'rate_difference', label: 'Rate difference' },
  { code: 'other', label: 'Other' },
] as const;

export const PURCHASE_DEBIT_NOTE_REASONS = [
  { code: 'purchase_return', label: 'Purchase return' },
  { code: 'deficiency', label: 'Short or defective supply' },
  { code: 'rate_difference', label: 'Rate difference' },
  { code: 'other', label: 'Other' },
] as const;

export type PaymentStanding = 'pending' | 'partial' | 'paid' | 'credit';

export function paymentStanding(total: number, paid: number, credit = 0, debit = 0): PaymentStanding {
  const net = round2(total + debit - credit);
  const balance = round2(net - paid);
  if (balance < -0.05) return 'credit';
  if (balance <= 0.05) return 'paid';
  if (paid > 0.05) return 'partial';
  return 'pending';
}

export function noteAffectsBalance(status: string | null | undefined): boolean {
  return status === 'issued' || status === 'posted';
}

/** Indian FY code. 9 Oct 2026 → 2627 (1 Apr 2026 – 31 Mar 2027). */
export function financialYearCode(isoDate: string): string {
  const [y, m] = isoDate.slice(0, 10).split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(-2)}${String(start + 1).slice(-2)}`;
}

export function isoDateOnly(value: string | Date | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function normalizeSeriesConfig(raw: unknown, fallback: DocumentSeriesConfig): DocumentSeriesConfig {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const pad = Number(r.pad);
  const start = Number(r.start_number);
  const prefix = String(r.prefix ?? fallback.prefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const from = typeof r.effective_from === 'string' ? r.effective_from.slice(0, 10) : '';
  return {
    enabled: r.enabled === true,
    prefix: prefix || fallback.prefix,
    separator: r.separator === '-' ? '-' : '/',
    include_fy: r.include_fy !== false,
    pad: Number.isFinite(pad) ? Math.min(6, Math.max(3, Math.round(pad))) : fallback.pad,
    start_number: Number.isFinite(start) && start >= 1 ? Math.round(start) : fallback.start_number,
    effective_from: /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : '',
  };
}

export function parseDocumentSeries(settings: Record<string, unknown> | null | undefined): DocumentSeriesSettings {
  const raw = (settings?.document_series ?? {}) as Record<string, unknown>;
  return {
    invoice: normalizeSeriesConfig(raw.invoice, DEFAULT_SERIES.invoice),
    credit_note: normalizeSeriesConfig(raw.credit_note, DEFAULT_SERIES.credit_note),
    sales_debit_note: normalizeSeriesConfig(raw.sales_debit_note, DEFAULT_SERIES.sales_debit_note),
    purchase_debit_note: normalizeSeriesConfig(raw.purchase_debit_note, DEFAULT_SERIES.purchase_debit_note),
  };
}

export function formatSeriesNumber(cfg: DocumentSeriesConfig, seq: number, isoDate: string): string {
  const body = String(seq).padStart(cfg.pad, '0');
  if (cfg.include_fy) return `${cfg.prefix}${cfg.separator}${financialYearCode(isoDate)}${cfg.separator}${body}`;
  return `${cfg.prefix}${cfg.separator}${body}`;
}

export function validateSeriesConfig(cfg: DocumentSeriesConfig): string | null {
  if (!cfg.enabled) return null;
  if (!/^[A-Z0-9]{1,8}$/.test(cfg.prefix)) return 'Prefix must be 1–8 letters or digits.';
  if (cfg.separator !== '-' && cfg.separator !== '/') return 'Separator must be - or /.';
  if (cfg.pad < 3 || cfg.pad > 6) return 'Number width must be 3 to 6 digits.';
  if (cfg.start_number < 1) return 'Starting number must be 1 or more.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cfg.effective_from)) return 'Choose the date this series starts.';
  const sample = formatSeriesNumber(cfg, cfg.start_number, cfg.effective_from);
  if (sample.length > 16) {
    return `Sample number ${sample} is ${sample.length} characters. GST allows 16. Shorten the prefix or digit width.`;
  }
  return null;
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function nextSeriesSequence(cfg: DocumentSeriesConfig, existingNumbers: string[], isoDate: string): number {
  const sep = escapeReg(cfg.separator);
  const prefix = escapeReg(cfg.prefix);
  const re = cfg.include_fy
    ? new RegExp(`^${prefix}${sep}${financialYearCode(isoDate)}${sep}(\\d+)$`)
    : new RegExp(`^${prefix}${sep}(\\d+)$`);
  let max = cfg.start_number - 1;
  for (const n of existingNumbers) {
    const match = re.exec(String(n).trim());
    if (!match) continue;
    const value = parseInt(match[1], 10);
    if (value > max) max = value;
  }
  return max + 1;
}

export function seriesApplies(cfg: DocumentSeriesConfig, isoDate: string): boolean {
  return cfg.enabled && /^\d{4}-\d{2}-\d{2}$/.test(cfg.effective_from) && isoDate >= cfg.effective_from;
}

export function describeSeries(cfg: DocumentSeriesConfig, isoDate: string, existingNumbers: string[]): {
  applies: boolean;
  number: string | null;
  message: string;
} {
  if (!cfg.enabled) {
    return { applies: false, number: null, message: 'Series is off. A blank number still gets an automatic number, same as today.' };
  }
  const problem = validateSeriesConfig(cfg);
  if (problem) return { applies: false, number: null, message: problem };
  if (isoDate < cfg.effective_from) {
    return {
      applies: false,
      number: null,
      message: `This series starts on ${cfg.effective_from}. Dates before that keep an automatic number.`,
    };
  }
  const number = formatSeriesNumber(cfg, nextSeriesSequence(cfg, existingNumbers, isoDate), isoDate);
  if (number.length > 16) {
    return { applies: false, number: null, message: `${number} is longer than 16 characters. Shorten the prefix.` };
  }
  return { applies: true, number, message: `Next number on ${isoDate} is ${number}.` };
}

export async function allocateDocumentNumber(
  manager: EntityManager,
  args: {
    tenantId: string;
    companyId: string;
    kind: SeriesKind;
    explicit?: string | null;
    isoDate: string;
    fallbackPrefix: string;
  },
): Promise<string> {
  const manual = args.explicit?.trim();
  const table = TABLES[args.kind];
  if (manual) {
    if (manual.length > 50) throw new BadRequestException('Document number must be 50 characters or fewer.');
    const taken = await manager.query(
      `SELECT 1 FROM ${table} WHERE tenant_id = $1 AND company_id = $2 AND number = $3 LIMIT 1`,
      [args.tenantId, args.companyId, manual],
    );
    if (taken.length) throw new BadRequestException(`Number ${manual} is already used for this company.`);
    return manual;
  }

  const date = isoDateOnly(args.isoDate);
  await manager.query('SELECT id FROM tenants WHERE id = $1 FOR UPDATE', [args.tenantId]);
  const tenantRows = await manager.query('SELECT settings FROM tenants WHERE id = $1', [args.tenantId]);
  const settings = (tenantRows[0]?.settings ?? {}) as Record<string, unknown>;
  const cfg = parseDocumentSeries(settings)[args.kind];
  if (!seriesApplies(cfg, date)) return `${args.fallbackPrefix}-${Date.now()}`;

  const problem = validateSeriesConfig(cfg);
  if (problem) throw new BadRequestException(problem);

  const existing: Array<{ number: string }> = await manager.query(
    `SELECT number FROM ${table} WHERE tenant_id = $1 AND company_id = $2`,
    [args.tenantId, args.companyId],
  );
  const numbers = existing.map((row) => row.number);
  for (let attempt = 0; attempt < 8; attempt++) {
    const seq = nextSeriesSequence(cfg, numbers, date) + attempt;
    const number = formatSeriesNumber(cfg, seq, date);
    if (number.length > 16) {
      throw new BadRequestException(`Series number ${number} exceeds 16 characters. Shorten the prefix under Invoice series.`);
    }
    if (!numbers.includes(number)) return number;
  }
  throw new BadRequestException('Could not allocate the next serial number. Try again.');
}
