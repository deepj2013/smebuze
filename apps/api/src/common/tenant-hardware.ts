/** Tenant hardware intent — what the shop uses at the counter. Live drivers land later. */

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
  /** Vendor label the shop wrote, e.g. Pine Labs, TVS, Epson. */
  vendor: string;
  /** Model or serial note for support. */
  model: string;
  /** How it attaches on their side. */
  connection: string;
  /** Extra keys for future SDKs (merchant id, terminal id, agent URL). */
  extras: Record<string, string>;
  notes: string;
};

export type TenantHardwareSettings = {
  devices: HardwareDeviceConfig[];
  /** Optional URL of a future local bridge on the shop PC (http://127.0.0.1:…). */
  local_agent_url: string;
  updated_at?: string;
};

export const HARDWARE_CATALOG: {
  id: HardwareDeviceId;
  title: string;
  blurb: string;
  status: HardwareStatus;
  statusLabel: string;
  defaultConnection: string;
}[] = [
  {
    id: 'barcode_scanner',
    title: 'Barcode scanner',
    blurb: 'USB or Bluetooth scanner that types into the browser like a keyboard. Works with the cloud portal on the same PC or phone.',
    status: 'ready',
    statusLabel: 'Works today',
    defaultConnection: 'usb_hid',
  },
  {
    id: 'thermal_printer',
    title: 'Thermal bill printer',
    blurb: '58/80 mm receipt printer over USB serial, Bluetooth, or Wi‑Fi. Configure under Organization → Printers on each counter PC.',
    status: 'browser',
    statusLabel: 'Works from this browser',
    defaultConnection: 'usb_serial',
  },
  {
    id: 'office_printer',
    title: 'Office / A4 printer',
    blurb: 'Laser or inkjet on USB, Wi‑Fi or AirPrint. Uses the system print dialog from the cloud site.',
    status: 'browser',
    statusLabel: 'Works from this browser',
    defaultConnection: 'system',
  },
  {
    id: 'payment_qr',
    title: 'UPI / scan-to-pay QR',
    blurb: 'Cloud QR on the invoice (Razorpay). Customer pays from their phone — no local device required.',
    status: 'ready',
    statusLabel: 'Works today (Scan to pay)',
    defaultConnection: 'cloud',
  },
  {
    id: 'payment_edc',
    title: 'Card / PIN pad (EDC)',
    blurb: 'Pine Labs, Paytm, BharatQR soundbox, or bank POS machine on the shop LAN/USB. Needs a local bridge and vendor SDK — configure intent now; live push comes next.',
    status: 'planned',
    statusLabel: 'Coming soon — save config',
    defaultConnection: 'local_agent',
  },
  {
    id: 'weighing_scale',
    title: 'Weighing scale',
    blurb: 'Counter scale for loose sale by weight. Live USB/serial read is planned; today cashiers enter weight or rupees in POS.',
    status: 'planned',
    statusLabel: 'Coming soon — save config',
    defaultConnection: 'usb_serial',
  },
];

const CONNECTION_WHITELIST = new Set([
  'usb_hid',
  'usb_serial',
  'bluetooth',
  'wifi_lan',
  'system',
  'cloud',
  'local_agent',
  'other',
]);

function emptyDevice(id: HardwareDeviceId): HardwareDeviceConfig {
  const meta = HARDWARE_CATALOG.find((c) => c.id === id)!;
  return {
    id,
    enabled: false,
    vendor: '',
    model: '',
    connection: meta.defaultConnection,
    extras: {},
    notes: '',
  };
}

export function defaultHardwareSettings(): TenantHardwareSettings {
  return {
    devices: HARDWARE_CATALOG.map((c) => emptyDevice(c.id)),
    local_agent_url: '',
  };
}

export function parseTenantHardware(settings?: Record<string, unknown> | null): TenantHardwareSettings {
  const raw = (settings?.hardware ?? {}) as Partial<TenantHardwareSettings>;
  const byId = new Map<string, HardwareDeviceConfig>();
  if (Array.isArray(raw.devices)) {
    for (const row of raw.devices) {
      if (!row || typeof row !== 'object') continue;
      const id = (row as HardwareDeviceConfig).id;
      if (!HARDWARE_CATALOG.some((c) => c.id === id)) continue;
      const extrasRaw = (row as HardwareDeviceConfig).extras;
      const extras: Record<string, string> = {};
      if (extrasRaw && typeof extrasRaw === 'object') {
        for (const [k, v] of Object.entries(extrasRaw)) {
          if (typeof v === 'string' && k.length < 64) extras[k.slice(0, 64)] = v.slice(0, 200);
        }
      }
      const connection = String((row as HardwareDeviceConfig).connection || '');
      byId.set(id, {
        id,
        enabled: Boolean((row as HardwareDeviceConfig).enabled),
        vendor: String((row as HardwareDeviceConfig).vendor || '').slice(0, 80),
        model: String((row as HardwareDeviceConfig).model || '').slice(0, 80),
        connection: CONNECTION_WHITELIST.has(connection) ? connection : emptyDevice(id).connection,
        extras,
        notes: String((row as HardwareDeviceConfig).notes || '').slice(0, 500),
      });
    }
  }
  return {
    devices: HARDWARE_CATALOG.map((c) => byId.get(c.id) ?? emptyDevice(c.id)),
    local_agent_url: typeof raw.local_agent_url === 'string' ? raw.local_agent_url.trim().slice(0, 200) : '',
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

export function sanitizeHardwarePatch(
  body: Partial<{ devices: HardwareDeviceConfig[]; local_agent_url: string }>,
  current: TenantHardwareSettings,
): TenantHardwareSettings {
  const merged = parseTenantHardware({ hardware: { ...current, ...body, devices: body.devices ?? current.devices } });
  if (typeof body.local_agent_url === 'string') {
    const url = body.local_agent_url.trim();
    if (url && !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/.*)?$/i.test(url) && !/^https?:\/\/[\w.-]+(:\d+)?(\/.*)?$/i.test(url)) {
      merged.local_agent_url = current.local_agent_url;
    } else {
      merged.local_agent_url = url.slice(0, 200);
    }
  }
  merged.updated_at = new Date().toISOString();
  return merged;
}

export function publicHardware(settings: TenantHardwareSettings) {
  return {
    ...settings,
    catalog: HARDWARE_CATALOG.map((c) => ({
      id: c.id,
      title: c.title,
      blurb: c.blurb,
      status: c.status,
      status_label: c.statusLabel,
      default_connection: c.defaultConnection,
    })),
  };
}
