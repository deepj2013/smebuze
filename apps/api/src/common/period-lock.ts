import { ForbiddenException } from '@nestjs/common';

/** Last calendar day (YYYY-MM-DD) of a closed month, or null when the lock is off. */
export function lockedThroughYmd(settings: Record<string, unknown> | null | undefined): string | null {
  const lock = settings?.period_lock as { enabled?: boolean; through?: string } | undefined;
  if (!lock?.enabled) return null;
  const through = String(lock.through || '').slice(0, 7);
  const match = /^(\d{4})-(\d{2})$/.exec(through);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const last = new Date(year, month, 0);
  const d = String(last.getDate()).padStart(2, '0');
  return `${year}-${String(month).padStart(2, '0')}-${d}`;
}

export function toYmd(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function assertBooksOpen(lockedUntil: string | null, date: string | Date | null | undefined, label: string): void {
  if (!lockedUntil) return;
  const day = toYmd(date);
  if (!day || day > lockedUntil) return;
  throw new ForbiddenException(
    `Books are closed through ${lockedUntil}. ${label} dated ${day} cannot be added, changed, or removed. Ask the platform admin to open that month.`,
  );
}
