/** First letter of each word: "Taka Tak - Chatpata Masala" → "ttcm". */
export function nameInitials(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0]!)
    .join('');
}

/**
 * POS name search: every word must appear, OR a compact initials code matches
 * (e.g. query "ttcm" finds "taka tak - chatpata masala").
 */
export function matchesPosNameSearch(
  query: string,
  opts: { name: string; extra?: Array<string | null | undefined> },
): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;

  const name = opts.name || '';
  const hay = [name, ...(opts.extra || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const initials = nameInitials(name);
  const compactName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (tokens.every((token) => hay.includes(token))) return true;

  // Single compact code like "ttcm" or "ttc"
  if (tokens.length === 1) {
    const q = tokens[0]!;
    if (q.length >= 2 && (initials === q || initials.startsWith(q) || initials.includes(q))) return true;
    if (q.length >= 3 && compactName.includes(q)) return true;
  }

  // Multi-token: allow initials of the whole query against product initials
  const queryInitials = tokens.map((t) => t[0]).join('');
  if (queryInitials.length >= 2 && (initials === queryInitials || initials.startsWith(queryInitials))) return true;

  return false;
}
