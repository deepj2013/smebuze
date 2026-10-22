'use client';

import { useEffect, useRef } from 'react';

export type PayuCheckoutPayload = {
  action: string;
  method: 'POST';
  fields: Record<string, string>;
};

/** Auto-submit hidden form to PayU hosted checkout. */
export default function PayuCheckoutForm({ checkout }: { checkout: PayuCheckoutPayload | null | undefined }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!checkout?.action || !checkout.fields) return;
    formRef.current?.submit();
  }, [checkout]);

  if (!checkout?.action || !checkout.fields) return null;

  return (
    <form ref={formRef} method={checkout.method} action={checkout.action} className="hidden">
      {Object.entries(checkout.fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}
