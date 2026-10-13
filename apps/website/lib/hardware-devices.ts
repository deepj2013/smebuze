/** Mirror of API hardware catalog for UI copy (status/labels). */

export type HardwareDeviceId =
  | 'barcode_scanner'
  | 'thermal_printer'
  | 'office_printer'
  | 'payment_qr'
  | 'payment_edc'
  | 'weighing_scale';

export type HardwareStatus = 'ready' | 'browser' | 'planned' | 'off';

export type HardwareDeviceConfig = {
  id: HardwareDeviceId;
  enabled: boolean;
  vendor: string;
  model: string;
  connection: string;
  extras: Record<string, string>;
  notes: string;
};

export type HardwareCatalogRow = {
  id: HardwareDeviceId;
  title: string;
  blurb: string;
  status: HardwareStatus;
  status_label: string;
  default_connection: string;
};

export type HardwareApiResponse = {
  devices: HardwareDeviceConfig[];
  local_agent_url: string;
  updated_at?: string;
  catalog: HardwareCatalogRow[];
};

export const CONNECTION_OPTIONS: { id: string; label: string }[] = [
  { id: 'usb_hid', label: 'USB (keyboard / HID)' },
  { id: 'usb_serial', label: 'USB serial' },
  { id: 'bluetooth', label: 'Bluetooth' },
  { id: 'wifi_lan', label: 'Wi‑Fi / shop LAN' },
  { id: 'system', label: 'System print dialog' },
  { id: 'cloud', label: 'Cloud only (no local device)' },
  { id: 'local_agent', label: 'Local bridge on counter PC' },
  { id: 'other', label: 'Other' },
];

export const EDC_EXTRA_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: 'merchant_id', label: 'Merchant ID', placeholder: 'From Pine Labs / bank' },
  { key: 'terminal_id', label: 'Terminal / TID', placeholder: 'Device terminal id' },
  { key: 'store_id', label: 'Store ID', placeholder: 'Optional store code' },
];

export function statusTone(status: HardwareStatus): string {
  if (status === 'ready') return 'bg-emerald-100 text-emerald-900';
  if (status === 'browser') return 'bg-sky-100 text-sky-900';
  if (status === 'planned') return 'bg-amber-100 text-amber-950';
  return 'bg-slate-100 text-slate-600';
}
