// services/pulsepoint.ts
import PocketBase from "pocketbase";
import { checkAndConsume } from "./rateLimiter";
import { getConfig } from "./config";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");

/**
 * Tenant‑scoped PulsePoint data fetch.
 * Respects tenant‑specific rate limits from global config.
 * Returns the raw JSON payload from the PulsePoint API or throws if rate‑limited.
 */
export async function fetchTenantPulsepoint(tenantId: string, pulsepointId: string, params: Record<string, any> = {}) {
  // Load global rate‑limit config
  const cfg = await getConfig();
  const limitCfg = cfg.rateLimits.pulsepoint ?? { limit: 1, intervalSec: 120 };

  const { allowed, retryAfter } = await checkAndConsume(tenantId, "pulsepoint", limitCfg);
  if (!allowed) {
    const err = new Error("Rate limit exceeded") as any;
    err.statusCode = 429;
    err.retryAfter = retryAfter;
    throw err;
  }

  // Fetch from placeholder PulsePoint API (replace with real endpoint)
  const qs = new URLSearchParams(params).toString();
  const url = `https://api.pulsepoint.io/v1/data?pulseId=${encodeURIComponent(pulsepointId)}${qs ? `&${qs}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      // Use a placeholder token; in production configure per‑tenant keys
      Authorization: `Bearer ${cfg.oauthCredentials.facebook?.clientId ?? ""}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PulsePoint fetch error: ${res.status} ${body}`);
  }
  return await res.json();
}