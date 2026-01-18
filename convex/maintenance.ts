import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

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
 * Cleanup expired weather alerts for all tenants
 * Called by cron job daily
 */
export const cleanupExpiredAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    let totalDeleted = 0;

    for (const tenant of tenants) {
      const result = await ctx.runMutation(internal.maintenance.deleteOldAlerts, {
        tenantId: tenant._id,
        olderThanMs: 24 * 60 * 60 * 1000, // 24 hours
      });
      totalDeleted += result.deleted;
    }

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
