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

  return (
    <ToastProvider>
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <Link href="/dashboard" className="text-lg font-bold text-brand-700">SMEBUZZ</Link>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {visibleNav.map((item) => (
            <div key={item.label} className="mb-0.5">
              {item.children ? (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCategory(item.label)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80"
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
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
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
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalSearch />
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('smebuzz-open-search'))}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              title="Search (⌘K)"
            >
              <Search className="h-4 w-4" />
              <span>Search…</span>
              <kbd className="rounded bg-white px-1.5 py-0.5 text-xs border border-slate-200">⌘K</kbd>
            </button>
            <span className="text-sm text-slate-600 truncate">
              {user?.name || user?.email || 'User'}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-slate-600 hover:text-brand-600"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
