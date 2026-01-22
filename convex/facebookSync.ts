import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { applyTemplate, getDefaultTemplateObject, DEFAULT_TEMPLATE_STRING, UnitLegendEntry } from "./postTemplates";
import { getCallTypeDescription, getCallTypeCategory, isMedicalCallType, formatUnitStatusCode } from "./callTypes";

// ===================
// Constants
// ===================

/**
 * Maximum number of Facebook sync attempts before giving up
 * Prevents infinite retry loops for permanent failures (e.g., invalid tokens)
 */
const MAX_SYNC_ATTEMPTS = 3;

// ===================
// Types
// ===================

interface UnitStatus {
  unitId: string;
  status: string;
  timeDispatched?: number;
  timeAcknowledged?: number;
  timeEnroute?: number;
  timeOnScene?: number;
  timeCleared?: number;
}

// ===================
// Post Formatting (Fallback when no template)
// ===================

/**
 * Look up unit description from legend
 * Returns the description if found, otherwise returns the original unit ID
 */
function getUnitDisplayName(unitId: string, unitLegend?: UnitLegendEntry[]): string {
  if (!unitLegend || unitLegend.length === 0) {
    return unitId;
  }

  // Look up the unit in the legend (case-insensitive match)
  const entry = unitLegend.find(
    (e) => e.UnitKey.toLowerCase() === unitId.toLowerCase()
  );

  if (entry && entry.Description) {
    // Return "UnitID (Description)" format for clarity
    return `${unitId} (${entry.Description})`;
  }

  return unitId;
}

/**
 * Format an incident for Facebook posting using default formatting
 * Used as fallback when no template is configured
 */
function formatIncidentPostDefault(
  incident: Doc<"incidents">,
  updates: Array<{ content: string; createdAt: number }> = [],
  timezone?: string,
  unitLegend?: UnitLegendEntry[]
): string {
  const lines: string[] = [];
  const tz = timezone || "America/New_York";

  // Header with status indicator
  const statusEmoji = incident.status === "active" ? "🚨" : "✅";
  const statusText = incident.status === "active" ? "ACTIVE INCIDENT" : "INCIDENT CLOSED";
  lines.push(`${statusEmoji} ${statusText}`);
  lines.push("");

  // Call type - expand code to description
  const callTypeDescription = getCallTypeDescription(incident.callType);
  lines.push(`📋 Type: ${callTypeDescription}`);

  // Address
  lines.push(`📍 ${incident.fullAddress}`);
  lines.push("");

  // Units - grouped by status if available
  if (incident.units && incident.units.length > 0) {
    lines.push("🚒 Units:");

    // If we have detailed unit statuses, group by status
    if (incident.unitStatuses && Array.isArray(incident.unitStatuses)) {
      const unitStatuses = incident.unitStatuses as UnitStatus[];
      const statusGroups: Record<string, string[]> = {};

      for (const us of unitStatuses) {
        const status = us.status || "Unknown";
        if (!statusGroups[status]) {
          statusGroups[status] = [];
        }
        statusGroups[status].push(us.unitId);
      }

      // Output by status
      for (const [status, units] of Object.entries(statusGroups)) {
        const displayStatus = formatUnitStatus(status);
        for (const unit of units) {
          const displayName = getUnitDisplayName(unit, unitLegend);
          lines.push(`• ${displayName} - ${displayStatus}`);
        }
      }
    } else {
      // Simple list
      for (const unit of incident.units) {
        const displayName = getUnitDisplayName(unit, unitLegend);
        lines.push(`• ${displayName}`);
      }
    }
    lines.push("");
  }

  // Time - use tenant timezone
  const time = new Date(incident.callReceivedTime);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });
  lines.push(`⏰ ${timeStr}`);

  // Include updates if any
  if (updates.length > 0) {
    lines.push("");
    lines.push("Updates:");
    for (const update of updates.slice(0, 5)) {
      // Limit to 5 most recent
      const updateTime = new Date(update.createdAt);
      const updateTimeStr = updateTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
      });
      lines.push(`• [${updateTimeStr}] ${update.content}`);
    }
    if (updates.length > 5) {
      lines.push(`• ... and ${updates.length - 5} more updates`);
    }
  }

  // Hashtags
  lines.push("");
  lines.push("#EmergencyAlert #FirstResponders");

  return lines.join("\n");
}

/**
 * Format unit status for display
 */
function formatUnitStatus(status: string): string {
  return formatUnitStatusCode(status);
}

/**
 * Format incident post using template system
 */
function formatIncidentPost(
  incident: Doc<"incidents">,
  updates: Array<{ content: string; createdAt: number }> = [],
  template: Doc<"postTemplates"> | null,
  timezone?: string,
  unitLegend?: UnitLegendEntry[]
): string {
  // If we have a template, use the template engine
  if (template) {
    return applyTemplate(template, incident, updates, timezone, unitLegend);
  }

  // Fall back to default formatting
  return formatIncidentPostDefault(incident, updates, timezone, unitLegend);
}

// ===================
// Auto-Post Rule Checking
// ===================

/**
 * Check if an incident should be auto-posted based on rules
 */
function shouldAutoPost(
  incident: Doc<"incidents">,
  rules: Doc<"autoPostRules"> | null
): { shouldPost: boolean; reason?: string } {
  // If no rules exist or auto-posting is disabled, don't auto-post
  if (!rules || !rules.enabled) {
    return { shouldPost: false, reason: "Auto-posting disabled" };
  }

  // Get the incident's category using proper call type lookup
  const incidentCategory = getCallTypeCategory(incident.callType);
  const incidentDescription = getCallTypeDescription(incident.callType).toLowerCase();

  // Check call type filter - if user has selected specific types, only post those
  if (rules.callTypes.length > 0) {
    // Standard categories that have explicit filter options
    const standardCategories = ["fire", "medical", "rescue", "traffic", "hazmat"];

    // Check if incident matches any of the enabled call types/categories
    const matchesCallType = rules.callTypes.some((ct) => {
      const ctLower = ct.toLowerCase();
      // Match by category (e.g., "fire", "medical", "rescue")
      if (ctLower === incidentCategory) return true;
      // Match by specific call type code
      if (ctLower === incident.callType.toLowerCase()) return true;
      // Match if the category name contains the filter (e.g., "traffic" matches "traffic")
      if (incidentCategory.includes(ctLower)) return true;
      // Match by description (e.g., "Medical Emergency" contains "medical")
      if (incidentDescription.includes(ctLower)) return true;
      // "other" is a catch-all - matches any category not in the standard 5
      if (ctLower === "other" && !standardCategories.includes(incidentCategory)) return true;
      return false;
    });

    if (!matchesCallType) {
      return {
        shouldPost: false,
        reason: `Call type ${incident.callType} (${incidentCategory}) not in filter [${rules.callTypes.join(", ")}]`
      };
    }
  }

  // Check medical exclusion - uses proper call type lookup
  if (rules.excludeMedical) {
    if (isMedicalCallType(incident.callType)) {
      return { shouldPost: false, reason: "Medical calls excluded" };
    }
  }

  // Check minimum units threshold
  if (rules.minUnits && rules.minUnits > 0) {
    const unitCount = incident.units?.length || 0;
    if (unitCount < rules.minUnits) {
      return { shouldPost: false, reason: `Only ${unitCount} units, minimum is ${rules.minUnits}` };
    }
  }

  return { shouldPost: true };
}

// ===================
// Internal Queries
// ===================

/**
 * Get incidents that need to be synced to Facebook
 *
 * Handles:
 * - Retry limits: Skips incidents that have exceeded MAX_SYNC_ATTEMPTS
 * - Grouped incidents: Only returns one representative per group to avoid duplicate posts
 */
export const getIncidentsToSync = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 10 }) => {
    // Get active incidents that haven't been synced and haven't exceeded retry limit
    const allIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("isSyncedToFacebook"), false),
            q.eq(q.field("isSyncedToFacebook"), undefined)
          ),
          // Skip incidents that have exceeded retry limit
          q.or(
            q.eq(q.field("facebookSyncAttempts"), undefined),
            q.lt(q.field("facebookSyncAttempts"), MAX_SYNC_ATTEMPTS)
          )
        )
      )
      .collect();

    // Handle grouped incidents: only return one representative per group
    // This prevents duplicate Facebook posts for the same incident group
    const seenGroups = new Set<Id<"incidentGroups">>();
    const result: typeof allIncidents = [];

    for (const incident of allIncidents) {
      if (incident.groupId) {
        // Check if we've already seen this group
        if (seenGroups.has(incident.groupId)) {
          continue; // Skip - another incident in this group will be posted
        }
        seenGroups.add(incident.groupId);
      }

      result.push(incident);

      if (result.length >= limit) {
        break;
      }
    }

    return result;
  },
});

/**
 * Get incidents that need Facebook updates
 */
export const getIncidentsNeedingUpdate = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 10 }) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isSyncedToFacebook"), true),
          q.eq(q.field("needsFacebookUpdate"), true)
        )
      )
      .take(limit);

    return incidents;
  },
});

/**
 * Get updates for an incident
 */
export const getIncidentUpdates = internalQuery({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { incidentId }) => {
    return await ctx.db
      .query("incidentUpdates")
      .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
      .order("desc")
      .collect();
  },
});

/**
 * Get aggregated units and statuses from all incidents in a group
 * Used when formatting Facebook posts to show all units responding to an incident
 */
export const getAggregatedGroupData = internalQuery({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { incidentId }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) return null;

    // If not in a group, return the incident's own data
    if (!incident.groupId) {
      return {
        units: incident.units || [],
        unitStatuses: incident.unitStatuses || [],
        status: incident.status,
      };
    }

    // Fetch all incidents in the group
    const groupedIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", incident.tenantId))
      .filter((q) => q.eq(q.field("groupId"), incident.groupId))
      .collect();

    // Aggregate units from all incidents (use Set to deduplicate)
    const allUnits = new Set<string>();
    const unitStatusMap = new Map<string, UnitStatus>();

    for (const inc of groupedIncidents) {
      // Add units
      if (inc.units) {
        for (const unit of inc.units) {
          allUnits.add(unit);
        }
      }

      // Merge unit statuses (keep the most recent for each unit)
      if (inc.unitStatuses && Array.isArray(inc.unitStatuses)) {
        for (const status of inc.unitStatuses as UnitStatus[]) {
          const existing = unitStatusMap.get(status.unitId);
          if (!existing) {
            unitStatusMap.set(status.unitId, status);
          } else {
            // Keep the one with more recent timestamps
            const existingTime = existing.timeDispatched || 0;
            const newTime = status.timeDispatched || 0;
            if (newTime > existingTime) {
              unitStatusMap.set(status.unitId, status);
            }
          }
        }
      }
    }

    const aggregatedUnits = Array.from(allUnits);
    const aggregatedStatuses = Array.from(unitStatusMap.values());

    // Determine aggregated status: only "closed" if ALL incidents in the group are closed
    const allClosed = groupedIncidents.every((inc) => inc.status === "closed");
    const aggregatedStatus = allClosed ? "closed" : "active";

    // Log aggregation details if we combined from multiple incidents
    if (groupedIncidents.length > 1) {
      const originalUnitsCount = incident.units?.length || 0;
      const closedCount = groupedIncidents.filter((inc) => inc.status === "closed").length;
      console.log(
        `[Facebook Sync] Unit aggregation: Combined ${groupedIncidents.length} incidents in group ${incident.groupId}. ` +
        `Original incident had ${originalUnitsCount} units, aggregated total: ${aggregatedUnits.length} units. ` +
        `Status: ${closedCount}/${groupedIncidents.length} closed -> aggregated status: ${aggregatedStatus}. ` +
        `Units: ${aggregatedUnits.join(", ")}`
      );
    }

    return {
      units: aggregatedUnits,
      unitStatuses: aggregatedStatuses,
      status: aggregatedStatus as "active" | "closed",
    };
  },
});

/**
 * Diagnostic query: Find incidents where Facebook sync may be stale
 *
 * Returns closed incidents that were synced to Facebook but where:
 * - The incident closed AFTER the last Facebook sync, OR
 * - The incident has a pending update flag with an error
 *
 * This helps identify incidents that might have missed their closing update.
 */
export const getIncidentsWithStaleFacebookSync = internalQuery({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "closed")
      )
      .filter((q) => q.eq(q.field("isSyncedToFacebook"), true))
      .collect();

    const staleIncidents = incidents.filter((incident) => {
      // Case 1: Closed after last sync (or never synced after initial post)
      const closedAfterSync =
        incident.callClosedTime &&
        (!incident.facebookSyncedAt ||
          incident.callClosedTime > incident.facebookSyncedAt);

      // Case 2: Has pending update with an error (stuck in retry)
      const hasUpdateError =
        incident.needsFacebookUpdate === true && incident.syncError;

      return closedAfterSync || hasUpdateError;
    });

    return staleIncidents.map((incident) => ({
      _id: incident._id,
      externalId: incident.externalId,
      callType: incident.callType,
      fullAddress: incident.fullAddress,
      callClosedTime: incident.callClosedTime,
      facebookSyncedAt: incident.facebookSyncedAt,
      needsFacebookUpdate: incident.needsFacebookUpdate,
      syncError: incident.syncError,
      facebookPostId: incident.facebookPostId,
    }));
  },
});

// ===================
// Internal Mutations
// ===================

/**
 * Mark incident as synced to Facebook
 * If the incident is part of a group, marks ALL incidents in the group as synced
 * to prevent duplicate posts
 */
export const markIncidentSynced = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    facebookPostId: v.string(),
  },
  handler: async (ctx, { incidentId, facebookPostId }) => {
    const incident = await ctx.db.get(incidentId);
    if (!incident) return;

    const now = Date.now();
    const syncData = {
      isSyncedToFacebook: true,
      facebookPostId,
      needsFacebookUpdate: false,
      lastSyncAttempt: now,
      syncError: undefined,
      facebookSyncAttempts: 0, // Reset on success
      facebookSyncedAt: now, // Track when successfully synced for diagnostics
    };

    // Mark the primary incident
    await ctx.db.patch(incidentId, syncData);

    // If this incident is part of a group, mark ALL incidents in the group
    if (incident.groupId) {
      const groupedIncidents = await ctx.db
        .query("incidents")
        .withIndex("by_tenant", (q) => q.eq("tenantId", incident.tenantId))
        .filter((q) => q.eq(q.field("groupId"), incident.groupId))
        .collect();

      for (const grouped of groupedIncidents) {
        if (grouped._id !== incidentId) {
          await ctx.db.patch(grouped._id, syncData);
        }
      }

      console.log(`[Facebook Sync] Marked ${groupedIncidents.length} grouped incidents as synced`);
    }
  },
});

/**
 * Mark incident sync as failed and increment retry counter
 * After MAX_SYNC_ATTEMPTS, the incident will no longer be retried
 */
export const markIncidentSyncFailed = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    error: v.string(),
  },
  handler: async (ctx, { incidentId, error }) => {
    const incident = await ctx.db.get(incidentId);
    const currentAttempts = incident?.facebookSyncAttempts ?? 0;
    const newAttempts = currentAttempts + 1;

    await ctx.db.patch(incidentId, {
      lastSyncAttempt: Date.now(),
      syncError: error,
      facebookSyncAttempts: newAttempts,
    });

    // Log if max attempts reached
    if (newAttempts >= MAX_SYNC_ATTEMPTS) {
      console.log(`[Facebook Sync] Incident ${incidentId} exceeded max retry attempts (${MAX_SYNC_ATTEMPTS}), will not retry`);
    }
  },
});

/**
 * Clear needsFacebookUpdate flag after successful update
 */
export const clearUpdateFlag = internalMutation({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { incidentId }) => {
    const now = Date.now();
    await ctx.db.patch(incidentId, {
      needsFacebookUpdate: false,
      lastSyncAttempt: now,
      facebookSyncedAt: now, // Track when successfully synced for diagnostics
      syncError: undefined, // Clear any previous error
    });
  },
});

/**
 * Mark updates as synced
 */
export const markUpdatesSynced = internalMutation({
  args: {
    updateIds: v.array(v.id("incidentUpdates")),
  },
  handler: async (ctx, { updateIds }) => {
    const now = Date.now();
    for (const id of updateIds) {
      await ctx.db.patch(id, {
        isSyncedToFacebook: true,
        facebookSyncedAt: now,
        syncError: undefined,
      });
    }
  },
});

/**
 * Record a failed Facebook update attempt
 * Unlike initial sync failures, update failures don't increment retry counter
 * since updates will keep retrying until successful
 */
export const markUpdateFailed = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    error: v.string(),
  },
  handler: async (ctx, { incidentId, error }) => {
    await ctx.db.patch(incidentId, {
      lastSyncAttempt: Date.now(),
      syncError: error,
      // Note: needsFacebookUpdate stays true so it retries
    });
  },
});

/**
 * Reset Facebook sync state for all active incidents
 * Used when switching active Facebook pages to re-post incidents to the new page
 */
export const resetSyncState = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    // Get all active incidents that have been synced to Facebook
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("isSyncedToFacebook"), true))
      .collect();

    let resetCount = 0;
    for (const incident of incidents) {
      await ctx.db.patch(incident._id, {
        isSyncedToFacebook: false,
        facebookPostId: undefined,
        facebookSyncAttempts: 0,
        needsFacebookUpdate: false,
        lastSyncAttempt: undefined,
        syncError: undefined,
      });
      resetCount++;
    }

    const tenant = await ctx.db.get(tenantId);
    console.log(`[Facebook Sync] Reset sync state for ${resetCount} active incidents on tenant ${tenant?.slug || tenantId}`);

    return { resetCount };
  },
});

// ===================
// Actions (for external API calls)
// ===================

/**
 * Post a message to Facebook
 * @param pageId - Facebook page ID
 * @param pageToken - Facebook page access token
 * @param message - Message content to post
 * @param tenantSlug - Tenant slug for logging (helps identify which tenant has issues)
 */
async function postToFacebook(
  pageId: string,
  pageToken: string,
  message: string,
  tenantSlug?: string
): Promise<{ id: string } | null> {
  const logPrefix = tenantSlug ? `[Facebook:${tenantSlug}]` : "[Facebook]";

  try {
    // Use v24.0 API version
    const url = `https://graph.facebook.com/v24.0/${pageId}/feed`;
    console.log(`${logPrefix} Posting to page ${pageId}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${logPrefix} Post failed (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    console.log(`${logPrefix} Post successful: ${result.id}`);
    return result;
  } catch (error) {
    console.error(`${logPrefix} Post error:`, error);
    return null;
  }
}

/**
 * Update an existing Facebook post
 * If update fails for any reason, creates a new post as fallback
 * Facebook's API often restricts updating posts, so fallback is common
 */
async function updateFacebookPost(
  postId: string,
  pageId: string,
  pageToken: string,
  message: string
): Promise<{ success: boolean; newPostId?: string; error?: string }> {
  try {
    // Use v24.0 API version
    const url = `https://graph.facebook.com/v24.0/${postId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[Facebook] Update failed (this is normal, will create new post):", errorText);

      // Facebook often restricts updating posts - always fall back to creating new post
      console.log("[Facebook] Creating new post as fallback...");
      const newPostResult = await postToFacebook(pageId, pageToken, message);

      if (newPostResult?.id) {
        console.log(`[Facebook] Successfully created new post ${newPostResult.id} as fallback`);
        return { success: true, newPostId: newPostResult.id };
      } else {
        console.error("[Facebook] Fallback post creation also failed");
        return { success: false, error: `Update failed and fallback also failed. Original error: ${errorText}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[Facebook] Update error:", error);

    // Try fallback even on exceptions
    console.log("[Facebook] Attempting fallback post creation after exception...");
    try {
      const newPostResult = await postToFacebook(pageId, pageToken, message);
      if (newPostResult?.id) {
        console.log(`[Facebook] Successfully created new post ${newPostResult.id} as fallback`);
        return { success: true, newPostId: newPostResult.id };
      }
    } catch (fallbackError) {
      console.error("[Facebook] Fallback also failed:", fallbackError);
    }

    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Sync new incidents to Facebook for a tenant
 */
export const syncNewIncidents = internalAction({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    // Get tenant first for logging context
    const tenant = await ctx.runQuery(internal.tenants.getByIdInternal, { tenantId });
    const tenantSlug = tenant?.slug || tenantId;
    const logPrefix = `[Facebook Sync:${tenantSlug}]`;
    const timezone = tenant?.timezone || "America/New_York";

    // Get page token
    const credentials = await ctx.runMutation(internal.facebook.getPageToken, {
      tenantId,
    });

    if (!credentials || !credentials.pageToken || !credentials.pageId) {
      console.log(`${logPrefix} No Facebook credentials configured`);
      return { synced: 0, failed: 0, skipped: 0 };
    }

    // Get auto-post rules
    const rules = await ctx.runQuery(internal.autoPostRules.getInternal, { tenantId });

    // Get incidents to sync
    const incidents = await ctx.runQuery(internal.facebookSync.getIncidentsToSync, {
      tenantId,
      limit: 20, // Process in larger batches for faster sync
    });

    if (incidents.length === 0) {
      return { synced: 0, failed: 0, skipped: 0 };
    }

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (const incident of incidents) {
      // Check auto-post rules
      const { shouldPost, reason } = shouldAutoPost(incident, rules);

      if (!shouldPost) {
        console.log(`${logPrefix} Skipping incident ${incident._id}: ${reason}`);
        skipped++;
        // Mark as failed to increment retry counter (will stop after MAX_SYNC_ATTEMPTS)
        await ctx.runMutation(internal.facebookSync.markIncidentSyncFailed, {
          incidentId: incident._id,
          error: `Skipped: ${reason}`,
        });
        continue;
      }

      // Check delay if configured
      if (rules?.delaySeconds && rules.delaySeconds > 0) {
        const incidentAge = Date.now() - incident.callReceivedTime;
        if (incidentAge < rules.delaySeconds * 1000) {
          console.log(`${logPrefix} Delaying incident ${incident._id}: waiting for ${rules.delaySeconds}s delay`);
          skipped++;
          continue;
        }
      }

      // Get template for this incident
      const template = await ctx.runQuery(internal.postTemplates.getForCallTypeInternal, {
        tenantId,
        callType: incident.callType,
      });

      // Get updates for this incident
      const updates = await ctx.runQuery(internal.facebookSync.getIncidentUpdates, {
        incidentId: incident._id,
      });

      // Get aggregated units from all incidents in the group (if grouped)
      const aggregatedData = await ctx.runQuery(internal.facebookSync.getAggregatedGroupData, {
        incidentId: incident._id,
      });

      // Create incident object with aggregated units and status for formatting
      const incidentForFormatting = aggregatedData
        ? { ...incident, units: aggregatedData.units, unitStatuses: aggregatedData.unitStatuses, status: aggregatedData.status }
        : incident;

      // Format the post using template or default (pass unit legend for translations)
      const message = formatIncidentPost(
        incidentForFormatting,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt })),
        template,
        timezone,
        tenant?.unitLegend || undefined
      );

      // Post to Facebook (pass tenant slug for logging)
      const result = await postToFacebook(
        credentials.pageId,
        credentials.pageToken,
        message,
        tenantSlug
      );

      if (result?.id) {
        // Mark as synced (also marks grouped incidents)
        await ctx.runMutation(internal.facebookSync.markIncidentSynced, {
          incidentId: incident._id,
          facebookPostId: result.id,
        });

        // Log if this incident is part of a group
        if (incident.groupId) {
          console.log(
            `${logPrefix} Posted grouped incident ${incident._id} (group ${incident.groupId}) ` +
            `with ${aggregatedData?.units?.length || 0} aggregated units as ${result.id}`
          );
        }

        // Mark updates as synced
        if (updates.length > 0) {
          await ctx.runMutation(internal.facebookSync.markUpdatesSynced, {
            updateIds: updates.map((u) => u._id),
          });
        }

        synced++;
        console.log(`${logPrefix} Posted incident ${incident._id} as ${result.id}`);
      } else {
        // Mark as failed (increments retry counter)
        await ctx.runMutation(internal.facebookSync.markIncidentSyncFailed, {
          incidentId: incident._id,
          error: "Failed to post to Facebook - check page token permissions",
        });
        failed++;
        console.error(`${logPrefix} Failed to post incident ${incident._id}`);
      }
    }

    return { synced, failed, skipped };
  },
});

/**
 * Sync incident updates to Facebook (update existing posts)
 */
export const syncIncidentUpdates = internalAction({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    // Get page token
    const credentials = await ctx.runMutation(internal.facebook.getPageToken, {
      tenantId,
    });

    if (!credentials || !credentials.pageToken || !credentials.pageId) {
      return { updated: 0, failed: 0 };
    }

    // Get tenant to get timezone
    const tenant = await ctx.runQuery(internal.tenants.getByIdInternal, { tenantId });
    const timezone = tenant?.timezone || "America/New_York";

    // Get incidents needing update
    const incidents = await ctx.runQuery(internal.facebookSync.getIncidentsNeedingUpdate, {
      tenantId,
      limit: 20,
    });

    if (incidents.length === 0) {
      return { updated: 0, failed: 0 };
    }

    let updated = 0;
    let failed = 0;

    for (const incident of incidents) {
      if (!incident.facebookPostId) {
        continue;
      }

      // Get template for this incident
      const template = await ctx.runQuery(internal.postTemplates.getForCallTypeInternal, {
        tenantId,
        callType: incident.callType,
      });

      // Get updates
      const updates = await ctx.runQuery(internal.facebookSync.getIncidentUpdates, {
        incidentId: incident._id,
      });

      // Get aggregated units from all incidents in the group (if grouped)
      const aggregatedData = await ctx.runQuery(internal.facebookSync.getAggregatedGroupData, {
        incidentId: incident._id,
      });

      // Create incident object with aggregated units and status for formatting
      const incidentForFormatting = aggregatedData
        ? { ...incident, units: aggregatedData.units, unitStatuses: aggregatedData.unitStatuses, status: aggregatedData.status }
        : incident;

      // Format the updated post (pass unit legend for translations)
      const message = formatIncidentPost(
        incidentForFormatting,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt })),
        template,
        timezone,
        tenant?.unitLegend || undefined
      );

      // Update Facebook post
      const result = await updateFacebookPost(
        incident.facebookPostId,
        credentials.pageId,
        credentials.pageToken,
        message
      );

      if (result.success) {
        // If a new post was created as fallback, update the incident's facebookPostId
        if (result.newPostId) {
          await ctx.runMutation(internal.facebookSync.markIncidentSynced, {
            incidentId: incident._id,
            facebookPostId: result.newPostId,
          });
          console.log(`[Facebook Sync] Updated incident ${incident._id} with new post ID ${result.newPostId}`);
        } else {
          // Clear the update flag
          await ctx.runMutation(internal.facebookSync.clearUpdateFlag, {
            incidentId: incident._id,
          });
        }

        // Mark new updates as synced
        const unsyncedUpdates = updates.filter((u) => !u.isSyncedToFacebook);
        if (unsyncedUpdates.length > 0) {
          await ctx.runMutation(internal.facebookSync.markUpdatesSynced, {
            updateIds: unsyncedUpdates.map((u) => u._id),
          });
        }

        updated++;
        console.log(`[Facebook Sync] Updated post for incident ${incident._id}`);
      } else {
        // Record the failure for visibility
        await ctx.runMutation(internal.facebookSync.markUpdateFailed, {
          incidentId: incident._id,
          error: result.error || "Unknown error during Facebook update",
        });
        console.error(`[Facebook Sync] Failed to update post for incident ${incident._id}: ${result.error}`);
        failed++;
      }
    }

    return { updated, failed };
  },
});

/**
 * Main sync action - called by scheduler
 * Syncs all tenants with Facebook enabled
 */
export const syncAllTenants = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active tenants with Facebook connected
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const tenant of tenants) {
      // Skip tenants without Facebook (check both new array and legacy field)
      const hasPages = tenant.facebookPages && tenant.facebookPages.length > 0;
      if (!hasPages && !tenant.facebookPageId) {
        continue;
      }

      // Sync new incidents
      const syncResult = await ctx.runAction(internal.facebookSync.syncNewIncidents, {
        tenantId: tenant._id,
      });
      totalSynced += syncResult.synced;
      totalFailed += syncResult.failed;
      totalSkipped += syncResult.skipped;

      // Sync updates
      const updateResult = await ctx.runAction(internal.facebookSync.syncIncidentUpdates, {
        tenantId: tenant._id,
      });
      totalUpdated += updateResult.updated;
      totalFailed += updateResult.failed;
    }

    console.log(`[Facebook Sync] Complete: ${totalSynced} new posts, ${totalUpdated} updates, ${totalSkipped} skipped, ${totalFailed} failed`);

    return { totalSynced, totalUpdated, totalSkipped, totalFailed };
  },
});
