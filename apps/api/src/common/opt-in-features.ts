/** Packs enabled only when listed on the tenant by universal admin. Empty features ≠ these. */
export const OPT_IN_FEATURES = ['recipe_production', 'accounting_export'] as const;

export type OptInFeature = (typeof OPT_IN_FEATURES)[number];

export function tenantHasOptIn(features: string[] | null | undefined, feature: OptInFeature | string): boolean {
  if (!Array.isArray(features) || features.length === 0) return false;
  return features.includes(feature);
}
