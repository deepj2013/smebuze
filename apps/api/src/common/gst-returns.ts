export const EXPENSE_NATURES = [
  { id: 'production', label: 'Production / productivity' },
  { id: 'operations', label: 'Operations' },
  { id: 'selling', label: 'Selling & marketing' },
  { id: 'admin', label: 'Administration' },
  { id: 'finance', label: 'Finance & bank' },
  { id: 'statutory', label: 'Statutory / tax' },
  { id: 'capex', label: 'Capital / asset' },
] as const;

export type ExpenseNature = (typeof EXPENSE_NATURES)[number]['id'];

export function defaultExpenseNature(category: string): ExpenseNature {
  if (category === 'Purchase / raw material' || category === 'Daily wages' || category === 'Contract labour' || category === 'Plastic/packaging charges' || category === 'Fuel') {
    return 'production';
  }
  if (category === 'Machinery / equipment') return 'capex';
  if (category === 'Marketing') return 'selling';
  if (category === 'Salary' || category === 'Professional fees' || category === 'Miscellaneous') return 'admin';
  if (category === 'Bank charges') return 'finance';
  if (category === 'Taxes & licences') return 'statutory';
  return 'operations';
}

export function isValidExpenseNature(value: string): value is ExpenseNature {
  return EXPENSE_NATURES.some((n) => n.id === value);
}

export function isGstin(value?: string | null): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(String(value || '').trim());
}

export function normalizeGstin(value?: string | null): string {
  return String(value || '').replace(/\s/g, '').toUpperCase();
}

export function normalizeInvoiceNo(value?: string | null): string {
  return String(value || '').replace(/[\s\-\/]/g, '').toUpperCase();
}

export function monthRange(period: string): { from: string; to: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(String(period || ''));
  if (!match) throw new Error('Period must be YYYY-MM');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const last = new Date(year, month, 0).getDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function inPeriod(date: Date | string | undefined, from: string, to: string): boolean {
  if (!date) return false;
  const d = new Date(date).toISOString().slice(0, 10);
  return d >= from && d <= to;
}
