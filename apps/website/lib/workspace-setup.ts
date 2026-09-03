import { isPosBusinessType, type SignupBusinessTypeId } from './business-types';

export const WORKSPACE_MODULE_OPTIONS = [
  { id: 'inventory', label: 'Items & stock', blurb: 'Products, barcodes, categories and godown quantity.' },
  { id: 'sales', label: 'Bills & invoices', blurb: 'GST bills, quotations and the billing counter.' },
  { id: 'crm', label: 'Customers & leads', blurb: 'People you sell to, pipeline and follow-ups.' },
  { id: 'purchase', label: 'Purchase & vendors', blurb: 'Buy stock, purchase orders and payables.' },
  { id: 'accounting', label: 'Accounts', blurb: 'Journal, GST and books.' },
  { id: 'reports', label: 'Reports', blurb: 'Sales, stock, ageing and day close.' },
  { id: 'hr', label: 'HR', blurb: 'Employees (optional).' },
  { id: 'service', label: 'Service', blurb: 'Tickets and AMC (optional).' },
] as const;

export type WorkspaceModuleId = (typeof WORKSPACE_MODULE_OPTIONS)[number]['id'];

const ALWAYS_ON = ['organization', 'onboarding', 'help', 'dashboard'] as const;

export type LoginLikePayload = {
  user?: { isSuperAdmin?: boolean; tenantId?: string | null };
  tenant?: {
    slug?: string;
    settings?: Record<string, unknown> | { business_type?: string; workspace_configured?: boolean };
    subscription_expired?: boolean;
  };
};

export function needsWorkspaceSetup(settings?: Record<string, unknown> | null): boolean {
  if (!settings) return true;
  if (settings.business_type === 'ice_crest') return false;
  return settings.workspace_configured !== true;
}

export function postLoginPath(data: LoginLikePayload): string {
  if (data.user?.isSuperAdmin && !data.user?.tenantId) return '/admin/tenants';
  if (data.tenant?.subscription_expired) return '/billing';
  const settings = (data.tenant?.settings ?? {}) as Record<string, unknown>;
  if (data.tenant?.slug === 'ice-crest' || settings.business_type === 'ice_crest') return '/ice-crest/dashboard';
  if (needsWorkspaceSetup(settings)) return '/onboarding';
  if (isPosBusinessType(settings.business_type)) return '/pos';
  return '/dashboard';
}

export function resolveEnabledModules(
  settings?: Record<string, unknown> | null,
  userAllowed?: string[] | null,
): string[] | undefined {
  const fromTenant = Array.isArray(settings?.enabled_modules)
    ? (settings.enabled_modules as unknown[]).filter((m): m is string => typeof m === 'string')
    : [];
  const shop = typeof settings?.business_type === 'string' ? settings.business_type : '';
  const defaults = shop && shop !== 'standard' ? normalizeEnabledModules(defaultModulesForShop(shop)) : undefined;
  const enabled = fromTenant.length ? fromTenant : defaults;
  if (!enabled?.length) return userAllowed?.length ? userAllowed : undefined;
  if (userAllowed?.length) {
    const keep = new Set<string>(ALWAYS_ON);
    return enabled.filter((m) => keep.has(m) || userAllowed.includes(m));
  }
  return enabled;
}

export function defaultModulesForShop(type: string): string[] {
  if (isPosBusinessType(type)) {
    return ['sales', 'inventory', 'reports', 'crm'];
  }
  if (type === 'services') {
    return ['crm', 'sales', 'accounting', 'reports'];
  }
  return ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'];
}

export function homeHrefForShop(type: string): string {
  if (type === 'ice_crest') return '/ice-crest/dashboard';
  if (isPosBusinessType(type)) return '/pos';
  return '/dashboard';
}

export function normalizeEnabledModules(selected: string[]): string[] {
  const allowed = new Set<string>(WORKSPACE_MODULE_OPTIONS.map((m) => m.id));
  const picked = selected.filter((id) => allowed.has(id));
  const core = picked.length ? picked : ['sales', 'inventory', 'reports'];
  return Array.from(new Set([...ALWAYS_ON, ...core]));
}

export function shopNeedsConfirm(type: unknown): type is SignupBusinessTypeId {
  return typeof type === 'string' && [
    'dine_restaurant', 'sweet_shop', 'garment_shop', 'retail_shop', 'department_store', 'trading', 'services',
  ].includes(type);
}
