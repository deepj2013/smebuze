/**
 * GSTIN format validation (India).
 * Format: 2 digits state code + 10 chars PAN + 1 entity + 1 Z + 1 checksum = 15 chars.
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return true; // optional field
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length !== 15) return false;
  return GSTIN_REGEX.test(trimmed);
}

export function formatGstin(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toUpperCase() || null;
}
