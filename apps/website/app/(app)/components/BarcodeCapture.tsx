'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const close = useCallback(() => setOpen(false), []);

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
        // Prefer rear camera on phones; fall back to any camera if constrained start fails.
        const boxW = Math.min(320, typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.85) : 280);
        const config = { fps: 15, qrbox: { width: boxW, height: Math.round(boxW * 0.55) }, aspectRatio: 1.333 };
        try {
          await scanner.start(
            { facingMode: { exact: 'environment' } },
            config,
            (text) => {
              if (cancelled || taken.current) return;
              const code = String(text || '').trim();
              if (!code) return;
              taken.current = true;
              onDetectedRef.current(code);
              setOpen(false);
            },
            () => undefined,
          );
        } catch {
          if (cancelled) return;
          await scanner.start(
            { facingMode: 'environment' },
            config,
            (text) => {
              if (cancelled || taken.current) return;
              const code = String(text || '').trim();
              if (!code) return;
              taken.current = true;
              onDetectedRef.current(code);
              setOpen(false);
            },
            () => undefined,
          );
        }
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
  }, [open, readerId]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50 min-h-[44px] ${className}`}
        title="Scan barcode with phone camera — product adds to cart"
      >
        <Camera className="h-4 w-4" />
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex flex-col" role="dialog" aria-modal="true" aria-label="Scan barcode">
          <div className="flex items-center justify-between px-4 py-3 text-white safe-pt">
            <p className="text-sm font-semibold">Scan barcode — adds to cart</p>
            <button type="button" onClick={close} className="rounded-full p-2 hover:bg-white/10 min-touch" aria-label="Close scanner">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 px-4 pb-6">
            <div id={readerId} className="mx-auto w-full max-w-md overflow-hidden rounded-xl bg-black [&_video]:!max-h-[70vh] [&_video]:object-cover" />
            {err && <p className="mt-3 text-center text-sm text-amber-200">{err}</p>}
            <p className="mt-3 text-center text-xs text-white/70">Hold steady over EAN, UPC, Code 128 or QR. Product is added to the cart when read.</p>
          </div>
        </div>
      )}
    </>
  );
}
