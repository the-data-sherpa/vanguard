import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

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
// Post Formatting
// ===================

/**
 * Format an incident for Facebook posting
 */
function formatIncidentPost(
  incident: Doc<"incidents">,
  updates: Array<{ content: string; createdAt: number }> = []
): string {
  const lines: string[] = [];

  // Header with status indicator
  const statusEmoji = incident.status === "active" ? "🚨" : "✅";
  const statusText = incident.status === "active" ? "ACTIVE CALL" : "CLEARED";
  lines.push(`${statusEmoji} ${statusText}`);
  lines.push("");

  // Call type
  lines.push(`Type: ${incident.callType}`);

  // Address
  lines.push(`Location: ${incident.fullAddress}`);
  lines.push("");

  // Units - grouped by status if available
  if (incident.units && incident.units.length > 0) {
    lines.push("Units:");

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

  // Time
  const time = new Date(incident.callReceivedTime);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  lines.push(`Time: ${timeStr}`);

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
  const statusMap: Record<string, string> = {
    dispatched: "Dispatched",
    enroute: "En Route",
    onscene: "On Scene",
    available: "Available",
    cleared: "Cleared",
    // Add more as needed
  };
  return statusMap[status.toLowerCase()] || status;
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
    const url = `https://graph.facebook.com/v18.0/${pageId}/feed`;
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
 */
async function updateFacebookPost(
  postId: string,
  pageToken: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://graph.facebook.com/v18.0/${postId}`;
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
      console.error("[Facebook] Update failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Facebook] Update error:", error);
    return false;
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
      return { synced: 0, failed: 0 };
    }

    // Get incidents to sync
    const incidents = await ctx.runQuery(internal.facebookSync.getIncidentsToSync, {
      tenantId,
      limit: 5, // Process in small batches
    });

    if (incidents.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const incident of incidents) {
      // Get updates for this incident
      const updates = await ctx.runQuery(internal.facebookSync.getIncidentUpdates, {
        incidentId: incident._id,
      });

      // Format the post
      const message = formatIncidentPost(
        incident,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt }))
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

    return { synced, failed };
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

      // Get updates
      const updates = await ctx.runQuery(internal.facebookSync.getIncidentUpdates, {
        incidentId: incident._id,
      });

      // Format the updated post
      const message = formatIncidentPost(
        incident,
        updates.map((u) => ({ content: u.content, createdAt: u.createdAt }))
      );

      // Update Facebook post
      const success = await updateFacebookPost(
        incident.facebookPostId,
        credentials.pageToken,
        message
      );

      if (success) {
        // Clear the update flag
        await ctx.runMutation(internal.facebookSync.clearUpdateFlag, {
          incidentId: incident._id,
        });

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

      // Sync updates
      const updateResult = await ctx.runAction(internal.facebookSync.syncIncidentUpdates, {
        tenantId: tenant._id,
      });
      totalUpdated += updateResult.updated;
      totalFailed += updateResult.failed;
    }

    console.log(`[Facebook Sync] Complete: ${totalSynced} new posts, ${totalUpdated} updates, ${totalFailed} failed`);

    return { totalSynced, totalUpdated, totalFailed };
  },
});
