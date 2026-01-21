import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getCallTypeCategory, isMedicalCallType } from "./callTypes";

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

/**
 * Check if an incident passes the auto-post rules filter
 * This determines if an incident should appear in Mission Control
 */
function passesAutoPostRulesFilter(
  incident: Doc<"incidents">,
  rules: Doc<"autoPostRules"> | null
): boolean {
  // If no rules exist, use default behavior (show non-medical)
  if (!rules) {
    return incident.callTypeCategory !== "medical";
  }

  // If auto-posting is disabled, use default behavior (show non-medical)
  // This allows manual posting of any non-medical incidents
  if (!rules.enabled) {
    return incident.callTypeCategory !== "medical";
  }

  // Get the incident's category using proper call type lookup
  const incidentCategory = getCallTypeCategory(incident.callType);
  const incidentDescription = incident.callType.toLowerCase();

  // Check call type filter - if user has selected specific types, only show those
  if (rules.callTypes.length > 0) {
    const matchesCallType = rules.callTypes.some((ct) => {
      const ctLower = ct.toLowerCase();
      // Match by category (e.g., "fire", "medical", "rescue")
      if (ctLower === incidentCategory) return true;
      // Match by specific call type code
      if (ctLower === incident.callType.toLowerCase()) return true;
      // Match if the category name contains the filter
      if (incidentCategory.includes(ctLower)) return true;
      // Match by description
      if (incidentDescription.includes(ctLower)) return true;
      return false;
    });

    if (!matchesCallType) {
      return false;
    }
  }

  // Check medical exclusion
  if (rules.excludeMedical) {
    if (isMedicalCallType(incident.callType)) {
      return false;
    }
  }

  // Check minimum units threshold
  if (rules.minUnits && rules.minUnits > 0) {
    const unitCount = incident.units?.length || 0;
    if (unitCount < rules.minUnits) {
      return false;
    }
  }

  return true;
}

// ===================
// Queries
// ===================

/**
 * Get incidents pending Facebook sync
 * Returns active incidents that haven't been synced yet and pass auto-post rules
 * Grouped by groupId to consolidate related incidents
 */
export const getPendingPosts = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get active incidents that are not synced
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        // Not synced to Facebook
        q.or(
          q.eq(q.field("isSyncedToFacebook"), false),
          q.eq(q.field("isSyncedToFacebook"), undefined)
        )
      )
      .order("desc")
      .collect();

    // Filter by auto-post rules
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(filteredIncidents);

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
 * Returns incidents that have been synced to Facebook and pass auto-post rules
 * Grouped by groupId to consolidate related incidents
 */
export const getPostedIncidents = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get incidents that have been synced
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.eq(q.field("isSyncedToFacebook"), true))
      .order("desc")
      .collect();

    // Filter by auto-post rules
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(filteredIncidents);

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
 * Returns incidents where sync failed and pass auto-post rules
 * Grouped by groupId to consolidate related incidents
 */
export const getFailedPosts = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get incidents with sync errors
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.neq(q.field("syncError"), undefined),
          q.neq(q.field("syncError"), null),
          q.neq(q.field("syncError"), "")
        )
      )
      .order("desc")
      .collect();

    // Filter by auto-post rules
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(filteredIncidents);

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
 * Only counts incidents that pass auto-post rules
 */
export const getDashboardStats = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    await requireTenantMember(ctx, tenantId);

    // Get tenant for Facebook connection status
    const tenant = await ctx.db.get(tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Count active incidents (qualifying for posting)
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("isSyncedToFacebook"), false),
          q.eq(q.field("isSyncedToFacebook"), undefined)
        )
      )
      .collect();

    // Filter by auto-post rules
    const filteredActiveIncidents = activeIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents to get accurate count after consolidation
    const groupedActiveIncidents = groupIncidents(filteredActiveIncidents);

    // Count active incidents needing update (posted but has pending updates)
    const activeNeedingUpdate = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .collect();

    // Filter by auto-post rules
    const filteredActiveNeedingUpdate = activeNeedingUpdate.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    const groupedActiveNeedingUpdate = groupIncidents(filteredActiveNeedingUpdate);

    // Count closed incidents needing update
    const closedNeedingUpdate = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "closed")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .collect();

    // Filter by auto-post rules
    const filteredClosedNeedingUpdate = closedNeedingUpdate.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    const groupedClosedNeedingUpdate = groupIncidents(filteredClosedNeedingUpdate);

    return {
      activeQualifying: groupedActiveIncidents.length,
      activeNeedingUpdate: groupedActiveNeedingUpdate.length,
      closedNeedingUpdate: groupedClosedNeedingUpdate.length,
      totalPendingSync: groupedActiveIncidents.length + groupedActiveNeedingUpdate.length + groupedClosedNeedingUpdate.length,
      facebookConnected: !!tenant?.facebookPageId,
      facebookPageName: tenant?.facebookPageName,
    };
  },
});

/**
 * Get active incidents that need Facebook updates (already posted but have new updates)
 */
export const getActiveIncidentsNeedingUpdate = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get active incidents that are synced but need updates
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .order("desc")
      .collect();

    // Filter by auto-post rules
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(filteredIncidents);
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
          syncStatus: "pending_update" as const,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
  },
});

/**
 * Get closed incidents that need Facebook updates (status changed to closed)
 */
export const getClosedIncidentsNeedingUpdate = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 50 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get closed incidents that need Facebook update
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "closed")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .order("desc")
      .collect();

    // Filter by auto-post rules
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group incidents by groupId
    const groupedIncidents = groupIncidents(filteredIncidents);
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
          syncStatus: "pending_close" as const,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
  },
});

/**
 * Get ALL incidents for Mission Control
 * Returns:
 * - All active incidents that pass auto-post rules
 * - Closed incidents that still need Facebook update and pass auto-post rules
 * Each incident has a posting status for display
 */
export const getAllMissionControlIncidents = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 100 }) => {
    await requireTenantMember(ctx, tenantId);

    // Get auto-post rules for filtering
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Get ALL active incidents
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .order("desc")
      .collect();

    // Get closed incidents that need Facebook update
    const closedNeedingUpdate = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "closed")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .order("desc")
      .collect();

    // Combine and filter by auto-post rules
    const allIncidents = [...activeIncidents, ...closedNeedingUpdate];
    const filteredIncidents = allIncidents.filter((incident) =>
      passesAutoPostRulesFilter(incident, rules)
    );

    // Group filtered incidents
    const groupedIncidents = groupIncidents(filteredIncidents);
    const incidents = groupedIncidents.slice(0, limit);

    // Determine posting status for each incident
    type PostingStatus = "pending" | "posted" | "pending_update" | "pending_close" | "failed";

    const enrichedIncidents = await Promise.all(
      incidents.map(async (incident) => {
        const updates = await ctx.db
          .query("incidentUpdates")
          .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
          .collect();

        // Determine posting status
        let postingStatus: PostingStatus;

        if (incident.syncError) {
          postingStatus = "failed";
        } else if (incident.status === "closed" && incident.needsFacebookUpdate) {
          postingStatus = "pending_close";
        } else if (incident.needsFacebookUpdate) {
          postingStatus = "pending_update";
        } else if (incident.isSyncedToFacebook) {
          postingStatus = "posted";
        } else {
          postingStatus = "pending";
        }

        return {
          ...incident,
          syncStatus: postingStatus,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSyncedToFacebook).length,
        };
      })
    );

    return enrichedIncidents;
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
 * Returns both legacy single-page info and multi-page info
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

    const now = Date.now();
    const pages = tenant.facebookPages || [];

    // Check if any page token is expired
    const hasExpiredToken = pages.some((p) => p.tokenExpiresAt && p.tokenExpiresAt < now);
    const legacyIsExpired = tenant.facebookTokenExpiresAt
      ? tenant.facebookTokenExpiresAt < now
      : false;

    // Determine if connected (has pages in new array or legacy fields)
    const isConnected = pages.length > 0 || !!tenant.facebookPageId;

    // Map pages with expiration status
    const pagesWithStatus = pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      connectedBy: p.connectedBy,
      connectedAt: p.connectedAt,
      tokenExpiresAt: p.tokenExpiresAt,
      isExpired: p.tokenExpiresAt ? p.tokenExpiresAt < now : false,
      isActive: p.pageId === tenant.activeFacebookPageId,
    }));

    return {
      isConnected,
      // Legacy single-page fields (for backward compatibility)
      pageId: tenant.facebookPageId,
      pageName: tenant.facebookPageName,
      connectedAt: tenant.facebookConnectedAt,
      connectedBy: tenant.facebookConnectedBy,
      isExpired: hasExpiredToken || legacyIsExpired,
      expiresAt: tenant.facebookTokenExpiresAt,
      // Multi-page fields
      pages: pagesWithStatus,
      activePageId: tenant.activeFacebookPageId,
      activePageName: pages.find((p) => p.pageId === tenant.activeFacebookPageId)?.pageName || tenant.facebookPageName,
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
