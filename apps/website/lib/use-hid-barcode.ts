'use client';

import { useEffect } from 'react';

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return type !== 'button' && type !== 'submit' && type !== 'checkbox' && type !== 'radio' && type !== 'hidden';
  }
  return false;
}

/**
 * USB / Bluetooth barcode readers act as a keyboard: they type the code very fast and send Enter.
 * When the search box is focused, the input's own onKeyDown handles that.
 * This hook catches scans while focus is on the cart, payment buttons, etc.
 */
export function useHidBarcode(onScan: (code: string) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let buffer = '';
    let lastAt = 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const now = Date.now();
      if (e.key === 'Enter') {
        if (buffer.length >= 4 && now - lastAt < 80) {
          e.preventDefault();
          onScan(buffer);
        }
        buffer = '';
        return;
      }
      if (e.key.length !== 1) return;
      if (now - lastAt > 50) buffer = '';
      buffer += e.key;
      lastAt = now;
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onScan, enabled]);
}
