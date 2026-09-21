/**
 * Pitch + tenant shape per shop type.
 * Modules listed here are what the workspace should show — nothing else by default.
 */
import { SIGNUP_BUSINESS_TYPES, isFloorBusinessType, isPosBusinessType } from './business-types';
import { defaultModulesForShop, homeHrefForShop } from './workspace-setup';

export type PitchReadiness = 'ready' | 'good' | 'desk';

export type ClientPitch = {
  id: string;
  title: string;
  group: string;
  readiness: PitchReadiness;
  /** One-line opener when you meet the owner */
  pitch: string;
  /** Screens to open in the demo */
  demo: string[];
  /** Modules left ON for this tenant */
  modules: string[];
  /** Home after login */
  home: string;
  /** Explicitly hidden so the shop does not see clutter */
  hide: string[];
};

const HIDE_DESK_POS = ['Waiter', 'Kitchen', 'Floor plan'];

function readinessFor(id: string): PitchReadiness {
  if (isFloorBusinessType(id)) return 'ready';
  if (isPosBusinessType(id) || id === 'clinic') return 'good';
  return 'desk';
}

function demoFor(id: string): string[] {
  if (isFloorBusinessType(id)) {
    return ['Floor / tables', 'Waiter order', 'Kitchen tickets', 'POS bill', 'Admin → menu & tables'];
  }
  if (id === 'salon' || id === 'clinic') {
    return ['POS / reception bill', 'Public website menu', 'Lead hub', 'Day reports'];
  }
  if (isPosBusinessType(id)) {
    return ['Billing counter', 'Items & stock', 'Catalog / shop page', 'Day close report'];
  }
  if (id === 'hotel' || id === 'coaching' || id === 'services') {
    return ['Public website', 'Lead hub', 'Invoices', 'CRM follow-ups'];
  }
  return ['Quotations', 'GST invoice', 'Purchase & stock', 'Buyer portal / catalog'];
}

function pitchLine(id: string, title: string): string {
  if (isFloorBusinessType(id)) {
    return `${title}: table → waiter → kitchen → bill. Staff only see their screen; you keep the licence in SMEBUZE admin.`;
  }
  if (id === 'salon' || id === 'clinic') {
    return `${title}: reception billing + booking enquiries on the website — no purchase/accounts clutter.`;
  }
  if (isPosBusinessType(id)) {
    return `${title}: fast counter billing, stock on sale, and the same items on a public catalog when you want.`;
  }
  if (id === 'hotel' || id === 'coaching' || id === 'services') {
    return `${title}: website + lead inbox + invoices — desk tools only, no shop floor.`;
  }
  return `${title}: full GST desk — quotes, invoices, purchase, godown, optional buyer portal.`;
}

function hideFor(id: string): string[] {
  if (isFloorBusinessType(id)) {
    return ['Purchase', 'Accounts', 'HR', 'Service tickets'];
  }
  if (id === 'salon' || id === 'clinic') {
    return [...HIDE_DESK_POS, 'Purchase', 'Inventory', 'Accounts', 'HR', 'Service tickets'];
  }
  if (isPosBusinessType(id)) {
    const base = [...HIDE_DESK_POS, 'HR', 'Service tickets', 'Accounts'];
    if (id !== 'department_store') base.push('Purchase');
    return base;
  }
  if (id === 'hotel' || id === 'coaching' || id === 'services') {
    return [...HIDE_DESK_POS, 'Purchase', 'Inventory / godown', 'HR'];
  }
  return HIDE_DESK_POS;
}

export const CLIENT_PITCHES: ClientPitch[] = SIGNUP_BUSINESS_TYPES.map((t) => ({
  id: t.id,
  title: t.title,
  group: t.group,
  readiness: readinessFor(t.id),
  pitch: pitchLine(t.id, t.title),
  demo: demoFor(t.id),
  modules: defaultModulesForShop(t.id),
  home: homeHrefForShop(t.id),
  hide: hideFor(t.id),
}));

/** Extra verticals not on the signup card grid */
export const EXTRA_PITCHES: ClientPitch[] = [
  {
    id: 'restaurant_wholesale',
    title: 'Restaurant / HORECA wholesale',
    group: 'desk',
    readiness: 'desk',
    pitch: 'B2B catalog, portal orders, delivery challan, monthly bill — built for kitchen suppliers.',
    demo: ['Buyer catalog', 'Portal orders', 'Delivery challan', 'Consolidate bill'],
    modules: ['crm', 'sales', 'purchase', 'inventory', 'accounting', 'reports'],
    home: '/dashboard',
    hide: HIDE_DESK_POS,
  },
  {
    id: 'ice_crest',
    title: 'Ice Crest / ice wholesale',
    group: 'desk',
    readiness: 'ready',
    pitch: 'Ice vertical: stock, delivery, website enquiry — already live as a reference pitch.',
    demo: ['Ice dashboard', 'Stock movements', 'Leads', 'Invoices'],
    modules: defaultModulesForShop('ice_crest'),
    home: '/ice-crest/dashboard',
    hide: [...HIDE_DESK_POS, 'Purchase', 'Accounts', 'HR'],
  },
];

export function allPitches(): ClientPitch[] {
  return [...CLIENT_PITCHES, ...EXTRA_PITCHES];
}

export function pitchFor(type: string): ClientPitch | undefined {
  return allPitches().find((p) => p.id === type);
}
