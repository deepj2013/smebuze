export const MALL_PIN_KEY = 'smebuze_mall_pin';
export const MALL_PHONE_KEY = 'smebuze_mall_phone';
export const MALL_ORDERS_KEY = 'smebuze_mall_orders';

export type MallOrderSnapshot = {
  tracking_token: string;
  track_path: string;
  order_number?: string | null;
  seller_name?: string;
  total: number;
  payment_status: string;
  status: string;
  created_at: string;
};

export function readMallPin(): string {
  try {
    return localStorage.getItem(MALL_PIN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveMallPin(pin: string) {
  try {
    localStorage.setItem(MALL_PIN_KEY, pin);
  } catch {
    /* ignore */
  }
}

export function saveMallPhone(phone: string) {
  const p = phone.replace(/\D/g, '').slice(-10);
  if (p.length !== 10) return;
  try {
    localStorage.setItem(MALL_PHONE_KEY, p);
  } catch {
    /* ignore */
  }
}

export function readMallPhone(): string {
  try {
    return localStorage.getItem(MALL_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

export function rememberMallOrder(order: MallOrderSnapshot) {
  try {
    const raw = localStorage.getItem(MALL_ORDERS_KEY);
    const list: MallOrderSnapshot[] = raw ? JSON.parse(raw) : [];
    const next = [order, ...list.filter((o) => o.tracking_token !== order.tracking_token)].slice(0, 30);
    localStorage.setItem(MALL_ORDERS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readMallOrders(): MallOrderSnapshot[] {
  try {
    const raw = localStorage.getItem(MALL_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as MallOrderSnapshot[]) : [];
  } catch {
    return [];
  }
}
