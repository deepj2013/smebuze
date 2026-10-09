import { businessTypeMeta, isPosBusinessType } from './business-types';

export type GuideKind = 'ice_crest' | 'restaurant' | 'shop' | 'transport' | 'service' | 'desk';

export type GuideBlock = {
  id: string;
  title: string;
  intro: string;
  steps: Array<{ title: string; body: string; href?: string; link?: string }>;
  asks: Array<{ q: string; a: string }>;
};

export function guideKind(type: unknown): GuideKind {
  if (type === 'ice_crest') return 'ice_crest';
  if (type === 'dine_restaurant' || type === 'cafe') return 'restaurant';
  if (type === 'transport') return 'transport';
  if (type === 'hotel' || type === 'coaching' || type === 'services') return 'service';
  if (isPosBusinessType(type)) return 'shop';
  return 'desk';
}

function dailyFlow(kind: GuideKind, title: string): GuideBlock {
  if (kind === 'ice_crest') {
    return {
      id: 'day',
      title: 'A normal day at Ice Crest',
      intro: 'Follow this order. Stock comes in, a buyer asks for ice, you quote, they confirm, you bill, you deliver, they pay.',
      steps: [
        { title: '1. Bring stock in', body: 'After production or a purchase, open Stock Management → Stock inward / outward. Pick the ice SKU, type the quantity, and save it as inward. Physical stock goes up.', href: '/ice-crest/stock-movements', link: 'Open stock inward' },
        { title: '2. Take the enquiry', body: 'Website and WhatsApp enquiries land in CRM → Leads & enquiries. Call the person, note what they need, and move the lead along the pipeline.', href: '/crm/leads', link: 'Open leads' },
        { title: '3. Send a quotation', body: 'Sales & Billing → Quotations. Add the SKUs and rates. Mark it sent, then print it and share it.', href: '/sales/quotations', link: 'Open quotations' },
        { title: '4. Confirm the order', body: 'When they accept, create a sales order. Stock is reserved: available quantity drops, but the ice is still in the godown until you invoice.', href: '/sales/orders/new', link: 'New order' },
        { title: '5. Check what to produce', body: 'Production plan shows confirmed orders minus stock you can still sell, plus a safety buffer. Use it before the next run.', href: '/ice-crest/production-plan', link: 'Open production plan' },
        { title: '6. Make the tax invoice', body: 'Create the invoice from the order. GST, shipping and discount can be added. Stock outward happens when the invoice is saved. The original invoice number never changes later.', href: '/sales/invoices/new', link: 'New invoice' },
        { title: '7. Deliver', body: 'Sales & Billing → Delivery when the vehicle leaves. The invoice is still what the customer owes.', href: '/sales/delivery-challans', link: 'Open delivery' },
        { title: '8. Take the money', body: 'One bill: Payment tracking → Record payment. Several bills together: Receive payment. Put the amount once. It fills the oldest due bills first. You can change a line before saving.', href: '/sales/invoices/receive', link: 'Receive payment' },
        { title: '9. Send the ledger if they ask what is due', body: 'Customer ledger in the menu. Choose the customer, tap View, then Download ledger. In the print window choose Save as PDF and send that file.', href: '/reports?report=customer-ledger', link: 'Customer ledger' },
        { title: '10. Close the day', body: 'Dashboard shows sales, expenses and stock. Expenses is where you log production, diesel, and office costs.', href: '/ice-crest/dashboard', link: 'Dashboard' },
      ],
      asks: [
        { q: 'Where do website enquiries go?', a: 'CRM → Leads & enquiries. You do not type them again.' },
        { q: 'Does an order reduce the ice in the godown?', a: 'No. An order only reserves it. The quantity leaves stock when you make the invoice.' },
        { q: 'The customer paid three invoices with one UPI. Where do I enter it?', a: 'Sales & Billing → Receive payment. One amount, one date, one UTR. Save only when the full amount is applied.' },
      ],
    };
  }
  if (kind === 'restaurant') {
    return {
      id: 'day',
      title: `A normal day in your ${title.toLowerCase()}`,
      intro: 'Waiter takes the table, kitchen sees the ticket, cashier prints the bill. Credit customers are billed and paid later.',
      steps: [
        { title: '1. Open the floor', body: 'Waiter shows tables. Tap a table and add dishes. Send the ticket to the kitchen.', href: '/pos/waiter', link: 'Open waiter' },
        { title: '2. Kitchen', body: 'Kitchen shows tickets in the order they arrived. Mark a ticket done when the food goes out.', href: '/pos/kitchen', link: 'Open kitchen' },
        { title: '3. Bill and take money at the table', body: 'POS / Cashier settles the table with cash, UPI or card and prints the bill. Stock is not reduced for a restaurant.', href: '/pos', link: 'Open cashier' },
        { title: '4. A guest who pays later', body: 'Save the bill on their name. Later open Receive payment, pick that guest, and apply one payment across the open bills.', href: '/sales/invoices/receive', link: 'Receive payment' },
        { title: '5. See the day', body: 'Reports → Sales summary for what you billed and what is still due. Customer ledger if one guest wants their statement.', href: '/reports', link: 'Open reports' },
      ],
      asks: [
        { q: 'Where is the menu edited?', a: 'Restaurant admin and Manage shop / items. Prices on the counter come from those items.' },
        { q: 'A table walked out without paying.', a: 'Keep the bill. It stays under Bills and Pending until you record the payment or issue a credit note if you are writing it off.' },
      ],
    };
  }
  if (kind === 'shop') {
    return {
      id: 'day',
      title: `A normal day at your ${title.toLowerCase()}`,
      intro: 'Add what you sell once. At the counter, scan or tap, take money, and print the bill. Shops that track stock see quantity go down on each sale.',
      steps: [
        { title: '1. Add products', body: 'Manage shop or Products. Name, barcode, MRP, sale price and opening stock. On a phone, use the camera to fill the barcode. A USB scanner types into the barcode box.', href: '/inventory/items', link: 'Open products' },
        { title: '2. Receive a supplier delivery', body: 'Stock → receive quantity when a truck or carton arrives. Selling does not add stock; receiving does.', href: '/inventory/stock', link: 'Open stock' },
        { title: '3. Bill at the counter', body: 'Billing counter. Scan, search, or tap. Take cash, UPI or card. Print. The bill is saved under Bills.', href: '/pos', link: 'Open counter' },
        { title: '4. A regular who pays later', body: 'Put the bill on the customer’s name. When they pay one bill, use Record payment on that bill. When they pay three or four together, use Receive payment.', href: '/sales/invoices/receive', link: 'Receive payment' },
        { title: '5. End of day', body: 'Reports → Sales summary. Pending is what customers still owe. Download a customer ledger if someone asks for a statement.', href: '/reports', link: 'Open reports' },
      ],
      asks: [
        { q: 'The scanner does nothing.', a: 'Click the search or barcode box first, then scan. The scanner acts like a keyboard.' },
        { q: 'I sold the wrong item.', a: 'Do not delete a bill you already gave the customer if GST is involved. Issue a credit note for the return, then make a fresh bill if needed.' },
      ],
    };
  }
  if (kind === 'transport') {
    return {
      id: 'day',
      title: 'A normal day for trips and freight',
      intro: 'A trip is the job. The invoice is what the party owes. Diesel and hire go to expenses. Payroll is separate.',
      steps: [
        { title: '1. Keep vehicles ready', body: 'Fleet & Trips → Vehicles. Document renewals shows insurance, permit and fitness before they lapse.', href: '/transport/vehicles', link: 'Open vehicles' },
        { title: '2. Record the trip', body: 'Trips. Party, vehicle, route and freight. Print the LR from the trip when the driver needs paper.', href: '/transport/trips', link: 'Open trips' },
        { title: '3. Bill the party', body: 'Make a sales invoice for the freight. One party with several open bills pays through Receive payment.', href: '/sales/invoices/receive', link: 'Receive payment' },
        { title: '4. Diesel, toll, hire', body: 'Record those as expenses or vendor bills so profit by vehicle is honest.', href: '/transport/profit', link: 'Profit by vehicle' },
        { title: '5. What a party still owes', body: 'Customer ledger. Choose the party, View, Download ledger, Save as PDF.', href: '/reports?report=customer-ledger', link: 'Customer ledger' },
      ],
      asks: [
        { q: 'Where is the lorry receipt?', a: 'Open the trip and print the LR.' },
        { q: 'Driver salary?', a: 'Staff & Payroll, not on the trip. Trip profit should not be mixed with the salary slip.' },
      ],
    };
  }
  if (kind === 'service') {
    return {
      id: 'day',
      title: `A normal day for ${title}`,
      intro: 'People enquire, you follow up, you raise a fee or service invoice, they pay. There is no shop counter unless you also bill at a desk.',
      steps: [
        { title: '1. Save the person', body: 'CRM → Customers. Name, phone, GSTIN if they have one. Leads are people who have not become customers yet.', href: '/crm/customers', link: 'Open customers' },
        { title: '2. Follow up', body: 'Follow-up board is the list of who to call. Move them when they reply.', href: '/crm/follow-up-board', link: 'Follow-up board' },
        { title: '3. Raise the bill', body: 'Sales → Invoices. Pick the customer, add the fee or service lines, save and print.', href: '/sales/invoices/new', link: 'New invoice' },
        { title: '4. Collect', body: 'One invoice: Record payment. Several months together: Receive payment, one amount, oldest bill first.', href: '/sales/invoices/receive', link: 'Receive payment' },
        { title: '5. Send what they owe', body: 'Customer ledger → choose them → Download ledger → Save as PDF.', href: '/reports?report=customer-ledger', link: 'Customer ledger' },
      ],
      asks: [
        { q: 'They want a monthly bill without typing it again.', a: 'Sales → Recurring invoices. It prepares the next bill on the schedule you set.' },
        { q: 'We also sell a few products.', a: 'Add them under Items and put them on the same invoice as the service.' },
      ],
    };
  }
  return {
    id: 'day',
    title: `A normal day for ${title}`,
    intro: 'Quote, confirm, deliver, invoice, collect. Purchase and godown stock sit beside sales.',
    steps: [
      { title: '1. Customer and item exist first', body: 'Add the customer and the item before the first bill. Rates can differ by customer.', href: '/crm/customers', link: 'Open customers' },
      { title: '2. Quotation, then order', body: 'Quotation is the offer. Sales order is the confirmation. A delivery challan is the goods leaving. The invoice is the tax bill.', href: '/sales/quotations', link: 'Open quotations' },
      { title: '3. Invoice', body: 'Sales → Invoices → new. The number stays as printed. Later changes use a credit note or a debit note, not a rewritten invoice.', href: '/sales/invoices/new', link: 'New invoice' },
      { title: '4. Purchase', body: 'Vendor, purchase order, then GRN when goods arrive. Payables is what you still owe suppliers.', href: '/purchase/orders', link: 'Purchase orders' },
      { title: '5. Collect from customers', body: 'Pending receivables lists unpaid bills, earliest due first. Receive payment is for one customer paying several bills at once.', href: '/sales/invoices/receive', link: 'Receive payment' },
      { title: '6. Reports', body: 'Sales summary for the period. Customer ledger when one party wants pending and due on letterhead.', href: '/reports?report=customer-ledger', link: 'Customer ledger' },
    ],
    asks: [
      { q: 'What is the difference between challan and invoice?', a: 'A challan says goods moved. An invoice says money and GST. You can invoice a challan later, including a consolidated bill.' },
      { q: 'Where is godown stock?', a: 'Inventory → Stock. Transfers move quantity between warehouses.' },
    ],
  };
}

const MONEY: GuideBlock = {
  id: 'money',
  title: 'Invoices, dues and taking payment',
  intro: 'An invoice is the bill. Pending is what is still unpaid. A payment is money you actually received. Credit notes and debit notes change the bill without changing its number.',
  steps: [
    { title: 'Make a bill', body: 'Sales → Invoices → New (or the billing counter in a shop). Choose the customer, add lines, check GST, save, then print. A walk-in can stay as a cash customer.', href: '/sales/invoices', link: 'Open invoices' },
    { title: 'See who owes you', body: 'Pending receivables lists unpaid and partly paid bills, earliest due date first. Party-wise invoices groups the same customer together. Overdue means the due date has passed and money is still open.', href: '/sales/invoices/pending', link: 'Pending receivables' },
    { title: 'One bill, one payment', body: 'On that bill, or on Pending receivables, tap Record payment. Amount, date, mode (cash, UPI, bank, cheque) and reference. You cannot enter more than what is still due.', href: '/sales/invoices/pending', link: 'Record a payment' },
    { title: 'One payment for 3 or 4 bills', body: 'Sales → Receive payment. Choose the customer. Type the amount they paid once, plus date, mode and UTR or cheque number. The amount fills the oldest due bills first. Change any line if they asked you to clear a different bill. Save receipt only when the full amount is applied. Each bill then shows its own paid and pending, and they share one receipt.', href: '/sales/invoices/receive', link: 'Receive payment' },
    { title: 'The customer returned goods or you reduced the bill', body: 'Credit note. It lowers what they owe. A draft credit note does not change the balance. Only an issued credit note does. The original invoice number stays the same.', href: '/sales/credit-notes', link: 'Credit notes' },
    { title: 'You need to charge more on an old bill', body: 'Debit note. It raises what they owe after it is issued. Do not edit the old invoice to add the extra amount.', href: '/sales/debit-notes', link: 'Debit notes' },
    { title: 'They paid online', body: 'If Scan to pay is connected, the invoice can show a QR. The payment is capped at what is still due and will not be saved twice for the same reference.', href: '/organization/payments', link: 'Scan to pay' },
    { title: 'Status words you will see', body: 'Pending: nothing received. Partial: some money in, some still due. Paid: nothing left. Credit: they have paid more than the bill, usually after a credit note. Due date is when you expect the money. Overdue is past that date.' },
  ],
  asks: [
    { q: 'Can I delete an invoice after I sent it?', a: 'Prefer a credit note. Deleting hides it from normal lists, but a bill you already shared should be reversed with a credit note so the customer’s ledger still makes sense.' },
    { q: 'Why is the due amount different from the invoice total?', a: 'Credit notes reduce it. Debit notes increase it. Payments reduce what is left. The pending figure is total, plus issued debit notes, minus issued credit notes, minus payments.' },
    { q: 'I typed a payment on the wrong customer.', a: 'Receive payment refuses a mix of customers on one receipt. If a single payment was saved on the wrong bill, record it against the right bill and reverse the wrong one with your accountant before the return is filed.' },
    { q: 'The customer paid more than one bill but less than the full dues.', a: 'Type only what they paid. Oldest bills fill first. The last bill stays partial. Later bills stay pending. You can move amounts between lines before you save.' },
    { q: 'Where do I see the receipt afterwards?', a: 'Each invoice shows the payment on that invoice. The shared receipt is the same date, mode and reference on those bills.' },
  ],
};

const REPORTS: GuideBlock = {
  id: 'reports',
  title: 'Reports and the customer ledger',
  intro: 'Reports answer “how much” for a period. The customer ledger is the paper you send to one customer: their bills, what they paid, and what is still due, with your company name and logo.',
  steps: [
    { title: 'Open reports', body: 'Menu → Reports. Pick a report on the left (on a phone, use the Report list). Set dates if the report asks, then tap View.', href: '/reports', link: 'Open reports' },
    { title: 'Download one customer’s ledger', body: 'Menu → Customer ledger. Choose the customer (not All). Optionally choose the letterhead company if you have more than one. Tap View. You will see Amount due. Tap Download ledger. A print window opens. Choose Save as PDF, or print it. The PDF has your logo, legal name, address, phone, GSTIN, the customer’s bills, due dates, overdue marks, received, pending, running balance, and bank details if you saved them on the company.', href: '/reports?report=customer-ledger', link: 'Customer ledger' },
    { title: 'Same ledger from Invoice vs payment', body: 'Reports → Invoice vs payment. Beside each customer name is Download ledger. You can also click the customer or the invoice count to see each bill’s received and pending, then download.', href: '/reports', link: 'Invoice vs payment' },
    { title: 'Other reports as PDF', body: 'After you tap View, tap PDF. The print window uses the same company letterhead. Choose Save as PDF. CSV is the spreadsheet file, for Excel or a CA, on reports that have it.' },
    { title: 'Which report to open', body: 'Sales summary: invoiced, received, pending for the dates. Invoice vs payment: customer by customer. Ageing: how old the dues are. Purchase summary: what you ordered and still owe. HSN-wise GST summary: tax by HSN. P&L and Balance sheet: from journal entries. Vendor ledger: supplier side. GSTR-1: outward supplies for the month, with CSV and PDF. GSTR-2A: paste the file from the GST portal to compare with your purchase bills.' },
    { title: 'Company details on the PDF', body: 'Organization → Company. Fill legal name, GSTIN, address, phone, email and bank account. Organization → Look & logo for the logo. Those print on the ledger and on invoices.', href: '/organization/companies', link: 'Edit company' },
  ],
  asks: [
    { q: 'I do not see Download ledger.', a: 'Open Customer ledger in the left menu, or Reports and choose Customer ledger in the report list. Pick one customer and tap View. The button is next to View. On Invoice vs payment it sits under the customer’s name.' },
    { q: 'The PDF has no logo.', a: 'Add the logo under Organization → Look & logo, or on the company. Download the ledger again.' },
    { q: 'The ledger shows old paid bills too.', a: 'Yes. It is the full statement, with a clear Amount due at the top. Paid lines show zero pending.' },
    { q: 'Can I send this on WhatsApp?', a: 'Save as PDF from the print window, then attach that file in WhatsApp yourself.' },
    { q: 'GSTR-1 is not the same as the customer ledger.', a: 'GSTR-1 is for the GST return. The customer ledger is for the customer. Use both; they answer different questions.' },
  ],
};

const SETUP: GuideBlock = {
  id: 'setup',
  title: 'Set up the company once',
  intro: 'Do this before the first real bill. Staff can skip it if an owner already filled it in.',
  steps: [
    { title: 'Company', body: 'Name that customers know, legal name, GSTIN, full address, phone, email, FSSAI or MSME if they apply, and bank account for the payment block on bills.', href: '/organization/companies', link: 'Company' },
    { title: 'Logo and colours', body: 'Look & logo. The logo is what prints on invoices and on the customer ledger.', href: '/organization/branding', link: 'Look & logo' },
    { title: 'Invoice numbers', body: 'Invoice series is optional. Turn it on from a date if you want GST-style numbers such as INV/2627/0001. Bills already printed keep their old numbers. Until you turn it on, numbers stay as they are today. The same switch exists for credit notes, sales debit notes and purchase debit notes.', href: '/organization/invoice-series', link: 'Invoice series' },
    { title: 'Printer', body: 'Organization → Printers. USB, Wi-Fi, AirPrint or a small Bluetooth printer. Paper is usually 80mm or 58mm at a counter, A4 at a desk. If you skip this, the browser print box still works.', href: '/organization/printers', link: 'Printers' },
    { title: 'Staff logins', body: 'Organization → Users. Give each person their own login. Roles decide who can bill, who can only view, and who can change company settings.', href: '/organization/users', link: 'Users' },
    { title: 'What you see in the menu', body: 'Setup lets you change the shop type and which menus are on. The guide on this page follows the type you are using now.', href: '/onboarding', link: 'Setup' },
  ],
  asks: [
    { q: 'I changed the company name. Will old bills change?', a: 'New prints use the current company details. Keep the legal name accurate before you file GST.' },
    { q: 'Two branches?', a: 'Add branches under the company. Invoices can be raised for a branch. Reports can be filtered by company where the report offers that list.' },
  ],
};

const PEOPLE: GuideBlock = {
  id: 'people',
  title: 'Customers, leads and follow-up',
  intro: 'A lead is someone who asked. A customer is someone you can bill. Always bill in the customer’s name if you expect to collect later.',
  steps: [
    { title: 'Add a customer', body: 'Name, phone, email, GSTIN, address and credit limit. GSTIN is what makes a bill B2B on GSTR-1. Without it, the bill is treated as B2C.', href: '/crm/customers', link: 'Customers' },
    { title: 'Leads', body: 'People from the website, WhatsApp or a phone call. When they agree to buy, create the customer (or convert the lead) and then quote or invoice.', href: '/crm/leads', link: 'Leads' },
    { title: 'Follow-up', body: 'Follow-up board is who to call today. Write the note on the lead so the next person knows what was said.', href: '/crm/follow-up-board', link: 'Follow-up board' },
  ],
  asks: [
    { q: 'I billed “Cash” and now they want it in their company name.', a: 'If the bill is not shared yet, edit the customer on the bill. If it is already sent, credit-note it and raise a new bill in the right name.' },
    { q: 'Same person, two GSTINs.', a: 'Two customers. A ledger is per customer, so dues stay separate.' },
  ],
};

const STOCK: GuideBlock = {
  id: 'stock',
  title: 'Items and stock',
  intro: 'Sell only items you have created. Quantity on a bill is in whole pieces.',
  steps: [
    { title: 'Item', body: 'Name, category, sale price, MRP, GST rate, HSN, barcode. Opening stock is what you have on day one.', href: '/inventory/items', link: 'Items' },
    { title: 'Receive stock', body: 'When goods arrive, receive them. A sale reduces stock for a shop. A restaurant bill does not reduce stock. An Ice Crest invoice posts stock outward.', href: '/inventory/stock', link: 'Stock' },
    { title: 'Low stock', body: 'Stock on hand is on the Stock screen and on stock reports. Reorder before you promise a delivery you cannot make.' },
  ],
  asks: [
    { q: 'Barcode will not scan.', a: 'Focus the barcode field, then scan. On a phone, use Scan and the camera.' },
    { q: 'Price is wrong for one customer only.', a: 'Customer-specific rates apply when you pick that customer on an invoice. The master price stays for everyone else.' },
  ],
};

const PURCHASE: GuideBlock = {
  id: 'purchase',
  title: 'Vendors and what you owe them',
  intro: 'This is the opposite of a customer bill. You are the buyer.',
  steps: [
    { title: 'Vendor', body: 'Purchase → Vendors. Name and GSTIN. A GSTIN lets the bill sit in GSTR-2A matching.', href: '/purchase/vendors', link: 'Vendors' },
    { title: 'Order and receive', body: 'Purchase order is what you asked for. GRN is what arrived. Payables is what you still have to pay the vendor.', href: '/purchase/payables', link: 'Payables' },
    { title: 'Vendor charged extra or you are returning', body: 'Purchase debit note reduces what you owe the vendor. It does not rewrite their invoice number.', href: '/purchase/debit-notes', link: 'Purchase debit notes' },
  ],
  asks: [
    { q: 'Where do I put rent, diesel or tea?', a: 'If there is a vendor GST bill, record it as a purchase or expense with the GSTIN. Plain cash expenses go to the expense screen your menu shows.' },
  ],
};

const GST: GuideBlock = {
  id: 'gst',
  title: 'GST, in everyday words',
  intro: 'You do not file the return inside this screen. You prepare the numbers, then your CA or the GST portal files them.',
  steps: [
    { title: 'On each bill', body: 'HSN, GST rate, and whether it is CGST+SGST (same state) or IGST (other state) come from the item and the customer’s place. Check the print before you hand it over.' },
    { title: 'GSTR-1', body: 'Reports → GSTR-1. Pick the return month. B2B rows are customers with a GSTIN. B2C are the rest. Credit notes and debit notes are listed. Export CSV for the portal, or PDF to read.', href: '/reports/gstr-1', link: 'GSTR-1' },
    { title: 'GSTR-2A', body: 'Download 2A from the GST portal, paste it on the GSTR-2A screen, and see which supplier bills are missing in your books.', href: '/reports/gstr-2a', link: 'GSTR-2A' },
  ],
  asks: [
    { q: 'A credit note is not reducing GSTR-1.', a: 'Only an issued credit note is counted. A draft is a worksheet and does not change tax or the customer’s due.' },
    { q: 'Invoice number series.', a: 'Turn it on under Invoice series from the date your CA wants consecutive numbers. Older bills stay as they were.' },
  ],
};

const STAFF: GuideBlock = {
  id: 'staff',
  title: 'Staff, payroll and printers',
  intro: 'Only owners usually open payroll. Counter staff need the billing screen and this guide.',
  steps: [
    { title: 'Employees', body: 'Add the person, then attendance, leave, and payroll slips. A slip is not a sales invoice.', href: '/hr/employees', link: 'Employees' },
    { title: 'Printer trouble', body: 'If nothing prints, use the browser print dialog from the invoice and pick the printer there. Paper size is on Organization → Printers.', href: '/organization/printers', link: 'Printers' },
    { title: 'Phone', body: 'The menu opens from the top. Scroll inside the menu to reach Reports, Customer ledger and Logout. Buttons are large enough to tap. The bottom bar is for the main jobs.' },
  ],
  asks: [
    { q: 'I cannot see a menu someone else can see.', a: 'Your role does not include it. An owner can change roles under Organization → Roles, or give you a different role on your user.' },
    { q: 'Forgot password.', a: 'Use Forgot password on the login page, or ask an owner to set a new one on your user.' },
  ],
};

export function guideFor(type: unknown): { heading: string; lede: string; sections: GuideBlock[] } {
  const meta = businessTypeMeta(type === 'ice_crest' ? 'trading' : type);
  const kind = guideKind(type);
  const heading = type === 'ice_crest' ? 'Ice Crest' : meta.title;
  const lede = type === 'ice_crest'
    ? 'This is the staff manual for Ice Crest: enquiries, stock, bills, payments and the customer ledger. It is written for the person at the desk, not for a programmer.'
    : `This manual is for ${heading}. It follows the screens in your menu: how to enter work, how to take payment, and how to download reports.`;
  return {
    heading,
    lede,
    sections: [dailyFlow(kind, heading), MONEY, REPORTS, PEOPLE, STOCK, PURCHASE, GST, SETUP, STAFF],
  };
}
