/** Device-local printer profiles for invoices, quotations and receipts. */

export type PrinterConnection = 'local' | 'wifi' | 'internet' | 'bluetooth';
export type PrinterKind = 'inkjet' | 'laser' | 'thermal' | 'dot_matrix';
export type PaperSize = 'a4' | 'a5' | 'letter' | 'thermal_58' | 'thermal_80';

export interface PrinterProfile {
  id: string;
  name: string;
  connection: PrinterConnection;
  kind: PrinterKind;
  paper: PaperSize;
  isDefault: boolean;
  /** Wi-Fi / internet printer hostname or IP (informational; used in setup notes). */
  host?: string;
  port?: number;
  bluetoothName?: string;
  bluetoothId?: string;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = 'smebuzz_printers';

export const CONNECTION_OPTIONS: { id: PrinterConnection; title: string; blurb: string }[] = [
  {
    id: 'local',
    title: 'Local / USB',
    blurb: 'Plugged into this computer with a USB cable, or already installed in Windows, macOS or Linux.',
  },
  {
    id: 'wifi',
    title: 'Wi-Fi / LAN',
    blurb: 'On the same office network. Add it once in phone or computer settings, then pick it when you print.',
  },
  {
    id: 'internet',
    title: 'Internet / AirPrint',
    blurb: 'Reachable over the internet, a print server, or AirPrint / IPP from another floor or another city.',
  },
  {
    id: 'bluetooth',
    title: 'Bluetooth (mobile)',
    blurb: 'Pocket thermal or portable printer paired from Chrome on Android, or from the phone’s Bluetooth list.',
  },
];

export const KIND_OPTIONS: { id: PrinterKind; title: string; blurb: string }[] = [
  { id: 'inkjet', title: 'Inkjet', blurb: 'Colour or photo inkjet — home, shop counter, or small office.' },
  { id: 'laser', title: 'Laser / office', blurb: 'Mono or colour laser, including large departmental machines.' },
  { id: 'thermal', title: 'Thermal bill printer', blurb: '58 mm or 80 mm receipt printer — USB, Wi-Fi or Bluetooth.' },
  { id: 'dot_matrix', title: 'Dot matrix', blurb: 'Impact printer for multi-part stationery or older shop setups.' },
];

export const PAPER_OPTIONS: { id: PaperSize; title: string; hint: string }[] = [
  { id: 'a4', title: 'A4', hint: '210 × 297 mm — standard GST invoice' },
  { id: 'a5', title: 'A5', hint: '148 × 210 mm — compact invoice' },
  { id: 'letter', title: 'Letter', hint: '8.5 × 11 in' },
  { id: 'thermal_80', title: '80 mm thermal', hint: 'Shop bill / kitchen ticket' },
  { id: 'thermal_58', title: '58 mm thermal', hint: 'Pocket / mobile bill printer' },
];

export function paperCss(paper: PaperSize): string {
  switch (paper) {
    case 'thermal_58':
      return `@page{size:58mm auto;margin:2mm}body{width:58mm!important;max-width:58mm!important;margin:0 auto;font-size:10px}`;
    case 'thermal_80':
      return `@page{size:80mm auto;margin:2mm}body{width:80mm!important;max-width:80mm!important;margin:0 auto;font-size:11px}`;
    case 'a5':
      return `@page{size:A5;margin:10mm}body{max-width:148mm;margin:0 auto}`;
    case 'letter':
      return `@page{size:letter;margin:12mm}body{max-width:8.5in;margin:0 auto}`;
    default:
      return `@page{size:A4;margin:12mm}body{max-width:210mm;margin:0 auto}`;
  }
}

export function isThermalPaper(paper: PaperSize): boolean {
  return paper === 'thermal_58' || paper === 'thermal_80';
}

function uid(): string {
  return `ptr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadPrinters(): PrinterProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrinterProfile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePrinters(list: PrinterProfile[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDefaultPrinter(): PrinterProfile | null {
  const list = loadPrinters();
  return list.find((p) => p.isDefault) ?? list[0] ?? null;
}

export function upsertPrinter(input: Omit<PrinterProfile, 'id' | 'createdAt'> & { id?: string }): PrinterProfile {
  const list = loadPrinters();
  const existing = input.id ? list.find((p) => p.id === input.id) : undefined;
  const profile: PrinterProfile = {
    ...existing,
    ...input,
    id: existing?.id ?? input.id ?? uid(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  let next = existing ? list.map((p) => (p.id === profile.id ? profile : p)) : [...list, profile];
  if (profile.isDefault) {
    next = next.map((p) => ({ ...p, isDefault: p.id === profile.id }));
  } else if (!next.some((p) => p.isDefault) && next.length > 0) {
    next[0] = { ...next[0], isDefault: true };
  }
  savePrinters(next);
  return profile;
}

export function deletePrinter(id: string): void {
  const next = loadPrinters().filter((p) => p.id !== id);
  if (next.length && !next.some((p) => p.isDefault)) next[0].isDefault = true;
  savePrinters(next);
}

export function setDefaultPrinter(id: string): void {
  savePrinters(loadPrinters().map((p) => ({ ...p, isDefault: p.id === id })));
}

export function connectionLabel(c: PrinterConnection): string {
  return CONNECTION_OPTIONS.find((o) => o.id === c)?.title ?? c;
}

export function kindLabel(k: PrinterKind): string {
  return KIND_OPTIONS.find((o) => o.id === k)?.title ?? k;
}

export function paperLabel(p: PaperSize): string {
  return PAPER_OPTIONS.find((o) => o.id === p)?.title ?? p;
}

export function bluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function serialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

const BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
];

type BluetoothNav = Navigator & {
  bluetooth?: {
    requestDevice(opts: Record<string, unknown>): Promise<BluetoothDeviceLike>;
    getDevices?: () => Promise<BluetoothDeviceLike[]>;
  };
};

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGattServerLike>;
  };
}

interface BluetoothRemoteGattServerLike {
  getPrimaryServices(): Promise<BluetoothRemoteGattServiceLike[]>;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGattServiceLike>;
  disconnect(): void;
}

interface BluetoothRemoteGattServiceLike {
  getCharacteristics(): Promise<BluetoothRemoteGattCharacteristicLike[]>;
}

interface BluetoothRemoteGattCharacteristicLike {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
}

type SerialNav = Navigator & {
  serial?: {
    requestPort(): Promise<SerialPortLike>;
  };
};

interface SerialPortLike {
  readable: ReadableStream | null;
  writable: WritableStream | null;
  open(opts: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

async function findWriteCharacteristic(
  server: BluetoothRemoteGattServerLike,
): Promise<BluetoothRemoteGattCharacteristicLike | null> {
  const services = await server.getPrimaryServices().catch(async () => {
    const found: BluetoothRemoteGattServiceLike[] = [];
    for (const uuid of BLE_SERVICES) {
      try {
        found.push(await server.getPrimaryService(uuid));
      } catch {
        /* try next */
      }
    }
    return found;
  });
  for (const service of services) {
    const chars = await service.getCharacteristics().catch(() => []);
    const writable = chars.find((c) => c.properties.writeWithoutResponse || c.properties.write);
    if (writable) return writable;
  }
  return null;
}

export async function pairBluetoothPrinter(): Promise<{ id: string; name: string }> {
  const bt = (navigator as BluetoothNav).bluetooth;
  if (!bt) throw new Error('Bluetooth is not available in this browser. Use Chrome on Android, or pair the printer in phone settings and print from the system dialog.');
  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });
  if (!device.gatt) throw new Error('This Bluetooth device does not support a printer connection from the browser.');
  const server = await device.gatt.connect();
  const characteristic = await findWriteCharacteristic(server);
  if (!characteristic) {
    server.disconnect();
    throw new Error('Connected, but this printer does not expose a writable Bluetooth service. Pair it in phone settings and use Print via system dialog.');
  }
  server.disconnect();
  return { id: device.id, name: device.name || 'Bluetooth printer' };
}

async function writeChunks(write: (chunk: Uint8Array) => Promise<void>, bytes: Uint8Array): Promise<void> {
  const size = 180;
  for (let i = 0; i < bytes.length; i += size) {
    await write(bytes.slice(i, i + size));
    await new Promise((r) => setTimeout(r, 20));
  }
}

export async function sendBluetoothBytes(bytes: Uint8Array, preferredId?: string): Promise<void> {
  const bt = (navigator as BluetoothNav).bluetooth;
  if (!bt) throw new Error('Bluetooth is not available in this browser.');

  let device: BluetoothDeviceLike | undefined;
  if (preferredId && bt.getDevices) {
    const known = await bt.getDevices();
    device = known.find((d) => d.id === preferredId);
  }
  if (!device) {
    device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_SERVICES,
    });
  }
  if (!device.gatt) throw new Error('Printer is not ready. Turn it on and try again.');
  const server = await device.gatt.connect();
  try {
    const characteristic = await findWriteCharacteristic(server);
    if (!characteristic) throw new Error('Could not find a writable Bluetooth channel on this printer.');
    const write = async (chunk: Uint8Array) => {
      const payload: BufferSource = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(payload);
      else await characteristic.writeValue(payload);
    };
    await writeChunks(write, bytes);
  } finally {
    server.disconnect();
  }
}

export async function sendSerialBytes(bytes: Uint8Array): Promise<void> {
  const serial = (navigator as SerialNav).serial;
  if (!serial) throw new Error('USB serial printing needs Chrome or Edge on a computer.');
  const port = await serial.requestPort();
  await port.open({ baudRate: 9600 });
  try {
    if (!port.writable) throw new Error('USB port is not writable.');
    const writer = port.writable.getWriter();
    await writer.write(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    writer.releaseLock();
  } finally {
    await port.close().catch(() => undefined);
  }
}

function escPosBytes(lines: string[], paper: PaperSize): Uint8Array {
  const width = paper === 'thermal_58' ? 32 : 48;
  const out: number[] = [0x1b, 0x40]; // init
  const enc = (s: string) => {
    const text = s.length > width ? s.slice(0, width) : s;
    for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
    out.push(0x0a);
  };
  enc('');
  for (const line of lines) enc(line);
  enc('');
  out.push(0x1d, 0x56, 0x41, 0x10); // partial cut
  return Uint8Array.from(out);
}

export interface ReceiptLine {
  description: string;
  qty: string | number;
  amount: string | number;
}

export interface ReceiptPayload {
  company: string;
  gstin?: string;
  title: string;
  number: string;
  date: string;
  billTo: string;
  lines: ReceiptLine[];
  total: string;
  paid?: string;
  due?: string;
  footer?: string;
}

export function buildReceiptEscPos(payload: ReceiptPayload, paper: PaperSize): Uint8Array {
  const width = paper === 'thermal_58' ? 32 : 48;
  const dash = '-'.repeat(width);
  const row = (left: string, right: string) => {
    const space = Math.max(1, width - left.length - right.length);
    return `${left}${' '.repeat(space)}${right}`.slice(0, width);
  };
  const lines: string[] = [
    payload.company.toUpperCase(),
    payload.gstin ? `GSTIN: ${payload.gstin}` : '',
    dash,
    payload.title,
    `No: ${payload.number}`,
    `Date: ${payload.date}`,
    `Bill to: ${payload.billTo}`,
    dash,
  ];
  for (const l of payload.lines) {
    lines.push(String(l.description).slice(0, width));
    lines.push(row(`  ${l.qty}`, `Rs ${Number(l.amount).toFixed(2)}`));
  }
  lines.push(dash);
  lines.push(row('TOTAL', `Rs ${payload.total}`));
  if (payload.paid) lines.push(row('Paid', `Rs ${payload.paid}`));
  if (payload.due) lines.push(row('Due', `Rs ${payload.due}`));
  lines.push(dash);
  lines.push(payload.footer || 'Thank you');
  return escPosBytes(lines.filter((x) => x !== undefined), paper);
}

export function buildTestEscPos(printerName: string, paper: PaperSize): Uint8Array {
  return buildReceiptEscPos(
    {
      company: 'SMEBUZZ',
      title: 'PRINTER TEST',
      number: 'TEST',
      date: new Date().toLocaleString('en-IN'),
      billTo: printerName,
      lines: [{ description: 'Test slip', qty: 1, amount: '0' }],
      total: '0.00',
      footer: 'If you can read this, the printer is ready.',
    },
    paper,
  );
}

export async function printViaProfile(profile: PrinterProfile, html: string, receipt?: ReceiptPayload): Promise<'system' | 'bluetooth' | 'serial'> {
  if (profile.connection === 'bluetooth' && isThermalPaper(profile.paper) && receipt && bluetoothSupported()) {
    await sendBluetoothBytes(buildReceiptEscPos(receipt, profile.paper), profile.bluetoothId);
    return 'bluetooth';
  }
  if (profile.connection === 'local' && isThermalPaper(profile.paper) && receipt && serialSupported()) {
    const useSerial = window.confirm('Print over USB serial to this thermal printer? Click Cancel to use the normal print dialog instead.');
    if (useSerial) {
      await sendSerialBytes(buildReceiptEscPos(receipt, profile.paper));
      return 'serial';
    }
  }
  openSystemPrint(html, profile.paper);
  return 'system';
}

export function openSystemPrint(html: string, paper: PaperSize): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    throw new Error('Could not open a print window.');
  }
  const css = paperCss(paper);
  const injected = html.includes('</head>')
    ? html.replace('</head>', `<style id="smebuzz-paper">${css}</style></head>`)
    : `<style>${css}</style>${html}`;
  doc.open();
  doc.write(injected);
  doc.close();
  const run = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => {
      if (frame.parentNode) document.body.removeChild(frame);
    }, 1500);
  };
  if (frame.contentDocument?.readyState === 'complete') setTimeout(run, 250);
  else frame.onload = () => setTimeout(run, 250);
}

export function injectPaperCss(html: string, paper: PaperSize): string {
  const css = paperCss(paper);
  if (html.includes('</head>')) return html.replace('</head>', `<style id="smebuzz-paper">${css}</style></head>`);
  return `<style>${css}</style>${html}`;
}

export function printerSetupDone(): boolean {
  return loadPrinters().length > 0;
}
