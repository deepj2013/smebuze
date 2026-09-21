export type KitchenStatus = 'sent' | 'preparing' | 'ready' | 'served' | 'billed' | 'cancelled';

export type FloorLine = {
  id: string;
  item_id: string | null;
  name: string;
  qty: number;
  unit: string;
  rate: number;
  note?: string;
};

export type FloorTicket = {
  id: string;
  number: string;
  table_no: string;
  covers: number;
  kitchen_status: KitchenStatus;
  waiter_name: string;
  note: string;
  status: string;
  total: number;
  created_at: string;
  billed_invoice_id: string | null;
  company_id: string;
  customer_id: string | null;
  tenant_id: string;
  tenant_name?: string;
  tenant_slug?: string;
  lines: FloorLine[];
};

export type FloorSnapshot = {
  business_type?: string | null;
  is_floor?: boolean;
  tables: string[];
  tickets: FloorTicket[];
  open: FloorTicket[];
  by_table: Record<string, FloorTicket | null>;
};

export const KITCHEN_LABEL: Record<KitchenStatus, string> = {
  sent: 'New',
  preparing: 'Cooking',
  ready: 'Ready',
  served: 'Served',
  billed: 'Billed',
  cancelled: 'Cancelled',
};

export function minutesAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function statusClass(status: KitchenStatus): string {
  switch (status) {
    case 'sent':
      return 'bg-amber-100 text-amber-900';
    case 'preparing':
      return 'bg-orange-100 text-orange-900';
    case 'ready':
      return 'bg-emerald-100 text-emerald-900';
    case 'served':
      return 'bg-sky-100 text-sky-900';
    case 'billed':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-rose-100 text-rose-800';
  }
}
