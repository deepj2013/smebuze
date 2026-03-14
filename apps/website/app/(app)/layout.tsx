'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import GlobalSearch from './components/GlobalSearch';
import { ToastProvider } from './components/ToastContext';
import {
  LayoutDashboard,
  Settings,
  Users,
  UserPlus,
  Megaphone,
  FileText,
  ShoppingCart,
  Truck,
  Receipt,
  Package,
  Warehouse,
  Boxes,
  BookOpen,
  BookMarked,
  Building2,
  BarChart3,
  Upload,
  ChevronDown,
  ChevronRight,
  Layers,
  Search,
  ListOrdered,
  Wallet,
  FileCheck,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const MODULES = ['dashboard', 'onboarding', 'crm', 'sales', 'purchase', 'inventory', 'accounting', 'hr', 'service', 'organization', 'reports', 'bulk_upload'] as const;

const nav: Array<{
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: (typeof MODULES)[number];
  permission?: string;
  children?: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }>; permission?: string }>;
}> = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard', permission: 'reports.view' },
  { label: 'Setup', href: '/onboarding', icon: Settings, module: 'onboarding' },
  {
    label: 'CRM',
    icon: Users,
    module: 'crm',
    permission: 'crm.lead.view',
    children: [
      { label: 'Leads', href: '/crm/leads', icon: UserPlus, permission: 'crm.lead.view' },
      { label: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customer.view' },
      { label: 'Pipeline', href: '/crm/pipeline', icon: LayoutDashboard, permission: 'crm.lead.view' },
      { label: 'Follow-up board', href: '/crm/follow-up-board', icon: Users, permission: 'crm.lead.view' },
      { label: 'Campaigns', href: '/crm/campaigns', icon: Megaphone, permission: 'crm.lead.view' },
    ],
  },
  {
    label: 'Sales',
    icon: FileText,
    module: 'sales',
    permission: 'sales.invoice.view',
    children: [
      { label: 'Invoices', href: '/sales/invoices', icon: Receipt, permission: 'sales.invoice.view' },
      { label: 'Pending receivables', href: '/sales/invoices/pending', icon: Receipt, permission: 'sales.invoice.view' },
      { label: 'Quotations', href: '/sales/quotations', icon: FileText, permission: 'sales.quotation.view' },
      { label: 'Sales orders', href: '/sales/orders', icon: FileText, permission: 'sales.order.view' },
      { label: 'Delivery challans', href: '/sales/delivery-challans', icon: FileText, permission: 'sales.invoice.view' },
      { label: 'Credit notes', href: '/sales/credit-notes', icon: Receipt, permission: 'sales.invoice.view' },
      { label: 'Recurring invoices', href: '/sales/recurring-invoices', icon: FileText, permission: 'sales.invoice.view' },
    ],
  },
  {
    label: 'Purchase',
    icon: ShoppingCart,
    module: 'purchase',
    permission: 'purchase.vendor.view',
    children: [
      { label: 'Vendors', href: '/purchase/vendors', icon: Truck, permission: 'purchase.vendor.view' },
      { label: 'Orders', href: '/purchase/orders', icon: FileText, permission: 'purchase.order.view' },
      { label: 'GRNs', href: '/purchase/grns', icon: FileText, permission: 'purchase.order.view' },
      { label: 'Debit notes', href: '/purchase/debit-notes', icon: Receipt, permission: 'purchase.order.view' },
      { label: 'Payables', href: '/purchase/payables', icon: Receipt, permission: 'purchase.order.view' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    module: 'inventory',
    permission: 'inventory.item.view',
    children: [
      { label: 'Items', href: '/inventory/items', icon: Boxes, permission: 'inventory.item.view' },
      { label: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse, permission: 'inventory.item.view' },
      { label: 'Stock', href: '/inventory/stock', icon: Package, permission: 'inventory.stock.view' },
      { label: 'Stock transfers', href: '/inventory/stock-transfers', icon: Package, permission: 'inventory.stock.view' },
    ],
  },
  {
    label: 'Accounting',
    icon: BookOpen,
    module: 'accounting',
    permission: 'accounting.coa.view',
    children: [
      { label: 'Chart of accounts', href: '/accounting/coa', icon: BookOpen, permission: 'accounting.coa.view' },
      { label: 'Journal', href: '/accounting/journal', icon: BookMarked, permission: 'accounting.journal.view' },
      { label: 'Bank reconciliation', href: '/accounting/bank-reconciliation', icon: BookMarked, permission: 'accounting.journal.view' },
    ],
  },
  {
    label: 'HR',
    icon: Users,
    module: 'hr',
    permission: 'org.company.view',
    children: [
      { label: 'Employees', href: '/hr/employees', icon: Users, permission: 'org.company.view' },
    ],
  },
  {
    label: 'Service',
    icon: FileText,
    module: 'service',
    permission: 'org.company.view',
    children: [
      { label: 'Tickets', href: '/service/tickets', icon: FileText, permission: 'org.company.view' },
      { label: 'AMC contracts', href: '/service/amc', icon: Receipt, permission: 'org.company.view' },
    ],
  },
  {
    label: 'Organization',
    icon: Building2,
    module: 'organization',
    permission: 'org.company.view',
    children: [
      { label: 'Companies', href: '/organization/companies', icon: Building2, permission: 'org.company.view' },
      { label: 'Users', href: '/organization/users', icon: Users, permission: 'org.user.view' },
      { label: 'Roles', href: '/organization/roles', icon: Layers, permission: 'org.role.manage' },
      { label: 'Departments', href: '/organization/departments', icon: Layers, permission: 'org.user.view' },
    ],
  },
  {
    label: 'Admin',
    icon: Settings,
    module: 'organization',
    permission: 'admin.tenant.view',
    children: [
      { label: 'Tenants', href: '/admin/tenants', icon: Building2, permission: 'admin.tenant.view' },
    ],
  },
  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports', permission: 'reports.view' },
  { label: 'Bulk upload', href: '/bulk-upload', icon: Upload, module: 'bulk_upload' },
];

/** Star ICE only: hide HR, Accounting, Service, Bulk upload, Setup; CRM: only Customers + Follow-up; Sales: Requirement, Delivery entry, Invoices, Consolidate bill, Payment, Delivery challans; Purchase: Vendors, Vendor invoices, Payables. */
const starIceNav: typeof nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard', permission: 'reports.view' },
  {
    label: 'CRM',
    icon: Users,
    module: 'crm',
    permission: 'crm.customer.view',
    children: [
      { label: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customer.view' },
      { label: 'Follow-up board', href: '/crm/follow-up-board', icon: Users, permission: 'crm.lead.view' },
    ],
  },
  {
    label: 'Sales',
    icon: FileText,
    module: 'sales',
    permission: 'sales.invoice.view',
    children: [
      { label: 'Requirement', href: '/sales/requirement', icon: ListOrdered, permission: 'sales.order.view' },
      { label: 'Delivery entry', href: '/sales/delivery-entry', icon: Truck, permission: 'sales.invoice.create' },
      { label: 'Invoices', href: '/sales/invoices', icon: Receipt, permission: 'sales.invoice.view' },
      { label: 'Consolidate bill', href: '/sales/consolidate-bill', icon: FileCheck, permission: 'sales.invoice.create' },
      { label: 'Payment', href: '/sales/payment', icon: Wallet, permission: 'sales.invoice.view' },
      { label: 'Delivery challans', href: '/sales/delivery-challans', icon: FileText, permission: 'sales.invoice.view' },
    ],
  },
  {
    label: 'Purchase',
    icon: ShoppingCart,
    module: 'purchase',
    permission: 'purchase.vendor.view',
    children: [
      { label: 'Vendors', href: '/purchase/vendors', icon: Truck, permission: 'purchase.vendor.view' },
      { label: 'Vendor invoices', href: '/purchase/vendor-invoices', icon: FileText, permission: 'purchase.order.view' },
      { label: 'Payables', href: '/purchase/payables', icon: Receipt, permission: 'purchase.order.view' },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    module: 'inventory',
    permission: 'inventory.item.view',
    children: [
      { label: 'Items', href: '/inventory/items', icon: Boxes, permission: 'inventory.item.view' },
      { label: 'Stock', href: '/inventory/stock', icon: Package, permission: 'inventory.stock.view' },
    ],
  },
  {
    label: 'Organization',
    icon: Building2,
    module: 'organization',
    permission: 'org.company.view',
    children: [
      { label: 'Companies', href: '/organization/companies', icon: Building2, permission: 'org.company.view' },
      { label: 'Users', href: '/organization/users', icon: Users, permission: 'org.user.view' },
      { label: 'Roles', href: '/organization/roles', icon: Layers, permission: 'org.role.manage' },
    ],
  },
  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports', permission: 'reports.view' },
];

function getCategoryForPath(path: string, items: typeof nav): string | null {
  for (const item of items) {
    if (item.children?.some((c) => path.startsWith(c.href))) return item.label;
  }
  return null;
}

const DEMO_EMAIL_SUFFIX = '@demo.com';

function filterNavByAccess(
  items: typeof nav,
  permissions: string[] = [],
  allowedModules: string[] | undefined,
  isDemoUser = false
): typeof nav {
  const hasAll = isDemoUser || (permissions.length === 0 && !allowedModules?.length);
  const hasPerm = (p?: string) => !p || hasAll || permissions.includes('*') || permissions.includes(p);
  const allowedModule = (m?: (typeof MODULES)[number]) => !m || !allowedModules || allowedModules.length === 0 || allowedModules.includes(m);
  return items
    .map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter(
          (c) => hasPerm(c.permission) && allowedModule(item.module)
        );
        if (visibleChildren.length === 0) return null;
        if (!hasPerm(item.permission) || !allowedModule(item.module)) return null;
        return { ...item, children: visibleChildren };
      }
      if (!hasPerm(item.permission) || !allowedModule(item.module)) return null;
      return item;
    })
    .filter(Boolean) as typeof nav;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    email?: string;
    name?: string;
    permissions?: string[];
    allowed_modules?: string[];
  } | null>(null);
  const [tenant, setTenant] = useState<{ slug?: string; settings?: Record<string, unknown> } | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDemoUser = typeof user?.email === 'string' && user.email.toLowerCase().endsWith(DEMO_EMAIL_SUFFIX);
  const isStarIce = tenant?.slug === 'star-ice';
  const baseNav = isStarIce ? starIceNav : nav;
  const visibleNav = filterNavByAccess(baseNav, user?.permissions ?? [], user?.allowed_modules, isDemoUser);

  useEffect(() => {
    const cat = getCategoryForPath(pathname, baseNav);
    if (cat) setExpanded((prev) => new Set(prev).add(cat));
  }, [pathname, baseNav]);

  const toggleCategory = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('smebuzz_token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401) {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('smebuzz_token');
            window.localStorage.removeItem('smebuzz_user');
            window.location.replace('/login');
          }
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) {
          setReady(true);
          return;
        }
        const u = d?.user ?? d;
        setUser(u ? { ...u, permissions: u.permissions ?? [], allowed_modules: u.allowed_modules } : null);
        setTenant(d?.tenant ?? null);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('smebuzz_token');
      window.localStorage.removeItem('smebuzz_user');
    }
    router.replace('/login');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  const closeDrawer = () => setMobileMenuOpen(false);

  const renderNavContent = (isMobile = false) => (
    <>
      {visibleNav.map((item) => (
        <div key={item.label} className="mb-0.5">
          {item.children ? (
            <>
              <button
                type="button"
                onClick={() => toggleCategory(item.label)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 ${isMobile ? 'text-base min-touch' : 'text-sm'}`}
                aria-expanded={expanded.has(item.label)}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0 text-slate-600" />}
                <span className="flex-1">{item.label}</span>
                {expanded.has(item.label) ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                )}
              </button>
              {expanded.has(item.label) && (
                <div className="ml-2 mt-0.5 pl-2 border-l-2 border-slate-200 space-y-0.5">
                  {item.children.map((c) => {
                    const Icon = c.icon;
                    const isActive = pathname === c.href;
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={isMobile ? closeDrawer : undefined}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md ${isMobile ? 'text-base min-touch' : 'text-sm'} ${
                          isActive
                            ? 'bg-brand-100 text-brand-800 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <Link
              href={item.href!}
              onClick={isMobile ? closeDrawer : undefined}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isMobile ? 'text-base min-touch' : 'text-sm'} ${
                pathname === item.href
                  ? 'bg-brand-100 text-brand-800 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-70" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </>
  );

  const isSalesActive = pathname.startsWith('/sales');
  const isCrmActive = pathname.startsWith('/crm');

  return (
    <ToastProvider>
    <div className="min-h-screen flex bg-slate-50 safe-top">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 border-r border-slate-200 bg-white flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">SMEBUZZ</Link>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">{renderNavContent(false)}</nav>
      </aside>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/40"
          onClick={closeDrawer}
          aria-hidden
        />
      )}
      {/* Mobile drawer panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[min(320px,85vw)] max-w-full bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-200 ease-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <Link href="/dashboard" onClick={closeDrawer} className="text-lg font-bold text-brand-700">SMEBUZZ</Link>
          <button type="button" onClick={closeDrawer} className="p-2 -m-2 rounded-lg text-slate-600 hover:bg-slate-100 min-touch" aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto">{renderNavContent(true)}</nav>
        <div className="p-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 truncate px-2">{user?.name || user?.email || 'User'}</p>
          <button type="button" onClick={() => { closeDrawer(); logout(); }} className="w-full mt-2 text-sm text-slate-600 hover:text-brand-600 py-2 min-touch">Logout</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <GlobalSearch />
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-4 shrink-0 safe-top">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 min-touch shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/dashboard" className="lg:hidden text-base font-bold text-brand-700 truncate">SMEBUZZ</Link>
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('smebuzz-open-search'))}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 sm:px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 min-h-[44px] min-touch"
              title="Search (⌘K)"
            >
              <Search className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">Search…</span>
              <kbd className="hidden sm:inline rounded bg-white px-1.5 py-0.5 text-xs border border-slate-200">⌘K</kbd>
            </button>
            <span className="hidden md:inline text-sm text-slate-600 truncate ml-2">
              {user?.name || user?.email || 'User'}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="hidden lg:block text-sm text-slate-600 hover:text-brand-600 shrink-0"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — app-like */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200 safe-bottom"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              pathname === '/dashboard' ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="h-6 w-6 shrink-0" />
            <span className="text-xs mt-0.5 font-medium">Home</span>
          </Link>
          <Link
            href="/sales/invoices"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              isSalesActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <Receipt className="h-6 w-6 shrink-0" />
            <span className="text-xs mt-0.5 font-medium">Sales</span>
          </Link>
          <Link
            href="/crm/customers"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              isCrmActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <Users className="h-6 w-6 shrink-0" />
            <span className="text-xs mt-0.5 font-medium">CRM</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              !isSalesActive && !isCrmActive && pathname !== '/dashboard' ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <MoreHorizontal className="h-6 w-6 shrink-0" />
            <span className="text-xs mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
    </ToastProvider>
  );
}
