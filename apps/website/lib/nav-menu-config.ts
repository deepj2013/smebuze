/** Stable keys for tenant menu show/hide. Stored in settings.nav_hidden. */

export type NavMenuNode = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

export function navKey(item: { label: string; href?: string }): string {
  if (item.href) {
    const path = item.href.split('?')[0];
    return `item:${path}`;
  }
  return `menu:${item.label}`;
}

/** Keys that must stay available so shop admins can always open day-to-day org screens. */
export const NAV_LOCKED_KEYS = new Set([
  'menu:Organization',
  'item:/organization/companies',
  'item:/organization/users',
  'item:/help',
  'menu:Admin',
  'item:/admin/tenants',
]);

/**
 * Platform (universal) admin configures shop menus under Admin → Tenants → Configure.
 * Tenants must not see Setup / Menus self-serve chrome.
 */
export const PLATFORM_ONLY_NAV_KEYS = new Set([
  'item:/onboarding',
  'item:/organization/menus',
]);

/** Drop Setup + Menus from any tenant sidebar (universal admin owns those). */
export function stripPlatformOnlyNavItems<
  T extends { label: string; href?: string; children?: { label: string; href: string; permission?: string }[] },
>(items: T[]): T[] {
  return items
    .map((item) => {
      const key = navKey(item);
      if (PLATFORM_ONLY_NAV_KEYS.has(key)) return null;
      if (item.children?.length) {
        const children = item.children.filter((c) => !PLATFORM_ONLY_NAV_KEYS.has(navKey(c)));
        if (children.length === 0) return null;
        return { ...item, children };
      }
      return item;
    })
    .filter(Boolean) as T[];
}

/** Full catalog for the configuration screen (all shop types). */
export const NAV_MENU_CATALOG: NavMenuNode[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Billing counter', href: '/pos' },
  { label: 'Manage shop', href: '/pos/manage' },
  { label: 'Waiter', href: '/pos/waiter' },
  { label: 'Kitchen', href: '/pos/kitchen' },
  { label: 'Restaurant admin', href: '/pos/floor' },
  {
    label: 'CRM',
    children: [
      { label: 'Leads & enquiries', href: '/crm/leads' },
      { label: 'Customers', href: '/crm/customers' },
      { label: 'Sales pipeline', href: '/crm/pipeline' },
      { label: 'Follow-up board', href: '/crm/follow-up-board' },
      { label: 'Campaigns', href: '/crm/campaigns' },
      { label: 'Lead hub', href: '/crm/lead-hub' },
    ],
  },
  {
    label: 'Sales',
    children: [
      { label: 'Invoices', href: '/sales/invoices' },
      { label: 'Party-wise invoices', href: '/sales/invoices/parties' },
      { label: 'Pending receivables', href: '/sales/invoices/pending' },
      { label: 'Receive payment', href: '/sales/invoices/receive' },
      { label: 'Quotations', href: '/sales/quotations' },
      { label: 'Sales orders', href: '/sales/orders' },
      { label: 'Portal orders', href: '/sales/portal-orders' },
      { label: 'Delivery challans', href: '/sales/delivery-challans' },
      { label: 'Credit notes', href: '/sales/credit-notes' },
      { label: 'Debit notes', href: '/sales/debit-notes' },
      { label: 'Recurring invoices', href: '/sales/recurring-invoices' },
    ],
  },
  {
    label: 'Purchase',
    children: [
      { label: 'Vendors', href: '/purchase/vendors' },
      { label: 'Orders', href: '/purchase/orders' },
      { label: 'GRNs', href: '/purchase/grns' },
      { label: 'Debit notes', href: '/purchase/debit-notes' },
      { label: 'Payables', href: '/purchase/payables' },
    ],
  },
  {
    label: 'Inventory',
    children: [
      { label: 'Categories', href: '/inventory/categories' },
      { label: 'Items', href: '/inventory/items' },
      { label: 'Public catalog', href: '/catalog' },
      { label: 'Warehouses', href: '/inventory/warehouses' },
      { label: 'Stock', href: '/inventory/stock' },
      { label: 'Receive stock', href: '/inventory/stock/receive' },
      { label: 'Stock transfers', href: '/inventory/stock-transfers' },
      { label: 'Barcode labels', href: '/inventory/labels' },
      { label: 'Item upload', href: '/bulk-upload' },
    ],
  },
  {
    label: 'Accounting',
    children: [
      { label: 'Chart of accounts', href: '/accounting/coa' },
      { label: 'Journal', href: '/accounting/journal' },
      { label: 'Bank reconciliation', href: '/accounting/bank-reconciliation' },
    ],
  },
  {
    label: 'Staff & Payroll',
    children: [
      { label: 'Employees', href: '/hr/employees' },
      { label: 'Attendance', href: '/hr/attendance' },
      { label: 'Leaves', href: '/hr/leaves' },
      { label: 'Payroll & slips', href: '/hr/payroll' },
    ],
  },
  {
    label: 'Fleet & Trips',
    children: [
      { label: 'Vehicles', href: '/transport/vehicles' },
      { label: 'Document renewals', href: '/transport/renewals' },
      { label: 'Trips', href: '/transport/trips' },
      { label: 'Profit by vehicle / party', href: '/transport/profit' },
    ],
  },
  {
    label: 'Service',
    children: [
      { label: 'Tickets', href: '/service/tickets' },
      { label: 'AMC contracts', href: '/service/amc' },
    ],
  },
  { label: 'Bills', href: '/sales/invoices' },
  { label: 'Reports', href: '/reports' },
  { label: 'Store reports', href: '/reports/department' },
  { label: 'Customer ledger', href: '/reports?report=customer-ledger' },
  { label: 'GSTR-1', href: '/reports/gstr-1' },
  { label: 'GSTR-2A', href: '/reports/gstr-2a' },
  { label: 'Bulk upload', href: '/bulk-upload' },
  { label: 'Help', href: '/help' },
  {
    label: 'Organization',
    children: [
      { label: 'Companies', href: '/organization/companies' },
      { label: 'Users', href: '/organization/users' },
      { label: 'Roles', href: '/organization/roles' },
      { label: 'Departments', href: '/organization/departments' },
      { label: 'Printers', href: '/organization/printers' },
      { label: 'Devices', href: '/organization/devices' },
      { label: 'Look & logo', href: '/organization/branding' },
      { label: 'Invoice series', href: '/organization/invoice-series' },
      { label: 'Public website', href: '/website' },
      { label: 'Channels', href: '/organization/channels' },
      { label: 'Scan to pay', href: '/organization/payments' },
      { label: 'SMEBUZE plan', href: '/billing' },
      { label: 'Support to SMEBUZE', href: '/organization/support' },
    ],
  },
];

export function parseNavHidden(settings?: Record<string, unknown> | null): string[] {
  const raw = settings?.nav_hidden;
  if (!Array.isArray(raw)) return [];
  return sanitizeNavHidden(raw);
}

/** Drop locked keys so admins cannot hide essential screens. */
export function sanitizeNavHidden(keys: unknown): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.filter(
    (k): k is string => typeof k === 'string' && k.length > 0 && !NAV_LOCKED_KEYS.has(k),
  );
}

export function isNavKeyHidden(hidden: string[], key: string): boolean {
  return hidden.includes(key);
}

export function filterNavByHidden<T extends { label: string; href?: string; children?: { label: string; href: string; permission?: string }[]; permission?: string; module?: string }>(
  items: T[],
  hidden: string[] | undefined,
): T[] {
  if (!hidden?.length) return items;
  const hide = new Set(hidden);
  return items
    .map((item) => {
      const key = navKey(item);
      if (hide.has(key) && !NAV_LOCKED_KEYS.has(key)) return null;
      if (item.children?.length) {
        const children = item.children.filter((c) => {
          const ck = navKey(c);
          return NAV_LOCKED_KEYS.has(ck) || !hide.has(ck);
        });
        if (children.length === 0) return null;
        return { ...item, children };
      }
      return item;
    })
    .filter(Boolean) as T[];
}
