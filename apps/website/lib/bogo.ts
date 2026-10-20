export type BogoPromo = {
  buy_item_id: string;
  buy_qty: string | number;
  free_item_id: string | null;
  free_qty: string | number;
  is_active?: boolean;
  buy_item?: { name?: string };
  free_item?: { name?: string };
};

/** After paid lines, append zero-rate free lines for each matching BOGO. */
export function withBogoLines<T extends { item_id: string; qty: number; rate: number; name: string }>(
  cart: T[],
  promos: BogoPromo[],
  extra: (freeItemId: string, qty: number, name: string) => T,
): T[] {
  const paid = cart.filter((l) => l.rate > 0);
  const extras: T[] = [];
  for (const p of promos) {
    if (p.is_active === false) continue;
    const buyNeed = Math.max(1, Number(p.buy_qty) || 1);
    const freeEach = Math.max(1, Number(p.free_qty) || 1);
    const bought = paid.filter((l) => l.item_id === p.buy_item_id).reduce((s, l) => s + l.qty, 0);
    const sets = Math.floor(bought / buyNeed);
    if (sets <= 0) continue;
    const freeId = p.free_item_id || p.buy_item_id;
    extras.push(extra(freeId, sets * freeEach, `${p.free_item?.name || p.buy_item?.name || 'Free'} (offer)`));
  }
  return extras.length ? [...paid, ...extras] : paid;
}
