import { getClient } from '../lib/pocketbase';

const CONFIG_ID = 'global-config'; // fixed singleton ID

/** Default configuration values */
const DEFAULT_CONFIG = {
  id: CONFIG_ID,
  resendDomain: '',
  rateLimits: { pulsepoint: { limit: 1, intervalSec: 120 } },
  oauthCredentials: {
    facebook: { clientId: '', clientSecret: '' },
    twitter: { clientId: '', clientSecret: '' },
    instagram: { clientId: '', clientSecret: '' },
    discord: { clientId: '', clientSecret: '' },
  },
  globalFeatures: { enableTenantCreation: true },
} as const;

/** Ensure the singleton config exists; create defaults if missing */
async function ensureConfig() {
  const pb = getClient();
  try {
    await pb.collection('system_config').getOne(CONFIG_ID);
  } catch {
    // No config yet – create one with sane defaults
    await pb.collection('system_config').create({
      id: CONFIG_ID,
      resendDomain: '',
      rateLimits: JSON.stringify(DEFAULT_CONFIG.rateLimits),
      oauthCredentials: JSON.stringify(DEFAULT_CONFIG.oauthCredentials),
      globalFeatures: JSON.stringify(DEFAULT_CONFIG.globalFeatures),
    });
  }
}

/**
 * Fetch the whole config object, parsed.
 * Falls back to defaults if PocketBase is unavailable or returns an error.
 */
export async function getConfig() {
  const pb = getClient();
  try {
    await ensureConfig();
    const raw = await pb.collection('system_config').getOne(CONFIG_ID);
    return {
      id: raw.id,
      resendDomain: raw.resendDomain,
      rateLimits: JSON.parse(raw.rateLimits || '{}'),
      oauthCredentials: JSON.parse(raw.oauthCredentials || '{}'),
      globalFeatures: JSON.parse(raw.globalFeatures || '{}'),
    } as const;
  } catch (error) {
    console.warn('[Config] PocketBase error, using defaults:', error instanceof Error ? error.message : error);
    return DEFAULT_CONFIG;
  }
}

/** Update one or more fields in the singleton config */
export async function updateConfig(patch: Partial<{
  resendDomain: string;
  rateLimits: Record<string, { limit: number; intervalSec: number }>;
  oauthCredentials: Record<string, { clientId: string; clientSecret: string }>;
  globalFeatures: Record<string, boolean>;
}>) {
  const pb = getClient();
  const current = await getConfig();
  const updated = {
    resendDomain: patch.resendDomain ?? current.resendDomain,
    rateLimits: JSON.stringify(patch.rateLimits ?? current.rateLimits),
    oauthCredentials: JSON.stringify(patch.oauthCredentials ?? current.oauthCredentials),
    globalFeatures: JSON.stringify(patch.globalFeatures ?? current.globalFeatures),
  };
  await pb.collection('system_config').update(CONFIG_ID, updated);
  return getConfig();
}
