/** Predefined lead source options; "other" allows custom text. */
export const LEAD_SOURCE_OPTIONS = [
  { value: '', label: 'Select source' },
  { value: 'website', label: 'Website' },
  { value: 'shop', label: 'Buyer portal / shop' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'instamart', label: 'Instamart' },
  { value: 'email', label: 'Email' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'social_media', label: 'Social media' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'partner', label: 'Partner' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
] as const;

export const SOURCE_OTHER_VALUE = 'other';
