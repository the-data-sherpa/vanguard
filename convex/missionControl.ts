import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// ===================
// Authorization Helper
// ===================

async function requireTenantMember(
  ctx: QueryCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; tenantRole: string }> {
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

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  return { userId: user._id, tenantRole: user.tenantRole || "user" };
}

// ===================
// Types
// ===================

type SyncStatus = "pending" | "posted" | "failed";

interface UnitStatus {
  unitId: string;
  status: string;
  timeDispatched?: number;
  timeAcknowledged?: number;
  timeEnroute?: number;
  timeOnScene?: number;
  timeCleared?: number;
}

/**
 * Helper function to group incidents by groupId
 * Returns one representative incident per group with combined units
 */
function groupIncidents<T extends Doc<"incidents">>(incidents: T[]): (T & { _groupedCount?: number })[] {
  // Group incidents by groupId
  const groupedMap = new Map<string | null, T[]>();

  for (const incident of incidents) {
    const key = incident.groupId ?? null;
    const existing = groupedMap.get(key as string | null);
    if (existing) {
      existing.push(incident);
    } else {
      groupedMap.set(key as string | null, [incident]);
    }
  }

  // Consolidate each group into a single representative incident
  const result: (T & { _groupedCount?: number })[] = [];

  for (const [groupId, groupIncidents] of groupedMap) {
    if (groupId === null || groupIncidents.length === 1) {
      // No group or single incident - return as-is
      result.push(...groupIncidents);
    } else {
      // Multiple incidents in group - consolidate
      // Sort by callReceivedTime to pick the earliest as primary
      groupIncidents.sort((a, b) => a.callReceivedTime - b.callReceivedTime);
      const primary = groupIncidents[0];

      // Combine units from all incidents in the group
      const allUnits = new Set<string>();
      const allUnitStatuses: UnitStatus[] = [];
      const seenUnitIds = new Set<string>();

      for (const inc of groupIncidents) {
        if (inc.units) {
          for (const unit of inc.units) {
            allUnits.add(unit);
          }
        }
        if (inc.unitStatuses && Array.isArray(inc.unitStatuses)) {
          for (const us of inc.unitStatuses as UnitStatus[]) {
            // Avoid duplicates - keep the first occurrence of each unitId
            if (!seenUnitIds.has(us.unitId)) {
              seenUnitIds.add(us.unitId);
              allUnitStatuses.push(us);
            }
          }
        }
      }

      // Create consolidated incident
      result.push({
        ...primary,
        units: Array.from(allUnits),
        unitStatuses: allUnitStatuses.length > 0 ? allUnitStatuses : primary.unitStatuses,
        _groupedCount: groupIncidents.length,
      } as T & { _groupedCount: number });
    }
  }

  // Sort by callReceivedTime descending (most recent first)
  result.sort((a, b) => b.callReceivedTime - a.callReceivedTime);

  return result;
}

// ===================
// Queries
// ===================

/**
 * Get incidents pending Facebook sync
 * Returns active non-medical incidents that haven't been synced yet
 * Grouped by groupId to consolidate related incidents
 */
export const getPendingPosts = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get active incidents that are not synced and not medical
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        q.and(
          // Not synced to Facebook
          q.or(
            q.eq(q.field("isSyncedToFacebook"), false),
            q.eq(q.field("isSyncedToFacebook"), undefined)
          ),
          // Not medical calls
          q.neq(q.field("callTypeCategory"), "medical")
        )
      )
      .order("desc")
      .collect();

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(allIncidents);

    // Take the limit after grouping
    const incidents = groupedIncidents.slice(0, limit);

    // Enrich with update counts
    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const updates = await ctx.db
          .query("incidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        return {
          ...incident,
          syncStatus: "pending" as SyncStatus,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
  },
});

/**
 * Get recently posted incidents
 * Returns non-medical incidents that have been synced to Facebook
 * Grouped by groupId to consolidate related incidents
 */
export const getPostedIncidents = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get incidents that have been synced and not medical
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.neq(q.field("callTypeCategory"), "medical")
        )
      )
      .order("desc")
      .collect();

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(allIncidents);

    // Take the limit after grouping
    const incidents = groupedIncidents.slice(0, limit);

    // Enrich with update counts
    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const updates = await ctx.db
          .query("incidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        return {
          ...incident,
          syncStatus: "posted" as SyncStatus,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
  },
});

/**
 * Get incidents with sync failures
 * Returns non-medical incidents where sync failed
 * Grouped by groupId to consolidate related incidents
 */
export const getFailedPosts = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get incidents with sync errors and not medical
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.neq(q.field("syncError"), undefined),
          q.neq(q.field("syncError"), null),
          q.neq(q.field("syncError"), ""),
          q.neq(q.field("callTypeCategory"), "medical")
        )
      )
      .order("desc")
      .collect();

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(allIncidents);

    // Take the limit after grouping
    const incidents = groupedIncidents.slice(0, limit);

    // Enrich with update counts
    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const updates = await ctx.db
          .query("incidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        return {
          ...incident,
          syncStatus: "failed" as SyncStatus,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
  },
});

/**
 * Get Mission Control dashboard stats
 * Only counts non-medical incidents
 */
export const getDashboardStats = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    await requireTenantMember(ctx, tenantId);

    // Get tenant for Facebook connection status
    const tenant = await ctx.db.get(tenantId);

    // Count active non-medical incidents
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.neq(q.field("callTypeCategory"), "medical"))
      .collect();

    // Group incidents to get accurate count after consolidation
    const groupedIncidents = groupIncidents(activeIncidents);

    // Count by sync status
    let pendingCount = 0;
    let postedCount = 0;
    let failedCount = 0;
    let needsUpdateCount = 0;

    for (const incident of groupedIncidents) {
      if (incident.syncError) {
        failedCount++;
      } else if (incident.isSyncedToFacebook) {
        postedCount++;
        if (incident.needsFacebookUpdate) {
          needsUpdateCount++;
        }
      } else {
        pendingCount++;
      }
    }

    // Count pending updates
    const pendingUpdates = await ctx.db
      .query("incidentUpdates")
      .withIndex("by_tenant_unsync", (q) =>
        q.eq("tenantId", tenantId).eq("isSyncedToFacebook", false)
      )
      .collect();

    return {
      activeIncidents: groupedIncidents.length,
      pendingPosts: pendingCount,
      postedIncidents: postedCount,
      failedPosts: failedCount,
      needsUpdate: needsUpdateCount,
      pendingUpdates: pendingUpdates.length,
      facebookConnected: !!tenant?.facebookPageId,
      facebookPageName: tenant?.facebookPageName,
    };
  },
});

/**
 * Get updates for a specific incident
 */
export const getIncidentUpdates = query({
  args: {
    tenantId: v.id("tenants"),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { tenantId, incidentId }) => {
    await requireTenantMember(ctx, tenantId);

    // Verify incident belongs to tenant
    const incident = await ctx.db.get(incidentId);
    if (!incident || incident.tenantId !== tenantId) {
      return [];
    }

    // Get updates sorted by creation time
    const updates = await ctx.db
      .query("incidentUpdates")
      .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
      .order("desc")
      .collect();

    // Get creator info for each update
    const enrichedUpdates = await Promise.all(
      updates.map(async (update) => {
        // Try to find user by clerkId
        const creator = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", update.createdBy))
          .unique();

        return {
          ...update,
          creatorName: creator?.name || creator?.email || "Unknown",
          creatorAvatar: creator?.avatar,
        };
      })
    );

    return enrichedUpdates;
  },
});

/**
 * Get Facebook connection status for a tenant
 */
export const getFacebookStatus = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    await requireTenantMember(ctx, tenantId);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      return null;
    }

    // Check if token is expired
    const isExpired = tenant.facebookTokenExpiresAt
      ? tenant.facebookTokenExpiresAt < Date.now()
      : false;

    return {
      isConnected: !!tenant.facebookPageId,
      pageId: tenant.facebookPageId,
      pageName: tenant.facebookPageName,
      connectedAt: tenant.facebookConnectedAt,
      connectedBy: tenant.facebookConnectedBy,
      isExpired,
      expiresAt: tenant.facebookTokenExpiresAt,
    };
  },
});

/**
 * Get auto-post rules for a tenant
 */
export const getAutoPostRules = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    await requireTenantMember(ctx, tenantId);

    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Return default rules if none exist
    if (!rules) {
      return {
        enabled: false,
        callTypes: [],
        excludeMedical: true,
        minUnits: undefined,
        delaySeconds: undefined,
      };
    }

    return rules;
  },
});
