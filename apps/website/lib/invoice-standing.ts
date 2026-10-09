export type PaymentStanding = 'pending' | 'partial' | 'paid' | 'credit';

export function invoiceStanding(row: {
  total?: string | number;
  paid_amount?: string | number;
  balance_due?: string | number;
  payment_status?: string;
}): { status: PaymentStanding; balance: number; paid: number; total: number } {
  const total = Number(row.total ?? 0);
  const paid = Number(row.paid_amount ?? 0);
  const known = row.payment_status;
  if (known === 'pending' || known === 'partial' || known === 'paid' || known === 'credit') {
    const balance = row.balance_due != null ? Number(row.balance_due) : Math.round((total - paid) * 100) / 100;
    return { status: known, balance, paid, total };
  }
  const balance = Math.round((total - paid) * 100) / 100;
  const status: PaymentStanding = balance < -0.05 ? 'credit' : balance <= 0.05 ? 'paid' : paid > 0.05 ? 'partial' : 'pending';
  return { status, balance, paid, total };
}

export function standingLabel(status: string): string {
  if (status === 'partial') return 'Partial';
  if (status === 'paid') return 'Paid';
  if (status === 'credit') return 'Credit';
  if (status === 'pending') return 'Pending';
  return status;
}

export function standingClass(status: string): string {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800';
  if (status === 'partial') return 'bg-sky-100 text-sky-800';
  if (status === 'credit') return 'bg-violet-100 text-violet-800';
  return 'bg-amber-100 text-amber-900';
}

export function isOverdue(due: string | null | undefined, status: string): boolean {
  if (!due || status === 'paid' || status === 'credit') return false;
  return due.slice(0, 10) < new Date().toISOString().slice(0, 10);
}
