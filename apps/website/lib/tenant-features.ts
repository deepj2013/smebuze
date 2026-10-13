/**
 * Opt-in packs are enabled only when listed on the tenant by universal admin.
 * Empty features still means "all core modules", but never auto-enables these packs.
 */
export const OPT_IN_TENANT_FEATURES = ['recipe_production', 'accounting_export'] as const;

export type OptInTenantFeature = (typeof OPT_IN_TENANT_FEATURES)[number];

export function tenantHasOptInFeature(
  features: string[] | null | undefined,
  feature: OptInTenantFeature | string,
): boolean {
  if (!Array.isArray(features) || features.length === 0) return false;
  return features.includes(feature);
}
