export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://smebuze.com').replace(/\/$/, '');
export const SITE_NAME = 'SMEBUZE';

/** Short line under the logo / social cards */
export const SITE_TAGLINE =
  'GST billing, stock and accounts for Indian MSMEs — shaped to how each shop actually sells';

/** Default meta description (≤160 chars preferred) */
export const SITE_DESCRIPTION =
  'SMEBUZE is GST-ready billing software for Indian MSMEs. Restaurant floor, retail POS or trading desk — one login, printers you already own, 7-day free trial.';

export const SUPPORT_EMAIL = 'support@smebuze.com';
export const LEGAL_EMAIL = 'privacy@smebuze.com';

/** Public mission — what we exist to do */
export const SITE_MISSION =
  'Give every Indian shop and small firm a workspace that matches how they sell — not a giant ERP they have to fight.';

/** Public vision — where we are going */
export const SITE_VISION =
  'An India where the neighbourhood restaurant, kirana, salon and wholesale desk all run GST bills, stock and customers from one honest login — on the printer and phone they already own.';

/** Organic SEO keyword set (natural language, not stuffed) */
export const SITE_KEYWORDS = [
  'GST billing software India',
  'GST invoice software',
  'MSME ERP',
  'billing software for shops',
  'restaurant POS India',
  'retail POS software',
  'inventory software India',
  'wholesale billing software',
  'SMEBUZE',
  'smebuze',
] as const;

export const SITE_FAQS: { question: string; answer: string }[] = [
  {
    question: 'What is SMEBUZE?',
    answer:
      'SMEBUZE is online GST billing and workspace software for Indian MSMEs. At signup you choose your shop type — restaurant, kirana, pharmacy, salon, trading desk and more — and we open only the screens that shop needs: floor and kitchen, counter POS, or full quotations, purchase and stock.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Every new workspace starts with a full 7-day free trial. No card is required to begin. After the trial you can stay on Starter, Growth or Business, or ask us for a custom pack.',
  },
  {
    question: 'Does SMEBUZE support GST invoices and HSN?',
    answer:
      'Yes. Quotations, orders and invoices are GST-ready with HSN/SAC, tax and printable bills. Stock, purchase and reports stay in the same workspace so the bill matches what left the shop.',
  },
  {
    question: 'Can I print bills on USB, Wi-Fi or Bluetooth printers?',
    answer:
      'Yes. SMEBUZE does not lock you to one printer brand. Add USB, Wi-Fi, internet/AirPrint or Bluetooth thermal printers in Organization → Printers. Use A4/A5 for office printers and 58 mm or 80 mm for counter bill printers, including from a phone.',
  },
  {
    question: 'Which businesses can use SMEBUZE?',
    answer:
      'Dine-in restaurants and cafes, sweet shops and bakeries, garment and kirana stores, pharmacies, hardware and electronics shops, salons and clinics, coaching institutes, hotels, trading and manufacturing desks, and industry packs such as HORECA wholesale. Each type gets a tailored module set.',
  },
  {
    question: 'Is my shop data private and tenant-separate?',
    answer:
      'Yes. Each business gets its own workspace (tenant). Catalog, orders, leads and books belong to that shop only. Roles and permissions control what staff can see.',
  },
];
