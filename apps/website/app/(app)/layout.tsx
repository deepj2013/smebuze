'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import GlobalSearch from './components/GlobalSearch';
import IceCrestTutorial from './components/IceCrestTutorial';
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
  Sparkles,
  Menu,
  X,
  MoreHorizontal,
  Printer,
  Store,
  Palette,
  CreditCard,
  CircleHelp,
} from 'lucide-react';
import { parseTenantBranding } from '@/lib/branding';
import { getStaticUrl } from '@/lib/api';
import { isPosBusinessType } from '@/lib/business-types';
import { needsWorkspaceSetup, resolveEnabledModules } from '@/lib/workspace-setup';
import { applyWorkspaceThemeVars, resolveWorkspaceTheme } from '@/lib/variant-theme';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const MODULES = ['dashboard', 'onboarding', 'help', 'crm', 'sales', 'purchase', 'inventory', 'accounting', 'hr', 'service', 'organization', 'reports', 'bulk_upload'] as const;

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
  { label: 'Help', href: '/help', icon: CircleHelp, module: 'help' },
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
      { label: 'Categories', href: '/inventory/categories', icon: Layers, permission: 'inventory.item.view' },
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
      { label: 'Printers', href: '/organization/printers', icon: Printer, permission: 'org.company.view' },
      { label: 'Look & logo', href: '/organization/branding', icon: Palette, permission: 'org.company.update' },
      { label: 'Scan to pay', href: '/organization/payments', icon: Wallet, permission: 'org.company.update' },
      { label: 'SMEBUZE plan', href: '/billing', icon: CreditCard },
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
  { label: 'GSTR-1', href: '/reports/gstr-1', icon: FileText, module: 'reports', permission: 'reports.view' },
  { label: 'GSTR-2A', href: '/reports/gstr-2a', icon: FileCheck, module: 'reports', permission: 'reports.view' },
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
      { label: 'Printers', href: '/organization/printers', icon: Printer, permission: 'org.company.view' },
      { label: 'Look & logo', href: '/organization/branding', icon: Palette, permission: 'org.company.update' },
      { label: 'Scan to pay', href: '/organization/payments', icon: Wallet, permission: 'org.company.update' },
      { label: 'SMEBUZE plan', href: '/billing', icon: CreditCard },
    ],
  },
  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports', permission: 'reports.view' },
];

const iceCrestNav: typeof nav = [
  { label: 'Dashboard', href: '/ice-crest/dashboard', icon: LayoutDashboard, module: 'dashboard', permission: 'reports.view' },
  { label: 'Getting started', href: '/ice-crest/tutorial', icon: Sparkles, module: 'dashboard', permission: 'reports.view' },
  { label: 'Staff guide', href: '/ice-crest/guide', icon: BookOpen, module: 'dashboard', permission: 'reports.view' },
  { label: 'WhatsApp', href: '/ice-crest/whatsapp', icon: Megaphone, module: 'crm', permission: 'org.company.update' },
  { label: 'CRM', icon: Users, module: 'crm', permission: 'crm.lead.view', children: [
    { label: 'Leads & enquiries', href: '/crm/leads', icon: UserPlus, permission: 'crm.lead.view' },
    { label: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customer.view' },
    { label: 'Sales pipeline', href: '/crm/pipeline', icon: LayoutDashboard, permission: 'crm.lead.view' },
    { label: 'Follow-up board', href: '/crm/follow-up-board', icon: Users, permission: 'crm.lead.view' },
    { label: 'Campaigns', href: '/crm/campaigns', icon: Megaphone, permission: 'crm.lead.view' },
  ]},
  { label: 'Sales & Billing', icon: FileText, module: 'sales', permission: 'sales.invoice.view', children: [
    { label: 'Quotations', href: '/sales/quotations', icon: FileText, permission: 'sales.quotation.view' },
    { label: 'Orders', href: '/sales/orders', icon: ShoppingCart, permission: 'sales.order.view' },
    { label: 'Invoices & receipts', href: '/sales/invoices', icon: Receipt, permission: 'sales.invoice.view' },
    { label: 'Payment tracking', href: '/sales/invoices/pending', icon: Wallet, permission: 'sales.invoice.view' },
    { label: 'Delivery', href: '/sales/delivery-challans', icon: Truck, permission: 'sales.invoice.view' },
  ]},
  { label: 'Stock Management', icon: Package, module: 'inventory', permission: 'inventory.stock.view', children: [
    { label: 'Stock position', href: '/inventory/stock', icon: Package, permission: 'inventory.stock.view' },
    { label: 'Stock inward / outward', href: '/ice-crest/stock-movements', icon: Warehouse, permission: 'inventory.stock.view' },
    { label: 'Production plan', href: '/ice-crest/production-plan', icon: ListOrdered, permission: 'inventory.stock.view' },
    { label: 'Ice SKUs', href: '/inventory/items', icon: Boxes, permission: 'inventory.item.view' },
  ]},
  { label: 'Expenses', href: '/ice-crest/expenses', icon: BookMarked, module: 'reports', permission: 'reports.view' },
  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports', permission: 'reports.view' },
  { label: 'GSTR-1', href: '/reports/gstr-1', icon: FileText, module: 'reports', permission: 'reports.view' },
  { label: 'GSTR-2A', href: '/reports/gstr-2a', icon: FileCheck, module: 'reports', permission: 'reports.view' },
  { label: 'Organization', icon: Building2, module: 'organization', permission: 'org.company.view', children: [
    { label: 'Company', href: '/organization/companies', icon: Building2, permission: 'org.company.view' },
    { label: 'Users & roles', href: '/organization/users', icon: Users, permission: 'org.user.view' },
    { label: 'Printers', href: '/organization/printers', icon: Printer, permission: 'org.company.view' },
    { label: 'Look & logo', href: '/organization/branding', icon: Palette, permission: 'org.company.update' },
    { label: 'Scan to pay', href: '/organization/payments', icon: Wallet, permission: 'org.company.update' },
    { label: 'SMEBUZE plan', href: '/billing', icon: CreditCard },
  ]},
];

const posNav: typeof nav = [
  { label: 'Billing counter', href: '/pos', icon: Store, module: 'sales', permission: 'sales.invoice.create' },
  { label: 'Manage shop', href: '/pos/manage', icon: Boxes, module: 'inventory', permission: 'inventory.item.view' },
  { label: 'Bills', href: '/sales/invoices', icon: Receipt, module: 'sales', permission: 'sales.invoice.view' },
  { label: 'Categories', href: '/inventory/categories', icon: Layers, module: 'inventory', permission: 'inventory.item.view' },
  { label: 'Menu & items', href: '/inventory/items', icon: Boxes, module: 'inventory', permission: 'inventory.item.view' },
  { label: 'Stock', href: '/inventory/stock', icon: Package, module: 'inventory', permission: 'inventory.stock.view' },
  { label: 'Customers', href: '/crm/customers', icon: Users, module: 'crm', permission: 'crm.customer.view' },
  { label: 'Printers', href: '/organization/printers', icon: Printer, module: 'organization', permission: 'org.company.view' },
  { label: 'Reports', href: '/reports', icon: BarChart3, module: 'reports', permission: 'reports.view' },
  { label: 'Setup', href: '/onboarding', icon: Settings, module: 'onboarding' },
  { label: 'Help', href: '/help', icon: CircleHelp, module: 'help' },
  { label: 'Organization', icon: Building2, module: 'organization', permission: 'org.company.view', children: [
    { label: 'Company', href: '/organization/companies', icon: Building2, permission: 'org.company.view' },
    { label: 'Users', href: '/organization/users', icon: Users, permission: 'org.user.view' },
    { label: 'Look & logo', href: '/organization/branding', icon: Palette, permission: 'org.company.update' },
    { label: 'Scan to pay', href: '/organization/payments', icon: Wallet, permission: 'org.company.update' },
    { label: 'SMEBUZE plan', href: '/billing', icon: CreditCard },
  ]},
];

function getCategoryForPath(path: string, items: typeof nav): string | null {
  for (const item of items) {
    if (item.children?.some((c) => path.startsWith(c.href))) return item.label;
  }
  return null;
}

function BrandMark({
  href,
  name,
  logoSrc,
  onClick,
  compact = false,
  className = '',
}: {
  href: string;
  name: string;
  logoSrc: string | null;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-2 min-w-0 ${className}`}>
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoSrc} alt="" className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-md object-contain bg-white border border-slate-200 shrink-0`} />
      ) : null}
      <span className={`${compact ? 'text-base' : 'text-lg'} font-bold text-brand-700 truncate`}>{name}</span>
    </Link>
  );
}

function filterNavByAccess(
  items: typeof nav,
  permissions: string[] = [],
  allowedModules: string[] | undefined,
): typeof nav {
  const hasAll = permissions.includes('*') || permissions.length === 0;
  const hasPerm = (p?: string) => !p || hasAll || permissions.includes(p);
  const alwaysOn = new Set(['organization', 'onboarding', 'help', 'dashboard']);
  const allowedModule = (m?: (typeof MODULES)[number]) =>
    !m || alwaysOn.has(m) || !allowedModules || allowedModules.length === 0 || allowedModules.includes(m);
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
    email_verified?: boolean;
    isSuperAdmin?: boolean;
    tenantId?: string | null;
    onboarding_completed_at?: string | null;
  } | null>(null);
  const [tenant, setTenant] = useState<{
    slug?: string;
    settings?: Record<string, unknown>;
    plan?: string;
    subscription_expired?: boolean;
    subscription_ends_at?: string | null;
    days_left?: number | null;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showIceCrestTutorial, setShowIceCrestTutorial] = useState(false);
  const isStarIce = tenant?.slug === 'star-ice';
  const isIceCrest = tenant?.slug === 'ice-crest' || tenant?.settings?.business_type === 'ice_crest';
  const isPosTenant = isPosBusinessType(tenant?.settings?.business_type);
  const isPublicIceCrestSite = pathname === '/ice-crest';
  const branding = parseTenantBranding(tenant?.settings);
  const shopTheme = useMemo(() => resolveWorkspaceTheme(tenant?.settings ?? null), [tenant?.settings]);
  const brandName = branding.display_name || (isIceCrest ? 'ICE CREST CRM' : 'SMEBUZE');
  const logoSrc = branding.logo_url
    ? `${getStaticUrl(branding.logo_url)}${branding.updated_at ? `?t=${encodeURIComponent(branding.updated_at)}` : ''}`
    : null;
  const enabledModules = resolveEnabledModules(tenant?.settings ?? null, user?.allowed_modules);
  const baseNav = isIceCrest ? iceCrestNav : isStarIce ? starIceNav : isPosTenant ? posNav : nav;
  let visibleNav = filterNavByAccess(baseNav, user?.permissions ?? [], enabledModules);
  if (user?.isSuperAdmin && !visibleNav.some((i) => i.label === 'Admin')) {
    const adminItem = nav.find((i) => i.label === 'Admin');
    if (adminItem) visibleNav = [...visibleNav, adminItem];
  }

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
    if (pathname === '/ice-crest') return;
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
        if (r.status === 402) {
          router.replace('/billing');
          return r.json();
        }
        return r.json();
      })
      .then((d) => {
        if (!d) {
          setReady(true);
          return;
        }
        const u = d?.user ?? d;
        if (u && u.email_verified === false && !u.isSuperAdmin) {
          const em = encodeURIComponent(u.email || '');
          const slug = encodeURIComponent(d?.tenant?.slug || '');
          router.replace(`/verify-email?email=${em}&slug=${slug}`);
          return;
        }
        setUser(u ? { ...u, permissions: u.permissions ?? [], allowed_modules: u.allowed_modules } : null);
        setTenant(d?.tenant ?? null);
        setReady(true);
        if (d?.tenant?.subscription_expired && !u?.isSuperAdmin && pathname !== '/billing') {
          router.replace('/billing');
          return;
        }
        const settings = (d?.tenant?.settings ?? {}) as Record<string, unknown>;
        const canConfigure = Boolean(
          u?.isSuperAdmin || (u?.permissions ?? []).includes('*') || (u?.permissions ?? []).includes('org.company.update'),
        );
        const onSetupPath =
          pathname.startsWith('/onboarding') || pathname.startsWith('/help') || pathname === '/billing';
        if (
          d?.tenant &&
          !u?.isSuperAdmin &&
          canConfigure &&
          needsWorkspaceSetup(settings) &&
          !onSetupPath &&
          d?.tenant?.slug !== 'ice-crest' &&
          settings.business_type !== 'ice_crest'
        ) {
          router.replace('/onboarding');
          return;
        }
        if (!d?.tenant?.subscription_expired && (d?.tenant?.slug === 'ice-crest' || d?.tenant?.settings?.business_type === 'ice_crest')) {
          fetch(`${API_URL}/api/v1/onboarding/checklist`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((ob) => {
              if (ob?.showOnboarding && !window.location.pathname.startsWith('/ice-crest/tutorial')) {
                setShowIceCrestTutorial(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setReady(true));
  }, [router, pathname]);

  useEffect(() => {
    applyWorkspaceThemeVars(shopTheme);
  }, [shopTheme]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as Record<string, unknown> | undefined;
      if (!detail) return;
      setTenant((prev) => ({
        ...(prev ?? {}),
        settings: { ...(prev?.settings ?? {}), branding: detail },
      }));
    };
    window.addEventListener('smebuzz-branding-updated', onUpdated);
    return () => window.removeEventListener('smebuzz-branding-updated', onUpdated);
  }, []);

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('smebuzz_token');
      window.localStorage.removeItem('smebuzz_user');
    }
    router.replace('/login');
  };

  if (isPublicIceCrestSite) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  // Invoice/quotation print views only — not /organization/printers (that path contains "/print").
  const isPrintDocument = pathname === '/print' || pathname.endsWith('/print') || pathname.includes('/print/');
  if (isPrintDocument) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  if (pathname.startsWith('/onboarding')) {
    return (
      <ToastProvider>
        <div className="min-h-dvh bg-slate-50 flex flex-col">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="h-14 flex items-center justify-between px-4 max-w-4xl mx-auto w-full">
              <span className="font-bold text-brand-700 truncate">{brandName}</span>
              <div className="flex items-center gap-4">
                <Link href="/help" className="text-sm font-medium text-slate-600 hover:text-brand-600">Help</Link>
                <button type="button" onClick={logout} className="text-sm text-slate-600 hover:text-brand-600">
                  Logout
                </button>
              </div>
            </div>
          </header>
          <main id="main" className="flex-1">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  const paywalled = Boolean(tenant?.subscription_expired) && !user?.isSuperAdmin;
  if (paywalled && pathname !== '/billing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Redirecting to billing…</p>
      </div>
    );
  }
  if (paywalled && pathname === '/billing') {
    return (
      <ToastProvider>
        <div className="min-h-dvh bg-slate-50 flex flex-col">
          <header className="border-b border-slate-200 bg-white" style={{ paddingTop: 'var(--safe-area-top)' }}>
            <div className="h-14 flex items-center justify-between px-4">
              <span className="font-bold text-brand-700">SMEBUZE</span>
              <button type="button" onClick={logout} className="text-sm text-slate-600 hover:text-brand-600">
                Logout
              </button>
            </div>
          </header>
          <main id="main" className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </ToastProvider>
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

  const isSalesActive = pathname.startsWith('/sales') || pathname.startsWith('/pos');
  const isCrmActive = pathname.startsWith('/crm');
  const isStockActive = pathname.startsWith('/ice-crest/stock') || pathname.startsWith('/inventory') || pathname.startsWith('/ice-crest/production');
  const homeHref = isIceCrest ? '/ice-crest/dashboard' : isPosTenant ? '/pos' : '/dashboard';
  const isHomeActive = pathname === homeHref || (isIceCrest && pathname.startsWith('/ice-crest/dashboard'));
  const moreActive = isIceCrest
    ? !isHomeActive && !isSalesActive && !isStockActive
    : !isSalesActive && !isCrmActive && !isHomeActive;

  return (
    <ToastProvider>
    {isIceCrest && showIceCrestTutorial && (
      <IceCrestTutorial mode="modal" onDismiss={() => setShowIceCrestTutorial(false)} onComplete={() => setShowIceCrestTutorial(false)} />
    )}
    <div className="min-h-dvh flex" style={{ background: 'var(--tenant-canvas, #f8fafc)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 border-r border-slate-200 flex-col shrink-0" style={{ background: 'var(--tenant-sidebar, #ffffff)' }}>
        <div className="p-4 border-b border-slate-200">
          <BrandMark href={homeHref} name={brandName} logoSrc={logoSrc} />
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
        className={`fixed top-0 left-0 z-50 h-full w-[min(320px,85vw)] max-w-full border-r border-slate-200 shadow-xl transform transition-transform duration-200 ease-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'var(--safe-area-top)', background: 'var(--tenant-sidebar, #ffffff)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <BrandMark href={homeHref} name={brandName} logoSrc={logoSrc} onClick={closeDrawer} />
          <button type="button" onClick={closeDrawer} className="p-2 -m-2 rounded-lg text-slate-600 hover:bg-slate-100 min-touch" aria-label="Close menu">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto">{renderNavContent(true)}</nav>
        <div className="p-3 border-t border-slate-200" style={{ paddingBottom: 'max(0.75rem, var(--safe-area-bottom))' }}>
          <p className="text-xs text-slate-500 truncate px-2">{user?.name || user?.email || 'User'}</p>
          <button type="button" onClick={() => { closeDrawer(); logout(); }} className="w-full mt-2 text-sm text-slate-600 hover:text-brand-600 py-2 min-touch">Logout</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
        <GlobalSearch />
        <header className="border-b border-slate-200 bg-white shrink-0" style={{ paddingTop: 'var(--safe-area-top)' }}>
          {typeof tenant?.days_left === 'number' && !tenant.subscription_expired && tenant.days_left <= 3 && (
            <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 text-sm text-amber-900">
              {tenant.days_left <= 0
                ? 'Your trial ends today.'
                : `Your trial ends in ${tenant.days_left} day${tenant.days_left === 1 ? '' : 's'}.`}{' '}
              <Link href="/billing" className="font-semibold underline">Pay to continue</Link>
            </div>
          )}
          <div className="h-14 flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 min-touch shrink-0"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <BrandMark href={homeHref} name={isIceCrest && !branding.display_name ? 'ICE CREST' : brandName} logoSrc={logoSrc} compact className="lg:hidden" />
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
          </div>
        </header>
        <main id="main" className="flex-1 overflow-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation — app-like */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200"
        style={{ paddingBottom: 'var(--safe-area-bottom)' }}
      >
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
          <Link
            href={homeHref}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              isHomeActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            {isPosTenant ? <Store className="h-6 w-6 shrink-0" /> : <LayoutDashboard className="h-6 w-6 shrink-0" />}
            <span className="text-xs mt-0.5 font-medium">{isPosTenant ? 'POS' : 'Home'}</span>
          </Link>
          <Link
            href="/sales/invoices"
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              isSalesActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
            }`}
          >
            <Receipt className="h-6 w-6 shrink-0" />
            <span className="text-xs mt-0.5 font-medium">{isIceCrest ? 'Billing' : isPosTenant ? 'Bills' : 'Sales'}</span>
          </Link>
          {isIceCrest ? (
            <Link
              href="/ice-crest/stock-movements"
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
                isStockActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
              }`}
            >
              <Package className="h-6 w-6 shrink-0" />
              <span className="text-xs mt-0.5 font-medium">Stock</span>
            </Link>
          ) : (
            <Link
              href="/crm/customers"
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
                isCrmActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
              }`}
            >
              <Users className="h-6 w-6 shrink-0" />
              <span className="text-xs mt-0.5 font-medium">CRM</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg min-touch ${
              moreActive ? 'text-brand-600 bg-brand-50' : 'text-slate-600'
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
