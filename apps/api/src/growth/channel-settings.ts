import { decryptSecret, encryptSecret } from '../common/tenant-razorpay';

export type ChannelMode = 'shared' | 'private';

export type ChannelSettings = {
  whatsapp: { mode: ChannelMode; private: { license?: string; api_key?: string; url?: string } };
  campaign: { mode: ChannelMode; private: { smtp_host?: string; smtp_user?: string; smtp_pass?: string; from?: string } };
  payments: { mode: ChannelMode; default_provider: string };
};

const empty: ChannelSettings = {
  whatsapp: { mode: 'shared', private: {} },
  campaign: { mode: 'shared', private: {} },
  payments: { mode: 'private', default_provider: 'razorpay' },
};

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function parseChannelSettings(settings: Record<string, unknown> | null | undefined): ChannelSettings {
  const raw = asObj(settings?.channels);
  const wa = asObj(raw.whatsapp);
  const camp = asObj(raw.campaign);
  const pay = asObj(raw.payments);
  const waPriv = asObj(wa.private);
  const campPriv = asObj(camp.private);
  return {
    whatsapp: {
      mode: wa.mode === 'private' ? 'private' : 'shared',
      private: {
        license: typeof waPriv.license === 'string' ? waPriv.license : '',
        api_key: typeof waPriv.api_key === 'string' ? decryptSecret(waPriv.api_key) : '',
        url: typeof waPriv.url === 'string' ? waPriv.url : '',
      },
    },
    campaign: {
      mode: camp.mode === 'private' ? 'private' : 'shared',
      private: {
        smtp_host: typeof campPriv.smtp_host === 'string' ? campPriv.smtp_host : '',
        smtp_user: typeof campPriv.smtp_user === 'string' ? campPriv.smtp_user : '',
        smtp_pass: typeof campPriv.smtp_pass === 'string' ? decryptSecret(campPriv.smtp_pass) : '',
        from: typeof campPriv.from === 'string' ? campPriv.from : '',
      },
    },
    payments: {
      mode: pay.mode === 'shared' ? 'shared' : 'private',
      default_provider: typeof pay.default_provider === 'string' && pay.default_provider ? pay.default_provider : 'razorpay',
    },
  };
}

export function publicChannelSettings(full: ChannelSettings) {
  return {
    whatsapp: {
      mode: full.whatsapp.mode,
      private_configured: Boolean(full.whatsapp.private.license && full.whatsapp.private.api_key),
    },
    campaign: {
      mode: full.campaign.mode,
      private_configured: Boolean(full.campaign.private.smtp_host && full.campaign.private.smtp_user),
    },
    payments: full.payments,
  };
}

export function mergeChannelSettings(
  current: Record<string, unknown>,
  patch: {
    whatsapp?: { mode?: ChannelMode; license?: string; api_key?: string; url?: string };
    campaign?: { mode?: ChannelMode; smtp_host?: string; smtp_user?: string; smtp_pass?: string; from?: string };
    payments?: { mode?: ChannelMode; default_provider?: string };
  },
): Record<string, unknown> {
  const parsed = parseChannelSettings(current);
  if (patch.whatsapp?.mode) parsed.whatsapp.mode = patch.whatsapp.mode;
  if (patch.whatsapp?.license !== undefined) parsed.whatsapp.private.license = patch.whatsapp.license;
  if (patch.whatsapp?.api_key) parsed.whatsapp.private.api_key = patch.whatsapp.api_key;
  if (patch.whatsapp?.url !== undefined) parsed.whatsapp.private.url = patch.whatsapp.url;
  if (patch.campaign?.mode) parsed.campaign.mode = patch.campaign.mode;
  if (patch.campaign?.smtp_host !== undefined) parsed.campaign.private.smtp_host = patch.campaign.smtp_host;
  if (patch.campaign?.smtp_user !== undefined) parsed.campaign.private.smtp_user = patch.campaign.smtp_user;
  if (patch.campaign?.smtp_pass) parsed.campaign.private.smtp_pass = patch.campaign.smtp_pass;
  if (patch.campaign?.from !== undefined) parsed.campaign.private.from = patch.campaign.from;
  if (patch.payments?.mode) parsed.payments.mode = patch.payments.mode;
  if (patch.payments?.default_provider) parsed.payments.default_provider = patch.payments.default_provider;

  const stored = {
    whatsapp: {
      mode: parsed.whatsapp.mode,
      private: {
        license: parsed.whatsapp.private.license || '',
        api_key: parsed.whatsapp.private.api_key ? encryptSecret(parsed.whatsapp.private.api_key) : '',
        url: parsed.whatsapp.private.url || '',
      },
    },
    campaign: {
      mode: parsed.campaign.mode,
      private: {
        smtp_host: parsed.campaign.private.smtp_host || '',
        smtp_user: parsed.campaign.private.smtp_user || '',
        smtp_pass: parsed.campaign.private.smtp_pass ? encryptSecret(parsed.campaign.private.smtp_pass) : '',
        from: parsed.campaign.private.from || '',
      },
    },
    payments: parsed.payments,
  };
  return { ...current, channels: stored };
}

export function whatsappCredentialsForTenant(settings: Record<string, unknown> | null | undefined): {
  mode: 'shared' | 'private';
  license: string;
  apiKey: string;
  url: string;
} {
  const ch = parseChannelSettings(settings);
  if (ch.whatsapp.mode === 'private' && ch.whatsapp.private.license && ch.whatsapp.private.api_key) {
    return {
      mode: 'private',
      license: ch.whatsapp.private.license,
      apiKey: ch.whatsapp.private.api_key,
      url: ch.whatsapp.private.url || process.env.WHATSAPP_AMEERA_URL || '',
    };
  }
  return {
    mode: 'shared',
    license: process.env.WHATSAPP_AMEERA_LICENSE || '',
    apiKey: process.env.WHATSAPP_AMEERA_API_KEY || '',
    url: process.env.WHATSAPP_AMEERA_URL || 'https://login.ameerait.com/api/sendtemplate.php',
  };
}

