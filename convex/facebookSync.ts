import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { applyTemplate, getDefaultTemplateObject, DEFAULT_TEMPLATE_STRING } from "./postTemplates";
import { getCallTypeDescription, getCallTypeCategory, isMedicalCallType, formatUnitStatusCode } from "./callTypes";

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
 * Format an incident for Facebook posting using default formatting
 * Used as fallback when no template is configured
 */
function formatIncidentPostDefault(
  incident: Doc<"incidents">,
  updates: Array<{ content: string; createdAt: number }> = [],
  timezone?: string
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
          lines.push(`• ${unit} - ${displayStatus}`);
        }
      }
    } else {
      // Simple list
      for (const unit of incident.units) {
        lines.push(`• ${unit}`);
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
  timezone?: string
): string {
  // If we have a template, use the template engine
  if (template) {
    return applyTemplate(template, incident, updates, timezone);
  }

  // Fall back to default formatting
  return formatIncidentPostDefault(incident, updates, timezone);
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
 */
export const getIncidentsToSync = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 10 }) => {
    // Get active incidents that haven't been synced
    const incidents = await ctx.db
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
      .take(limit);

    return incidents;
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

// ===================
// Internal Mutations
// ===================

/**
 * Mark incident as synced to Facebook
 */
export const markIncidentSynced = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    facebookPostId: v.string(),
  },
  handler: async (ctx, { incidentId, facebookPostId }) => {
    await ctx.db.patch(incidentId, {
      isSyncedToFacebook: true,
      facebookPostId,
      needsFacebookUpdate: false,
      lastSyncAttempt: Date.now(),
      syncError: undefined,
    });
  },
});

/**
 * Mark incident sync as failed
 */
export const markIncidentSyncFailed = internalMutation({
  args: {
    incidentId: v.id("incidents"),
    error: v.string(),
  },
  handler: async (ctx, { incidentId, error }) => {
    await ctx.db.patch(incidentId, {
      lastSyncAttempt: Date.now(),
      syncError: error,
    });
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
    await ctx.db.patch(incidentId, {
      needsFacebookUpdate: false,
      lastSyncAttempt: Date.now(),
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

// ===================
// Actions (for external API calls)
// ===================

/**
 * Post a message to Facebook
 */
async function postToFacebook(
  pageId: string,
  pageToken: string,
  message: string
): Promise<{ id: string } | null> {
  try {
    // Use v21.0 API version (same as ICAW)
    const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
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
      const error = await response.text();
      console.error("[Facebook] Post failed:", error);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("[Facebook] Post error:", error);
    return null;
  }
}

/**
 * Update an existing Facebook post
 * If update fails due to permissions, returns info to create a new post instead
 */
async function updateFacebookPost(
  postId: string,
  pageId: string,
  pageToken: string,
  message: string
): Promise<{ success: boolean; newPostId?: string }> {
  try {
    // Use v21.0 API version (same as ICAW)
    const url = `https://graph.facebook.com/v21.0/${postId}`;
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
      console.error("[Facebook] Update failed:", errorText);

      // Check if this is a permissions error - if so, create new post as fallback
      if (errorText.includes("permission") || errorText.includes("Permission")) {
        console.log("[Facebook] Cannot update existing post due to permissions, creating new post instead");

        // Create a new post as fallback
        const newPostResult = await postToFacebook(pageId, pageToken, message);
        if (newPostResult?.id) {
          console.log(`[Facebook] Created new post ${newPostResult.id} as fallback`);
          return { success: true, newPostId: newPostResult.id };
        }
      }

      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("[Facebook] Update error:", error);
    return { success: false };
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
    // Get page token
    const credentials = await ctx.runMutation(internal.facebook.getPageToken, {
      tenantId,
    });

    if (!credentials || !credentials.pageToken || !credentials.pageId) {
      console.log(`[Facebook Sync] No Facebook credentials for tenant ${tenantId}`);
      return { synced: 0, failed: 0, skipped: 0 };
    }

    // Get tenant to get timezone
    const tenant = await ctx.runQuery(internal.tenants.getByIdInternal, { tenantId });
    const timezone = tenant?.timezone || "America/New_York";

    // Get auto-post rules
    const rules = await ctx.runQuery(internal.autoPostRules.getInternal, { tenantId });

    // Get incidents to sync
    const incidents = await ctx.runQuery(internal.facebookSync.getIncidentsToSync, {
      tenantId,
      limit: 5, // Process in small batches
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
        console.log(`[Facebook Sync] Skipping incident ${incident._id}: ${reason}`);
        skipped++;
        // Mark as synced but with no post ID to prevent retrying
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
          console.log(`[Facebook Sync] Delaying incident ${incident._id}: waiting for ${rules.delaySeconds}s delay`);
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

      // Format the post using template or default
      const message = formatIncidentPost(
        incident,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt })),
        template,
        timezone
      );

      // Post to Facebook
      const result = await postToFacebook(
        credentials.pageId,
        credentials.pageToken,
        message
      );

      if (result?.id) {
        // Mark as synced
        await ctx.runMutation(internal.facebookSync.markIncidentSynced, {
          incidentId: incident._id,
          facebookPostId: result.id,
        });

        // Mark updates as synced
        if (updates.length > 0) {
          await ctx.runMutation(internal.facebookSync.markUpdatesSynced, {
            updateIds: updates.map((u) => u._id),
          });
        }

        synced++;
        console.log(`[Facebook Sync] Posted incident ${incident._id} as ${result.id}`);
      } else {
        // Mark as failed
        await ctx.runMutation(internal.facebookSync.markIncidentSyncFailed, {
          incidentId: incident._id,
          error: "Failed to post to Facebook",
        });
        failed++;
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
      limit: 5,
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

      // Format the updated post
      const message = formatIncidentPost(
        incident,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt })),
        template,
        timezone
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
      // Skip tenants without Facebook
      if (!tenant.facebookPageId) {
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
