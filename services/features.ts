// services/features.ts
import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");

/**
 * Parse tenant feature flags from the JSON string in the DB.
 */
function parseFeatures(featuresJson: string | null): Record<string, boolean> {
  try {
    return featuresJson ? JSON.parse(featuresJson) : {};
  } catch {
    return {};
  }
}

/**
 * Get all feature flags for a tenant.
 */
export async function getTenantFeatures(tenantId: string): Promise<Record<string, boolean>> {
  const tenant = await pb.collection("tenants").getOne(tenantId);
  return parseFeatures(tenant.features);
}

/**
 * Check if a specific feature flag is enabled for a tenant.
 */
export async function isFeatureEnabled(tenantId: string, flag: string): Promise<boolean> {
  const features = await getTenantFeatures(tenantId);
  return !!features[flag];
}

/**
 * Update one or more feature flags for a tenant.
 */
export async function setTenantFeatures(
  tenantId: string,
  patch: Record<string, boolean>
): Promise<Record<string, boolean>> {
  const tenant = await pb.collection("tenants").getOne(tenantId);
  const current = parseFeatures(tenant.features);
  const updated = { ...current, ...patch };
  await pb.collection("tenants").update(tenantId, {
    features: JSON.stringify(updated),
  });
  return updated;
}

/**
 * Retrieve global feature flags from system_config.
 */
export async function getGlobalFeatures(): Promise<Record<string, boolean>> {
  const { globalFeatures } = await import("./config").then((m) => m.getConfig());
  return globalFeatures;
}

/**
 * Check if a global feature flag is enabled.
 */
export async function isGlobalFeatureEnabled(flag: string): Promise<boolean> {
  const features = await getGlobalFeatures();
  return !!features[flag];
}