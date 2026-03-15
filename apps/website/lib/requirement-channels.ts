/** How the requirement was communicated (for proof/audit). */
export const REQUIREMENT_CHANNEL_OPTIONS = [
  { value: '', label: 'Select channel' },
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
  { value: 'other', label: 'Other' },
] as const;
