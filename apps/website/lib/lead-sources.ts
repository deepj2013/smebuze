/** Predefined lead source options; "other" allows custom text. */
export const LEAD_SOURCE_OPTIONS = [
  { value: '', label: 'Select source' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'social_media', label: 'Social media' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'partner', label: 'Partner' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
] as const;

export const SOURCE_OTHER_VALUE = 'other';
