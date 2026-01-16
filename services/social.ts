// services/social.ts
import PocketBase from "pocketbase";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");

export type Provider = "facebook" | "twitter" | "instagram" | "discord";

export interface SocialAccount {
  id: string;
  tenantId: string;
  provider: Provider;
  providerUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

/**
 * Store or update a social‑OAuth account for a tenant.
 */
export async function upsertSocialAccount(
  tenantId: string,
  provider: Provider,
  data: Omit<SocialAccount, "id" | "tenantId" | "provider">
): Promise<SocialAccount> {
  const payload = {
    tenantId,
    provider,
    providerUserId: data.providerUserId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
    expiresAt: data.expiresAt ? data.expiresAt.toISOString() : null,
    scope: data.scope ?? null,
  };
  try {
    const record = await pb.collection("social_accounts").create(payload);
    return mapToSocialAccount(record);
  } catch (e: any) {
    // If unique constraint violated (tenant+provider+providerUserId), update existing
    if (e?.data?.code === "validation_invalid_unique") {
      const existing = await pb
        .collection("social_accounts")
        .getFirstListItem(`tenantId="${tenantId}" && provider="${provider}" && providerUserId="${data.providerUserId}"`);
      const updated = await pb.collection("social_accounts").update(existing.id, payload);
      return mapToSocialAccount(updated);
    }
    throw e;
  }
}

/**
 * Retrieve a stored social account for a tenant/provider.
 */
export async function getSocialAccount(
  tenantId: string,
  provider: Provider
): Promise<SocialAccount | null> {
  try {
    const record = await pb
      .collection("social_accounts")
      .getFirstListItem(`tenantId="${tenantId}" && provider="${provider}"`);
    return mapToSocialAccount(record);
  } catch {
    return null;
  }
}

/**
 * Delete a stored social account.
 */
export async function deleteSocialAccount(tenantId: string, provider: Provider): Promise<void> {
  try {
    const record = await pb
      .collection("social_accounts")
      .getFirstListItem(`tenantId="${tenantId}" && provider="${provider}"`);
    await pb.collection("social_accounts").delete(record.id);
  } catch {
    // No‑op if not found
  }
}

/**
 * List all social accounts for a tenant.
 */
export async function listSocialAccounts(tenantId: string): Promise<SocialAccount[]> {
  const records = await pb.collection("social_accounts").getList(1, 50, {
    filter: `tenantId="${tenantId}"`,
  });
  return records.items.map(mapToSocialAccount);
}

function mapToSocialAccount(record: any): SocialAccount {
  return {
    id: record.id,
    tenantId: record.tenantId,
    provider: record.provider,
    providerUserId: record.providerUserId,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken ?? undefined,
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
    scope: record.scope ?? undefined,
  };
}