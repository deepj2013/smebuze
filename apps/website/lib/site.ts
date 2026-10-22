export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://smebuze.com').replace(/\/$/, '');
export const SITE_NAME = 'SMEBUZE';

/** Short line under the logo / social cards */
export const SITE_TAGLINE =
  'GST billing, stock and accounts for Indian MSMEs — shaped to how each shop actually sells';

/** Default meta description (≤160 chars preferred) */
export const SITE_DESCRIPTION =
  'GST invoice software for Indian shops & contractors. Invoice Lite from ₹200/mo, full ERP from ₹1,599. PayU checkout, 7-day free trial, print on USB/Wi-Fi/Bluetooth.';

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
  'invoice software for contractors India',
  'billing software for shops',
  'MSME billing software',
  'restaurant POS India',
  'retail POS software',
  'inventory software India',
  'wholesale billing software',
  'PayU billing integration',
  'Tally style invoice print',
  'SMEBUZE',
  'smebuze',
] as const;

export const SITE_FAQS: { question: string; answer: string }[] = [
  {
    question: 'What is SMEBUZE?',
    answer:
      'SMEBUZE is cloud GST billing and workspace software built for Indian MSMEs. Choose your shop type at signup — restaurant floor, retail counter, trading desk, or Invoice Lite for contractors — and you only see the screens you need.',
  },
  {
    question: 'What is Invoice Lite and who is it for?',
    answer:
      'Invoice Lite is for freelancers, contractors and small firms that mainly need customers, items, GST invoices, estimates and print — without POS or full purchase modules. It costs ₹200 per month or ₹1,800 per year after the free trial.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Every workspace gets a full 7-day trial with no card required. After the trial, pay online with PayU (UPI, card, netbanking) or upload a bank/UPI proof if your admin enables manual pay.',
  },
  {
    question: 'How much does SMEBUZE cost?',
    answer:
      'Invoice Lite is ₹200/month or ₹1,800/year. Starter is ₹1,599/month, Growth ₹2,599/month and Business ₹4,599/month (list prices shown on the homepage). Pay yearly on ERP plans and save an extra 15%. Custom packs are quoted on request.',
  },
  {
    question: 'Does SMEBUZE support GST invoices and HSN?',
    answer:
      'Yes. Quotations, orders and invoices are GST-ready with HSN/SAC, tax and printable bills in Tally/Busy-style layouts on Invoice Lite. Stock, purchase and reports stay in the same workspace on full ERP plans.',
  },
  {
    question: 'Can I print bills on USB, Wi-Fi or Bluetooth printers?',
    answer:
      'Yes. Add USB, Wi-Fi, internet/AirPrint or Bluetooth thermal printers in Organization → Printers. Use A4/A5 for office printers and 58 mm or 80 mm for counter bill printers, including from a phone.',
  },
  {
    question: 'Which businesses can use SMEBUZE?',
    answer:
      'Dine-in restaurants, sweet shops, kirana and garment stores, pharmacies, salons, coaching institutes, hotels, trading desks, and Invoice Lite for consultants and service businesses. Each type opens a tailored module set.',
  },
  {
    question: 'Is my shop data private?',
    answer:
      'Yes. Each business has its own isolated workspace. Catalog, invoices, leads and books belong to that tenant only. Roles control what staff can see.',
  },
];
