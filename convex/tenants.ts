import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
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
 *
 * When agency IDs change:
 * - Requires deleteExistingIncidents=true to confirm deletion
 * - Deletes all existing incidents, notes, and groups
 * - Clears unit legend (will be re-synced)
 * - Schedules immediate unit legend sync for new agency
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
    deleteExistingIncidents: v.optional(v.boolean()),
  },
  handler: async (ctx, { tenantId, config, deleteExistingIncidents }) => {
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    // Get current tenant to check for agency change
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Check if agency IDs are changing
    const currentAgencyIds = tenant.pulsepointConfig?.agencyIds || [];
    const newAgencyIds = config.agencyIds;
    const agencyIdsChanged =
      currentAgencyIds.length !== newAgencyIds.length ||
      !currentAgencyIds.every((id, i) => id === newAgencyIds[i]);

    // If agency is changing and there are existing incidents, require confirmation
    if (agencyIdsChanged && currentAgencyIds.length > 0) {
      if (!deleteExistingIncidents) {
        // Throw special error that frontend can catch
        throw new Error("AGENCY_CHANGE_REQUIRES_CONFIRMATION");
      }

      // Delete all existing incident data for this tenant
      await ctx.runMutation(internal.incidents.deleteAllIncidentDataForTenant, {
        tenantId,
      });

      // Clear unit legend since it's agency-specific
      await ctx.db.patch(tenantId, {
        unitLegend: undefined,
        unitLegendUpdatedAt: undefined,
        unitLegendAvailable: undefined,
      });

      console.log(`[Tenants] Agency changed for tenant ${tenantId}: cleared all incident data and unit legend`);
    }

    // Update the config
    await ctx.db.patch(tenantId, {
      pulsepointConfig: config,
    });

    // If agency changed and new agencies are configured, schedule immediate unit legend sync
    if (agencyIdsChanged && newAgencyIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.sync.syncUnitLegendForTenant, {
        tenantId,
      });
      console.log(`[Tenants] Scheduled unit legend sync for tenant ${tenantId}`);
    }
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
 * Update unit legend from automated sync (internal use)
 * Sets unitLegendAvailable to false if legend is null (404 from API)
 */
export const updateUnitLegendFromSync = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    legend: v.union(
      v.null(),
      v.array(
        v.object({
          UnitKey: v.string(),
          Description: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, { tenantId, legend }) => {
    if (legend === null) {
      // API returned 404 or error - mark as unavailable
      await ctx.db.patch(tenantId, {
        unitLegendAvailable: false,
      });
      console.log(`[Tenants] Unit legend not available for tenant ${tenantId}`);
    } else {
      // Successfully fetched legend
      await ctx.db.patch(tenantId, {
        unitLegend: legend,
        unitLegendUpdatedAt: Date.now(),
        unitLegendAvailable: true,
      });
      console.log(`[Tenants] Updated unit legend for tenant ${tenantId}: ${legend.length} entries`);
    }
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

/**
 * Update tenant branding settings
 * Requires admin or owner role
 */
export const updateBranding = mutation({
  args: {
    tenantId: v.id("tenants"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, displayName, description, logoUrl, primaryColor }) => {
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    // Validate primary color format if provided
    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      throw new Error("Invalid color format. Use hex format like #3b82f6");
    }

    const updates: Record<string, string | undefined> = {};
    if (displayName !== undefined) updates.displayName = displayName || undefined;
    if (description !== undefined) updates.description = description || undefined;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl || undefined;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor || undefined;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(tenantId, updates);
    }
  },
});

/**
 * Update tenant feature toggles
 * Requires admin or owner role
 */
export const updateFeatures = mutation({
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
    // Verify user has admin access to this tenant
    await requireTenantAccess(ctx, tenantId, "admin");

    // Get current tenant to merge features
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
  },
});
