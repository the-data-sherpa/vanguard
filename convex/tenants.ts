import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helpers
// ===================

/**
 * Verify that the current user is authenticated and has access to the specified tenant
 * with at least the required role level.
 *
 * Role hierarchy: owner > admin > moderator > member
 */
async function requireTenantAccess(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  requiredRole: "member" | "moderator" | "admin" | "owner" = "admin"
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  // Look up user by email (most reliable identifier from auth providers)
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

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  // Verify user belongs to the requested tenant
  // Note: Platform admins do NOT have automatic tenant access - they must be explicitly added
  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  // Check role hierarchy
  const roleHierarchy: Record<string, number> = {
    member: 1,
    moderator: 2,
    admin: 3,
    owner: 4,
  };

  const userRoleLevel = roleHierarchy[user.tenantRole || "member"] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: requires ${requiredRole} role or higher`);
  }

  return { userId: user._id, tenantRole: user.tenantRole || "member" };
}

// NWS zone format validation
// Valid formats: state code (2 letters) + zone type (C or Z) + zone number (3 digits)
// Examples: NCZ036, ALZ001, NYC001, CAC006
const NWS_ZONE_PATTERN = /^[A-Z]{2}[CZ]\d{3}$/;

function isValidNWSZone(zone: string): boolean {
  return NWS_ZONE_PATTERN.test(zone);
}

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
 * Requires admin or owner role
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
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    await ctx.db.patch(tenantId, {
      pulsepointConfig: config,
    });
  },
});

/**
 * Update tenant weather zones
 * Requires admin or owner role
 * Validates that zones match NWS zone format (e.g., NCZ036, ALZ001)
 */
export const updateWeatherZones = mutation({
  args: {
    tenantId: v.id("tenants"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, { tenantId, zones }) => {
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    // Validate zone format
    const invalidZones = zones.filter((zone) => !isValidNWSZone(zone));
    if (invalidZones.length > 0) {
      throw new Error(
        `Invalid NWS zone format: ${invalidZones.join(", ")}. ` +
          `Zones must match format like NCZ036 or ALZ001 (2-letter state + C/Z + 3 digits)`
      );
    }

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
 * Requires admin or owner role
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
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    await ctx.db.patch(tenantId, {
      unitLegend: legend,
      unitLegendUpdatedAt: Date.now(),
      unitLegendAvailable: true,
    });
  },
});
