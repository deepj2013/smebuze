export const VEHICLE_DOC_TYPES = [
  { id: 'rc', label: 'RC book' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'fitness', label: 'Fitness certificate' },
  { id: 'permit', label: 'Permit' },
  { id: 'national_permit', label: 'National permit' },
  { id: 'puc', label: 'PUC' },
  { id: 'other', label: 'Other' },
] as const;

export const VEHICLE_TYPES = ['truck', 'tempo', 'trailer', 'container', 'pickup', 'tanker', 'other'] as const;
export const PARTY_TYPES = ['company', 'individual', 'broker', 'other'] as const;
