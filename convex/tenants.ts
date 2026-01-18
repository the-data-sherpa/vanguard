import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Queries
// ===================

/**
 * Get a tenant by slug (for middleware/routing)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

/**
 * Get a tenant by ID
 */
export const get = query({
  args: { id: v.id("tenants") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * List all active tenants (for admin or cron jobs)
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * Get tenant stats for dashboard
 */
export const getStats = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    // Get active incidents
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .collect();

    // Get today's incidents
    const todaysIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.gte(q.field("callReceivedTime"), todayStartMs))
      .collect();

    // Get active weather alerts
    const activeAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();

    // Count active units across all active incidents
    const activeUnits = new Set<string>();
    for (const incident of activeIncidents) {
      if (incident.units) {
        incident.units.forEach((unit) => activeUnits.add(unit));
      }
    }

    // Count by category
    const categoryBreakdown: Record<string, number> = {};
    for (const incident of activeIncidents) {
      const category = incident.callTypeCategory || "other";
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    }

    return {
      activeIncidentCount: activeIncidents.length,
      todaysCallCount: todaysIncidents.length,
      activeUnitCount: activeUnits.size,
      activeAlertCount: activeAlerts.length,
      categoryBreakdown,
    };
  },
});

// ===================
// Mutations
// ===================

/**
 * Create a new tenant
 */
export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("professional"),
      v.literal("enterprise")
    ),
  },
  handler: async (ctx, args) => {
    // Check if slug is already taken
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Tenant with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("tenants", {
      slug: args.slug,
      name: args.name,
      displayName: args.displayName,
      status: "active",
      tier: args.tier,
      features: {
        weatherAlerts: true,
      },
    });
  },
});

/**
 * Update tenant PulsePoint configuration
 */
export const updatePulsepointConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    config: v.object({
      enabled: v.boolean(),
      agencyIds: v.array(v.string()),
      syncInterval: v.number(),
      callTypes: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { tenantId, config }) => {
    await ctx.db.patch(tenantId, {
      pulsepointConfig: config,
    });
  },
});

/**
 * Update tenant weather zones
 */
export const updateWeatherZones = mutation({
  args: {
    tenantId: v.id("tenants"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, { tenantId, zones }) => {
    await ctx.db.patch(tenantId, {
      weatherZones: zones,
    });
  },
});

/**
 * Update last sync timestamp (internal use)
 */
export const updateSyncTimestamp = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    type: v.union(v.literal("incident"), v.literal("weather")),
  },
  handler: async (ctx, { tenantId, type }) => {
    const update =
      type === "incident"
        ? { lastIncidentSync: Date.now() }
        : { lastWeatherSync: Date.now() };

    await ctx.db.patch(tenantId, update);
  },
});

/**
 * Update unit legend
 */
export const updateUnitLegend = mutation({
  args: {
    tenantId: v.id("tenants"),
    legend: v.array(
      v.object({
        UnitKey: v.string(),
        Description: v.string(),
      })
    ),
  },
  handler: async (ctx, { tenantId, legend }) => {
    await ctx.db.patch(tenantId, {
      unitLegend: legend,
      unitLegendUpdatedAt: Date.now(),
      unitLegendAvailable: true,
    });
  },
});
