import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

/**
 * Close stale incidents for all tenants
 * Called by cron job every 15 minutes
 */
export const closeAllStaleIncidents = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let totalClosed = 0;

    for (const tenant of tenants) {
      const result = await ctx.runMutation(internal.incidents.closeStaleIncidents, {
        tenantId: tenant._id,
        staleThresholdMs: TWO_HOURS_MS,
      });
      totalClosed += result.closed;
    }

    return { totalClosed };
  },
});

/**
 * Cleanup expired weather alerts for all tenants (30-day retention)
 * Called by cron job daily
 */
export const cleanupExpiredAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    let totalDeleted = 0;

    for (const tenant of tenants) {
      const result = await ctx.runMutation(internal.maintenance.deleteOldAlerts, {
        tenantId: tenant._id,
        olderThanMs: THIRTY_DAYS_MS, // 30 days
      });
      totalDeleted += result.deleted;
    }

    console.log(`[Maintenance] Weather alert cleanup complete: ${totalDeleted} alerts deleted`);

    return { totalDeleted };
  },
});

/**
 * Delete old expired/cancelled alerts
 */
export const deleteOldAlerts = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    olderThanMs: v.number(),
  },
  handler: async (ctx, { tenantId, olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;

    // Find alerts that expired more than `olderThanMs` ago
    const oldAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "active"),
          q.lt(q.field("expires"), cutoff)
        )
      )
      .collect();

    for (const alert of oldAlerts) {
      await ctx.db.delete(alert._id);
    }

    return { deleted: oldAlerts.length };
  },
});

/**
 * Archive old closed incidents
 * Can be called manually or scheduled
 */
export const archiveOldIncidents = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    olderThanMs: v.number(),
  },
  handler: async (ctx, { tenantId, olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;

    const oldIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "closed")
      )
      .filter((q) => q.lt(q.field("callClosedTime"), cutoff))
      .collect();

    let archived = 0;
    for (const incident of oldIncidents) {
      await ctx.db.patch(incident._id, { status: "archived" });
      archived++;
    }

    return { archived };
  },
});

/**
 * Delete old incidents (30-day retention policy)
 * Deletes incidents older than specified threshold, along with their notes
 * Also cleans up empty groups
 */
export const deleteOldIncidents = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    olderThanMs: v.number(),
  },
  handler: async (ctx, { tenantId, olderThanMs }) => {
    const cutoff = Date.now() - olderThanMs;

    // Find old incidents by callReceivedTime
    const oldIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.lt(q.field("callReceivedTime"), cutoff))
      .collect();

    let incidentsDeleted = 0;
    let notesDeleted = 0;
    const affectedGroupIds = new Set<string>();

    for (const incident of oldIncidents) {
      // Delete associated notes for this incident
      const notes = await ctx.db
        .query("incidentNotes")
        .withIndex("by_incident", (q) => q.eq("incidentId", incident._id))
        .collect();

      for (const note of notes) {
        await ctx.db.delete(note._id);
        notesDeleted++;
      }

      // Track group IDs for cleanup
      if (incident.groupId) {
        affectedGroupIds.add(incident.groupId);
      }

      // Delete the incident
      await ctx.db.delete(incident._id);
      incidentsDeleted++;
    }

    // Check if any groups are now empty and delete them
    let groupsDeleted = 0;
    for (const groupIdStr of affectedGroupIds) {
      const groupId = groupIdStr as unknown as typeof oldIncidents[0]["groupId"];
      if (!groupId) continue;

      // Check if any incidents still reference this group
      const remainingIncidents = await ctx.db
        .query("incidents")
        .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
        .filter((q) => q.eq(q.field("groupId"), groupId))
        .first();

      if (!remainingIncidents) {
        // No incidents left in this group, delete it
        const group = await ctx.db.get(groupId);
        if (group) {
          await ctx.db.delete(groupId);
          groupsDeleted++;
        }
      }
    }

    return { incidentsDeleted, notesDeleted, groupsDeleted };
  },
});

/**
 * Cleanup old incidents for all tenants (30-day retention)
 * Called by daily cleanup cron
 */
export const cleanupOldIncidents = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    let totalIncidentsDeleted = 0;
    let totalNotesDeleted = 0;
    let totalGroupsDeleted = 0;

    for (const tenant of tenants) {
      // Only cleanup tenants with PulsePoint enabled
      if (!tenant.pulsepointConfig?.enabled) {
        continue;
      }

      const result = await ctx.runMutation(internal.maintenance.deleteOldIncidents, {
        tenantId: tenant._id,
        olderThanMs: THIRTY_DAYS_MS,
      });

      totalIncidentsDeleted += result.incidentsDeleted;
      totalNotesDeleted += result.notesDeleted;
      totalGroupsDeleted += result.groupsDeleted;

      if (result.incidentsDeleted > 0) {
        console.log(`[Maintenance] Tenant ${tenant.slug}: deleted ${result.incidentsDeleted} incidents, ${result.notesDeleted} notes, ${result.groupsDeleted} groups`);
      }
    }

    console.log(`[Maintenance] 30-day cleanup complete: ${totalIncidentsDeleted} incidents, ${totalNotesDeleted} notes, ${totalGroupsDeleted} groups deleted`);

    return { totalIncidentsDeleted, totalNotesDeleted, totalGroupsDeleted };
  },
});
