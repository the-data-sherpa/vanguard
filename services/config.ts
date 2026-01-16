import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL || 'http://localhost:8090');
const CONFIG_ID = 'global-config'; // fixed singleton ID

/** Ensure the singleton config exists; create defaults if missing */
async function ensureConfig() {
  try {
    await pb.collection('system_config').getOne(CONFIG_ID);
  } catch {
    // No config yet – create one with sane defaults
    await pb.collection('system_config').create({
      id: CONFIG_ID,
      resendDomain: '',
      rateLimits: JSON.stringify({ pulsepoint: { limit: 1, intervalSec: 120 } }),
      oauthCredentials: JSON.stringify({
        facebook: { clientId: '', clientSecret: '' },
        twitter: { clientId: '', clientSecret: '' },
        instagram: { clientId: '', clientSecret: '' },
        discord: { clientId: '', clientSecret: '' },
      }),
      globalFeatures: JSON.stringify({ enableTenantCreation: true }),
    });
  }
}

/** Fetch the whole config object, parsed */
export async function getConfig() {
  await ensureConfig();
  const raw = await pb.collection('system_config').getOne(CONFIG_ID);
  return {
    id: raw.id,
    resendDomain: raw.resendDomain,
    rateLimits: JSON.parse(raw.rateLimits || '{}'),
    oauthCredentials: JSON.parse(raw.oauthCredentials || '{}'),
    globalFeatures: JSON.parse(raw.globalFeatures || '{}'),
  } as const;
}

/** Update one or more fields in the singleton config */
export async function updateConfig(patch: Partial<{
  resendDomain: string;
  rateLimits: Record<string, { limit: number; intervalSec: number }>;
  oauthCredentials: Record<string, { clientId: string; clientSecret: string }>;
  globalFeatures: Record<string, boolean>;
}>) {
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
