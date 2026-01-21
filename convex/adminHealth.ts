import { v } from "convex/values";
import { query, action, QueryCtx, ActionCtx } from "./_generated/server";

// ===================
// Authorization Helper
// ===================

/**
 * Get current user for queries (returns null if not platform admin)
 */
async function getCurrentPlatformAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) {
    return null;
  }

  const email = identity.email;
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (!user || user.role !== "platform_admin") {
    return null;
  }

  return user;
}

// ===================
// Health Monitoring Queries
// ===================

/**
 * Get sync history over time (aggregated from audit logs).
 * Returns array of { date, incidentSyncs, weatherSyncs, failures }
 */
export const getSyncHistory = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 7 }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Query audit logs for sync actions
    const auditLogs = await ctx.db
      .query("auditLogs")
      .order("desc")
      .filter((q) => q.gte(q.field("_creationTime"), startTime))
      .collect();

    // Filter to sync-related actions
    const syncLogs = auditLogs.filter(
      (log) =>
        log.action.includes("sync") ||
        log.action.includes("pulsepoint") ||
        log.action.includes("weather")
    );

    // Group by date
    const dailyData: Record<
      string,
      { incidentSyncs: number; weatherSyncs: number; failures: number }
    > = {};

    // Initialize all days in range
    const startDate = new Date(startTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = { incidentSyncs: 0, weatherSyncs: 0, failures: 0 };
    }

    // Count syncs
    for (const log of syncLogs) {
      const date = new Date(log._creationTime);
      const dateStr = date.toISOString().split("T")[0];

      if (dailyData[dateStr]) {
        if (log.result === "failure") {
          dailyData[dateStr].failures++;
        } else if (
          log.action.includes("incident") ||
          log.action.includes("pulsepoint")
        ) {
          dailyData[dateStr].incidentSyncs++;
        } else if (log.action.includes("weather")) {
          dailyData[dateStr].weatherSyncs++;
        }
      }
    }

    // Convert to array sorted by date
    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Get recent errors from audit logs.
 * Filters by result: "failure" or action containing "error"
 */
export const getRecentErrors = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    // Get recent audit logs
    const auditLogs = await ctx.db.query("auditLogs").order("desc").take(1000);

    // Filter to errors
    const errors = auditLogs
      .filter(
        (log) => log.result === "failure" || log.action.toLowerCase().includes("error")
      )
      .slice(0, limit);

    // Get tenant names for context
    const tenantIds = [...new Set(errors.filter((e) => e.tenantId).map((e) => e.tenantId!))];
    const tenants = await Promise.all(
      tenantIds.map(async (id) => {
        const tenant = await ctx.db.get(id);
        return tenant ? { id, name: tenant.name, slug: tenant.slug } : null;
      })
    );
    const tenantMap = new Map(
      tenants.filter((t) => t !== null).map((t) => [t!.id, t])
    );

    return errors.map((log) => ({
      _id: log._id,
      _creationTime: log._creationTime,
      tenantId: log.tenantId,
      tenantName: log.tenantId ? tenantMap.get(log.tenantId)?.name : null,
      tenantSlug: log.tenantId ? tenantMap.get(log.tenantId)?.slug : null,
      action: log.action,
      details: log.details,
      result: log.result,
    }));
  },
});

/**
 * Get platform-wide incident trends (aggregated across all tenants).
 * Returns array of { date, count, byTenant: { tenantId, tenantName, count }[] }
 */
export const getPlatformIncidentTrends = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 30 }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Get all incidents in the time range
    const incidents = await ctx.db
      .query("incidents")
      .filter((q) => q.gte(q.field("callReceivedTime"), startTime))
      .collect();

    // Get all tenants for name lookup
    const tenants = await ctx.db.query("tenants").collect();
    const tenantMap = new Map(tenants.map((t) => [t._id, t]));

    // Group by date and tenant
    const dailyData: Record<
      string,
      { count: number; byTenant: Record<string, number> }
    > = {};

    // Initialize all days in range
    const startDate = new Date(startTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = { count: 0, byTenant: {} };
    }

    // Count incidents
    for (const incident of incidents) {
      const date = new Date(incident.callReceivedTime);
      const dateStr = date.toISOString().split("T")[0];
      const tenantId = incident.tenantId;

      if (dailyData[dateStr]) {
        dailyData[dateStr].count++;
        if (!dailyData[dateStr].byTenant[tenantId]) {
          dailyData[dateStr].byTenant[tenantId] = 0;
        }
        dailyData[dateStr].byTenant[tenantId]++;
      }
    }

    // Convert to array with tenant names
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        count: data.count,
        byTenant: Object.entries(data.byTenant).map(([tenantId, count]) => ({
          tenantId,
          tenantName: tenantMap.get(tenantId as any)?.name || "Unknown",
          count,
        })),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Get detailed tenant health information.
 * Extended version of getSystemHealth with more metrics.
 */
export const getTenantHealthDetails = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return null;
    }

    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    const last24h = now - 24 * 60 * 60 * 1000;

    // Get health details for each tenant
    const healthDetails = await Promise.all(
      tenants.map(async (tenant) => {
        // Sync ages
        const incidentSyncAge = tenant.lastIncidentSync
          ? now - tenant.lastIncidentSync
          : null;
        const weatherSyncAge = tenant.lastWeatherSync
          ? now - tenant.lastWeatherSync
          : null;

        const hasPulsepoint = tenant.pulsepointConfig?.enabled;
        const hasWeather = tenant.weatherZones && tenant.weatherZones.length > 0;

        const incidentSyncStale =
          hasPulsepoint &&
          (incidentSyncAge === null || incidentSyncAge > staleThreshold);
        const weatherSyncStale =
          hasWeather &&
          (weatherSyncAge === null || weatherSyncAge > staleThreshold);

        // Get active incident count
        const activeIncidents = await ctx.db
          .query("incidents")
          .withIndex("by_tenant_status", (q) =>
            q.eq("tenantId", tenant._id).eq("status", "active")
          )
          .collect();

        // Get recent errors for this tenant
        const recentErrors = await ctx.db
          .query("auditLogs")
          .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
          .order("desc")
          .filter((q) => q.eq(q.field("result"), "failure"))
          .take(10);

        const errorsLast24h = recentErrors.filter(
          (e) => e._creationTime >= last24h
        ).length;

        // Get last error timestamp
        const lastError = recentErrors[0];

        // Facebook connection status
        const hasFacebook = !!tenant.facebookPageToken;
        const facebookTokenExpired = !!(
          hasFacebook &&
          tenant.facebookTokenExpiresAt &&
          tenant.facebookTokenExpiresAt < now
        );

        // Calculate sync success rate (from recent audit logs)
        const recentAuditLogs = await ctx.db
          .query("auditLogs")
          .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
          .order("desc")
          .filter((q) => q.gte(q.field("_creationTime"), last24h))
          .take(100);

        const syncLogs = recentAuditLogs.filter(
          (log) => log.action.includes("sync") || log.action.includes("pulsepoint")
        );
        const successfulSyncs = syncLogs.filter(
          (log) => log.result === "success"
        ).length;
        const syncSuccessRate =
          syncLogs.length > 0 ? (successfulSyncs / syncLogs.length) * 100 : 100;

        return {
          tenantId: tenant._id,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          displayName: tenant.displayName,
          // Sync status
          incidentSyncAge,
          weatherSyncAge,
          incidentSyncStale,
          weatherSyncStale,
          hasPulsepoint,
          hasWeather,
          lastIncidentSync: tenant.lastIncidentSync,
          lastWeatherSync: tenant.lastWeatherSync,
          // Incident data
          activeIncidentCount: activeIncidents.length,
          // Error tracking
          errorsLast24h,
          lastErrorTime: lastError?._creationTime || null,
          syncSuccessRate: Math.round(syncSuccessRate),
          // Facebook status
          hasFacebook,
          facebookTokenExpired,
        };
      })
    );

    // Calculate overall stats
    const totalActive = tenants.length;
    const staleSyncs = healthDetails.filter(
      (h) => h.incidentSyncStale || h.weatherSyncStale
    );
    const tenantsWithErrors = healthDetails.filter((h) => h.errorsLast24h > 0);
    const totalErrors = healthDetails.reduce(
      (sum, h) => sum + h.errorsLast24h,
      0
    );

    return {
      totalActive,
      allOperational: staleSyncs.length === 0 && tenantsWithErrors.length === 0,
      staleSyncsCount: staleSyncs.length,
      tenantsWithErrorsCount: tenantsWithErrors.length,
      totalErrorsLast24h: totalErrors,
      healthByTenant: healthDetails,
    };
  },
});

/**
 * Get external service connectivity status.
 * Returns status for PulsePoint, NWS, and Stripe.
 * Note: This is a lightweight check based on recent audit logs, not live pings.
 */
export const getExternalServiceStatus = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return null;
    }

    const now = Date.now();
    const last30min = now - 30 * 60 * 1000;

    // Get recent audit logs for external service interactions
    const recentLogs = await ctx.db.query("auditLogs").order("desc").take(500);

    const recentLogsFiltered = recentLogs.filter(
      (log) => log._creationTime >= last30min
    );

    // Check PulsePoint status
    const pulsepointLogs = recentLogsFiltered.filter(
      (log) =>
        log.action.includes("pulsepoint") || log.action.includes("incident.sync")
    );
    const pulsepointFailures = pulsepointLogs.filter(
      (log) => log.result === "failure"
    );
    const pulsepointStatus =
      pulsepointLogs.length === 0
        ? "unknown"
        : pulsepointFailures.length > pulsepointLogs.length / 2
          ? "error"
          : "ok";

    // Check NWS/Weather status
    const weatherLogs = recentLogsFiltered.filter((log) =>
      log.action.includes("weather")
    );
    const weatherFailures = weatherLogs.filter(
      (log) => log.result === "failure"
    );
    const nwsStatus =
      weatherLogs.length === 0
        ? "unknown"
        : weatherFailures.length > weatherLogs.length / 2
          ? "error"
          : "ok";

    // Check Stripe status
    const stripeLogs = recentLogsFiltered.filter(
      (log) =>
        log.action.includes("stripe") ||
        log.action.includes("billing") ||
        log.action.includes("subscription")
    );
    const stripeFailures = stripeLogs.filter((log) => log.result === "failure");
    const stripeStatus =
      stripeLogs.length === 0
        ? "unknown"
        : stripeFailures.length > stripeLogs.length / 2
          ? "error"
          : "ok";

    // Check Facebook status
    const facebookLogs = recentLogsFiltered.filter((log) =>
      log.action.includes("facebook")
    );
    const facebookFailures = facebookLogs.filter(
      (log) => log.result === "failure"
    );
    const facebookStatus =
      facebookLogs.length === 0
        ? "unknown"
        : facebookFailures.length > facebookLogs.length / 2
          ? "error"
          : "ok";

    return {
      pulsepoint: {
        status: pulsepointStatus as "ok" | "error" | "unknown",
        lastChecked: pulsepointLogs[0]?._creationTime || null,
        recentAttempts: pulsepointLogs.length,
        recentFailures: pulsepointFailures.length,
      },
      nws: {
        status: nwsStatus as "ok" | "error" | "unknown",
        lastChecked: weatherLogs[0]?._creationTime || null,
        recentAttempts: weatherLogs.length,
        recentFailures: weatherFailures.length,
      },
      stripe: {
        status: stripeStatus as "ok" | "error" | "unknown",
        lastChecked: stripeLogs[0]?._creationTime || null,
        recentAttempts: stripeLogs.length,
        recentFailures: stripeFailures.length,
      },
      facebook: {
        status: facebookStatus as "ok" | "error" | "unknown",
        lastChecked: facebookLogs[0]?._creationTime || null,
        recentAttempts: facebookLogs.length,
        recentFailures: facebookFailures.length,
      },
    };
  },
});

/**
 * Get summary statistics for the health dashboard header.
 */
export const getHealthSummary = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return null;
    }

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // Get active tenants
    const activeTenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Get recent errors
    const recentLogs = await ctx.db.query("auditLogs").order("desc").take(1000);

    const errors24h = recentLogs.filter(
      (log) => log._creationTime >= last24h && log.result === "failure"
    );

    const totalAttempts24h = recentLogs.filter(
      (log) =>
        log._creationTime >= last24h &&
        (log.action.includes("sync") ||
          log.action.includes("pulsepoint") ||
          log.action.includes("weather"))
    );

    const errorRate =
      totalAttempts24h.length > 0
        ? (errors24h.length / totalAttempts24h.length) * 100
        : 0;

    // Check for stale syncs
    const staleThreshold = 10 * 60 * 1000;
    const staleSyncs = activeTenants.filter((tenant) => {
      const hasPulsepoint = tenant.pulsepointConfig?.enabled;
      const hasWeather = tenant.weatherZones && tenant.weatherZones.length > 0;

      const incidentSyncStale =
        hasPulsepoint &&
        (!tenant.lastIncidentSync ||
          now - tenant.lastIncidentSync > staleThreshold);
      const weatherSyncStale =
        hasWeather &&
        (!tenant.lastWeatherSync ||
          now - tenant.lastWeatherSync > staleThreshold);

      return incidentSyncStale || weatherSyncStale;
    });

    // Get last successful sync time
    const lastSuccessfulSync = recentLogs.find(
      (log) =>
        (log.action.includes("sync") || log.action.includes("pulsepoint")) &&
        log.result === "success"
    );

    return {
      activeTenants: activeTenants.length,
      staleSyncsCount: staleSyncs.length,
      errors24h: errors24h.length,
      errorRate: Math.round(errorRate * 10) / 10,
      lastSuccessfulSync: lastSuccessfulSync?._creationTime || null,
      allOperational: staleSyncs.length === 0 && errors24h.length === 0,
    };
  },
});

// ===================
// Active Health Checks
// ===================

const HEALTH_CHECK_TIMEOUT_MS = 10000; // 10 second timeout for health checks

/**
 * Fetch with timeout helper for health checks
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check health of a single service
 */
async function checkServiceHealth(
  url: string,
  options: RequestInit = {}
): Promise<{ status: "ok" | "error"; latencyMs: number; statusCode?: number; error?: string }> {
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(url, options);
    const latencyMs = Date.now() - startTime;

    // 2xx or 4xx = service is reachable (4xx just means bad request format)
    // 5xx = service error
    const isOk = response.status < 500;

    return {
      status: isOk ? "ok" : "error",
      latencyMs,
      statusCode: response.status,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      status: "error",
      latencyMs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Actively check external service health by pinging their endpoints.
 * This performs real HTTP requests to verify connectivity.
 */
export const checkExternalServicesHealth = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check all services in parallel
    const [pulsepointResult, nwsResult, stripeResult] = await Promise.all([
      // PulsePoint - use searchagencies endpoint which returns 200
      checkServiceHealth("https://api.pulsepoint.org/v1/webapp?resource=searchagencies"),

      // NWS - base API endpoint returns 200
      checkServiceHealth("https://api.weather.gov", {
        headers: {
          "User-Agent": "Vanguard Emergency Platform",
          Accept: "application/json",
        },
      }),

      // Stripe - dedicated health check endpoint (no auth needed)
      checkServiceHealth("https://api.stripe.com/healthcheck"),
    ]);

    return {
      checkedAt: now,
      pulsepoint: {
        ...pulsepointResult,
        endpoint: "https://api.pulsepoint.org/v1/webapp?resource=searchagencies",
      },
      nws: {
        ...nwsResult,
        endpoint: "https://api.weather.gov",
      },
      stripe: {
        ...stripeResult,
        endpoint: "https://api.stripe.com/healthcheck",
      },
    };
  },
});
