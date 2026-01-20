import { v } from "convex/values";
import { query, mutation, action, QueryCtx, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helpers
// ===================

/**
 * Verify that the current user is a platform admin.
 * This is the ONLY role check for admin dashboard access.
 */
async function requirePlatformAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throw new Error("User email not available");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "platform_admin") {
    throw new Error("Access denied: platform admin role required");
  }

  return user;
}

/**
 * Get current user for queries (returns null if not platform admin instead of throwing)
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
// Queries
// ===================

/**
 * Check if current user is a platform admin
 */
export const isPlatformAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    return admin !== null;
  },
});

/**
 * List all tenants with key stats
 */
export const listAllTenants = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const tenants = await ctx.db.query("tenants").collect();

    // Get user counts for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const users = await ctx.db
          .query("users")
          .withIndex("by_tenant", (q) => q.eq("tenantId", tenant._id))
          .collect();

        return {
          _id: tenant._id,
          slug: tenant.slug,
          name: tenant.name,
          displayName: tenant.displayName,
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          lastIncidentSync: tenant.lastIncidentSync,
          lastWeatherSync: tenant.lastWeatherSync,
          userCount: users.length,
        };
      })
    );

    return tenantsWithStats;
  },
});

/**
 * Get platform-wide statistics
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return null;
    }

    const tenants = await ctx.db.query("tenants").collect();
    const users = await ctx.db.query("users").collect();

    // Today's incidents
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const todaysIncidents = await ctx.db
      .query("incidents")
      .filter((q) => q.gte(q.field("callReceivedTime"), todayStartMs))
      .collect();

    // Active weather alerts
    const now = Date.now();
    const activeAlerts = await ctx.db
      .query("weatherAlerts")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.gt(q.field("expires"), now)
        )
      )
      .collect();

    // Tier breakdown
    const tierBreakdown = {
      free: 0,
      starter: 0,
      professional: 0,
      enterprise: 0,
    };
    for (const tenant of tenants) {
      tierBreakdown[tenant.tier]++;
    }

    // Status counts
    const activeTenants = tenants.filter((t) => t.status === "active").length;
    const suspendedTenants = tenants.filter((t) => t.status === "suspended").length;

    return {
      totalTenants: tenants.length,
      activeTenants,
      suspendedTenants,
      totalUsers: users.length,
      totalIncidentsToday: todaysIncidents.length,
      totalActiveAlerts: activeAlerts.length,
      tierBreakdown,
    };
  },
});

/**
 * Get system health - sync status per tenant
 * Flags tenants with stale syncs (>10 minutes)
 */
export const getSystemHealth = query({
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

    const healthStatus = tenants.map((tenant) => {
      const incidentSyncAge = tenant.lastIncidentSync
        ? now - tenant.lastIncidentSync
        : null;
      const weatherSyncAge = tenant.lastWeatherSync
        ? now - tenant.lastWeatherSync
        : null;

      const hasPulsepoint = tenant.pulsepointConfig?.enabled;
      const hasWeather = tenant.weatherZones && tenant.weatherZones.length > 0;

      const incidentSyncStale = hasPulsepoint &&
        (incidentSyncAge === null || incidentSyncAge > staleThreshold);
      const weatherSyncStale = hasWeather &&
        (weatherSyncAge === null || weatherSyncAge > staleThreshold);

      return {
        tenantId: tenant._id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        incidentSyncAge,
        weatherSyncAge,
        incidentSyncStale,
        weatherSyncStale,
        hasPulsepoint,
        hasWeather,
      };
    });

    const staleSyncs = healthStatus.filter(
      (h) => h.incidentSyncStale || h.weatherSyncStale
    );

    return {
      allOperational: staleSyncs.length === 0,
      totalActive: tenants.length,
      staleSyncs,
      healthByTenant: healthStatus,
    };
  },
});

/**
 * Get full details for a specific tenant
 */
export const getTenantDetails = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return null;
    }

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      return null;
    }

    // Get user count
    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Get active incident count
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .collect();

    // Get active alert count
    const now = Date.now();
    const activeAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();

    return {
      ...tenant,
      userCount: users.length,
      activeIncidentCount: activeIncidents.length,
      activeAlertCount: activeAlerts.length,
    };
  },
});

// ===================
// Mutations
// ===================

/**
 * Suspend a tenant
 */
export const suspendTenant = mutation({
  args: {
    tenantId: v.id("tenants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, reason }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.status === "suspended") {
      throw new Error("Tenant is already suspended");
    }

    // Update tenant status
    await ctx.db.patch(tenantId, {
      status: "suspended",
      deactivatedAt: Date.now(),
      deactivatedReason: reason,
    });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.suspend",
      targetType: "tenant",
      targetId: tenantId,
      details: { reason },
      result: "success",
    });
  },
});

/**
 * Reactivate a suspended tenant
 */
export const reactivateTenant = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.status !== "suspended") {
      throw new Error("Tenant is not suspended");
    }

    // Update tenant status
    await ctx.db.patch(tenantId, {
      status: "active",
      deactivatedAt: undefined,
      deactivatedReason: undefined,
    });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.reactivate",
      targetType: "tenant",
      targetId: tenantId,
      result: "success",
    });
  },
});

/**
 * Update tenant tier
 */
export const updateTenantTier = mutation({
  args: {
    tenantId: v.id("tenants"),
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, { tenantId, tier }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const previousTier = tenant.tier;

    await ctx.db.patch(tenantId, { tier });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.tier_change",
      targetType: "tenant",
      targetId: tenantId,
      details: { previousTier, newTier: tier },
      result: "success",
    });
  },
});

/**
 * Schedule tenant for deletion
 * Sets status to pending_deletion and schedules permanent deletion for 30 days from now
 */
export const scheduleTenantDeletion = mutation({
  args: {
    tenantId: v.id("tenants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, reason }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.status === "pending_deletion") {
      throw new Error("Tenant is already scheduled for deletion");
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const deletionScheduledAt = Date.now() + THIRTY_DAYS_MS;

    // Store previous status so we can restore if cancelled
    const previousStatus = tenant.status;

    await ctx.db.patch(tenantId, {
      status: "pending_deletion",
      deletionScheduledAt,
      deactivatedAt: Date.now(),
      deactivatedReason: reason || `Scheduled for deletion (was: ${previousStatus})`,
    });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.schedule_deletion",
      targetType: "tenant",
      targetId: tenantId,
      details: { reason, previousStatus, deletionScheduledAt },
      result: "success",
    });
  },
});

/**
 * Cancel scheduled tenant deletion
 * Restores tenant to active status
 */
export const cancelTenantDeletion = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (tenant.status !== "pending_deletion") {
      throw new Error("Tenant is not scheduled for deletion");
    }

    await ctx.db.patch(tenantId, {
      status: "active",
      deletionScheduledAt: undefined,
      deactivatedAt: undefined,
      deactivatedReason: undefined,
    });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.cancel_deletion",
      targetType: "tenant",
      targetId: tenantId,
      result: "success",
    });
  },
});

/**
 * Update tenant feature flags (platform admin override)
 */
export const updateTenantFeatures = mutation({
  args: {
    tenantId: v.id("tenants"),
    features: v.object({
      facebook: v.optional(v.boolean()),
      twitter: v.optional(v.boolean()),
      instagram: v.optional(v.boolean()),
      discord: v.optional(v.boolean()),
      weatherAlerts: v.optional(v.boolean()),
      userSubmissions: v.optional(v.boolean()),
      forum: v.optional(v.boolean()),
      customBranding: v.optional(v.boolean()),
      apiAccess: v.optional(v.boolean()),
      advancedAnalytics: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { tenantId, features }) => {
    const admin = await requirePlatformAdmin(ctx);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Merge new features with existing
    const updatedFeatures = {
      ...tenant.features,
      ...features,
    };

    await ctx.db.patch(tenantId, {
      features: updatedFeatures,
    });

    // Log to audit
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: admin._id,
      actorType: "user",
      action: "tenant.features_update",
      targetType: "tenant",
      targetId: tenantId,
      details: { features },
      result: "success",
    });
  },
});

/**
 * Get all tenants scheduled for deletion (for cron job)
 */
export const getTenantsScheduledForDeletion = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const now = Date.now();

    // Get tenants that are pending deletion and past their deletion date
    const tenants = await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "pending_deletion"))
      .collect();

    return tenants.filter(
      (t) => t.deletionScheduledAt && t.deletionScheduledAt <= now
    );
  },
});

/**
 * Get users for a specific tenant (admin view)
 */
export const getTenantUsers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      tenantRole: u.tenantRole,
      isActive: u.isActive,
      isBanned: u.isBanned,
      lastLoginAt: u.lastLoginAt,
    }));
  },
});

/**
 * Get recent audit logs for a tenant
 */
export const getTenantAuditLogs = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    const admin = await getCurrentPlatformAdmin(ctx);
    if (!admin) {
      return [];
    }

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Trigger immediate sync for a tenant
 * This is an action because it calls other actions
 */
export const triggerTenantSync = action({
  args: {
    tenantId: v.id("tenants"),
    syncType: v.union(
      v.literal("incident"),
      v.literal("weather"),
      v.literal("unitLegend")
    ),
  },
  handler: async (ctx, { tenantId, syncType }) => {
    // Get tenant to verify it exists and get config
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Run the appropriate sync
    if (syncType === "incident") {
      if (!tenant.pulsepointConfig?.enabled || !tenant.pulsepointConfig?.agencyIds?.length) {
        return { success: false, syncType, error: "PulsePoint not configured" };
      }
      await ctx.runAction(internal.sync.syncPulsePointForTenant, {
        tenantId,
        agencyIds: tenant.pulsepointConfig.agencyIds,
      });
    } else if (syncType === "weather") {
      if (!tenant.weatherZones?.length) {
        return { success: false, syncType, error: "Weather zones not configured" };
      }
      await ctx.runAction(internal.sync.syncWeatherForTenant, {
        tenantId,
        zones: tenant.weatherZones,
      });
    } else if (syncType === "unitLegend") {
      if (!tenant.pulsepointConfig?.agencyIds?.length) {
        return { success: false, syncType, error: "PulsePoint agencies not configured" };
      }
      await ctx.runAction(internal.sync.syncUnitLegendForTenant, {
        tenantId,
      });
    }

    return { success: true, syncType };
  },
});
