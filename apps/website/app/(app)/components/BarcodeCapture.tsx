'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

type Props = {
  onDetected: (code: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export default function BarcodeCapture({ onDetected, label = 'Camera', className = '', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const readerId = `bc-${useId().replace(/:/g, '')}`;
  const scannerRef = useRef<{ stop: () => Promise<unknown>; clear: () => unknown } | null>(null);
  const taken = useRef(false);

  useEffect(() => {
    if (!open) return;
    taken.current = false;
    setErr(null);
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        const scanner = new Html5Qrcode(readerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
          useBarCodeDetectorIfSupported: true,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 280, height: 160 } },
          (text) => {
            if (cancelled || taken.current) return;
            const code = String(text || '').trim();
            if (!code) return;
            taken.current = true;
            onDetected(code);
            setOpen(false);
          },
          () => undefined,
        );
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErr(
          /permission|notallowed|denied/i.test(msg)
            ? 'Camera permission was denied. Allow camera in the browser, or type the barcode.'
            : 'Camera could not start. Use HTTPS or localhost, allow the camera, and try again. A USB scanner still works.',
        );
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => undefined);
      }
    };
  }, [open, readerId, onDetected]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 min-h-[44px] ${className}`}
        title="Scan with phone camera"
      >
        <Camera className="h-4 w-4" />
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex flex-col" role="dialog" aria-modal="true" aria-label="Scan barcode">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">Point the camera at the barcode</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10 min-touch" aria-label="Close scanner">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 px-4 pb-6">
            <div id={readerId} className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-black" />
            {err && <p className="mt-3 text-center text-sm text-amber-200">{err}</p>}
            <p className="mt-3 text-center text-xs text-white/70">EAN, UPC, Code 128 and QR work. USB readers do not need the camera.</p>
          </div>
        </div>
      )}
    </>
  );
}
