import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helpers
// ===================

/**
 * Verify that the current user is authenticated and has access to the specified tenant
 * with at least the required role level.
 *
 * Role hierarchy: owner > user
 */
async function requireTenantAccess(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  requiredRole: "user" | "owner" = "owner"
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
    user: 1,
    owner: 2,
  };

  const userRoleLevel = roleHierarchy[user.tenantRole || "user"] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: requires ${requiredRole} role or higher`);
  }

  return { userId: user._id, tenantRole: user.tenantRole || "user" };
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
 * Get a tenant by ID (internal use - for HTTP endpoints)
 */
export const getByIdInternal = internalQuery({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db.get(tenantId);
  },
});

/**
 * List all tenants (for admin/maintenance jobs)
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tenants").collect();
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

// Trial duration constant
const TRIAL_DURATION_DAYS = 14;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Create a new tenant (admin only)
 * Supports pro bono tenants and assigning an initial owner
 */
export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    // Admin-only options
    proBono: v.optional(v.boolean()),
    ownerEmail: v.optional(v.string()),
    // Optional initial config
    pulsepointAgencyId: v.optional(v.string()),
    weatherZones: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify caller is a platform admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new Error("Authentication required");
    }

    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!adminUser || adminUser.role !== "platform_admin") {
      throw new Error("Platform admin access required");
    }

    // Check if slug is already taken
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Tenant with slug "${args.slug}" already exists`);
    }

    // Determine subscription status and trial dates
    const isProBono = args.proBono === true;
    const trialEndsAt = isProBono ? undefined : Date.now() + TRIAL_DURATION_MS;
    const subscriptionStatus = isProBono ? "pro_bono" : "trialing";

    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      slug: args.slug,
      name: args.name,
      displayName: args.displayName,
      status: "active",
      tier: "starter",
      subscriptionStatus,
      trialEndsAt,
      features: {
        weatherAlerts: true,
      },
      // Optional initial config
      pulsepointConfig: args.pulsepointAgencyId
        ? {
            enabled: true,
            agencyIds: [args.pulsepointAgencyId],
            syncInterval: 30000,
          }
        : undefined,
      weatherZones: args.weatherZones,
    });

    // Log tenant creation
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: adminUser._id,
      actorType: "user",
      action: "tenant.created",
      targetType: "tenant",
      targetId: tenantId,
      details: {
        method: "admin",
        proBono: isProBono,
        ownerEmail: args.ownerEmail,
      },
      result: "success",
    });

    if (!isProBono) {
      // Log trial started for non-pro-bono tenants
      await ctx.db.insert("auditLogs", {
        tenantId,
        actorId: "system",
        actorType: "system",
        action: "billing.trial_started",
        targetType: "tenant",
        targetId: tenantId,
        details: { trialEndsAt, trialDays: TRIAL_DURATION_DAYS },
        result: "success",
      });
    }

    // Handle owner assignment/invitation
    if (args.ownerEmail) {
      const ownerEmail = args.ownerEmail.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", ownerEmail))
        .unique();

      if (existingUser) {
        // User exists - check if they already belong to a tenant
        if (existingUser.tenantId) {
          throw new Error(`User ${ownerEmail} already belongs to another tenant`);
        }

        // Assign existing user as owner
        await ctx.db.patch(existingUser._id, {
          tenantId,
          tenantRole: "owner",
        });

        await ctx.db.insert("auditLogs", {
          tenantId,
          actorId: adminUser._id,
          actorType: "user",
          action: "user.assigned_owner",
          targetType: "user",
          targetId: existingUser._id,
          details: { email: ownerEmail },
          result: "success",
        });
      } else {
        // Create pending user as owner (will be activated when they sign up)
        const newUserId = await ctx.db.insert("users", {
          email: ownerEmail,
          emailVisibility: false,
          verified: false,
          role: "user",
          tenantId,
          tenantRole: "owner",
          isActive: false,
          isBanned: false,
        });

        await ctx.db.insert("auditLogs", {
          tenantId,
          actorId: adminUser._id,
          actorType: "user",
          action: "user.invited_owner",
          targetType: "user",
          targetId: newUserId,
          details: { email: ownerEmail },
          result: "success",
        });
      }
    }

    // Schedule Stripe customer creation for non-pro-bono tenants
    if (!isProBono && args.ownerEmail) {
      await ctx.scheduler.runAfter(0, internal.stripe.createCustomer, {
        tenantId,
        email: args.ownerEmail,
        name: args.displayName || args.name,
      });
    }

    // If PulsePoint agency configured, schedule unit legend sync
    if (args.pulsepointAgencyId) {
      await ctx.scheduler.runAfter(0, internal.sync.syncUnitLegendForTenant, {
        tenantId,
      });
    }

    return tenantId;
  },
});

/**
 * Create a new tenant as the owner (self-service signup)
 * User must be authenticated and not already belong to a tenant
 *
 * Creates tenant in "pending_approval" status - requires admin approval
 * before trial starts.
 */
export const createAsOwner = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    // Optional initial configuration
    pulsepointAgencyId: v.optional(v.string()),
    weatherZones: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get current user
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
      throw new Error("User not found. Please try signing out and back in.");
    }

    if (user.isBanned) {
      throw new Error("User is banned");
    }

    // Check if user already has a tenant
    if (user.tenantId) {
      throw new Error("User already belongs to a tenant");
    }

    // Check if user already owns a tenant (limit: 1 tenant per user)
    const existingOwnedTenants = await ctx.db
      .query("tenants")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    if (existingOwnedTenants.length >= 1) {
      throw new Error("You have reached the maximum number of organizations allowed");
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(args.slug)) {
      throw new Error("Slug must only contain lowercase letters, numbers, and hyphens");
    }

    if (args.slug.length < 3) {
      throw new Error("Slug must be at least 3 characters");
    }

    if (args.slug.length > 50) {
      throw new Error("Slug must be 50 characters or less");
    }

    // Check if slug is already taken
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) {
      throw new Error(`Slug "${args.slug}" is already taken`);
    }

    // Create the tenant in pending_approval status (no trial yet)
    const tenantId = await ctx.db.insert("tenants", {
      slug: args.slug,
      name: args.name,
      displayName: args.displayName,
      status: "pending_approval",  // Requires admin approval
      tier: "starter",
      // No trial until approved:
      subscriptionStatus: undefined,
      trialEndsAt: undefined,
      ownerId: user._id,
      features: {
        weatherAlerts: true,
      },
      // Optional initial config
      pulsepointConfig: args.pulsepointAgencyId
        ? {
            enabled: true,
            agencyIds: [args.pulsepointAgencyId],
            syncInterval: 30000, // 30 seconds
          }
        : undefined,
      weatherZones: args.weatherZones,
    });

    // Assign user as owner
    await ctx.db.patch(user._id, {
      tenantId,
      tenantRole: "owner",
      lastTenantCreatedAt: Date.now(),
    });

    // Log tenant creation (pending approval)
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: user._id,
      actorType: "user",
      action: "tenant.created",
      targetType: "tenant",
      targetId: tenantId,
      details: {
        method: "self_service",
        status: "pending_approval",
      },
      result: "success",
    });

    return { tenantId, slug: args.slug };
  },
});

/**
 * Check if a slug is available
 */
export const checkSlugAvailable = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    return { available: !existing };
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
    await requireTenantAccess(ctx, tenantId, "owner");

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
    await requireTenantAccess(ctx, tenantId, "owner");

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
    await requireTenantAccess(ctx, tenantId, "owner");

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
    await requireTenantAccess(ctx, tenantId, "owner");

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
    await requireTenantAccess(ctx, tenantId, "owner");

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
