import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// ===================
// Queries
// ===================

/**
 * List active weather alerts for a tenant
 * REACTIVE - dashboard auto-updates when alerts change
 */
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const now = Date.now();

    return await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .order("desc")
      .collect();
  },
});

/**
 * List all weather alerts for a tenant (including expired)
 */
export const list = query({
  args: {
    tenantId: v.id("tenants"),
    includeExpired: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, includeExpired, limit }) => {
    const now = Date.now();

    let q = ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant", (idx) => idx.eq("tenantId", tenantId));

    if (!includeExpired) {
      q = q.filter((f) => f.gt(f.field("expires"), now));
    }

    return await q.order("desc").take(limit || 50);
  },
});

/**
 * Get a single weather alert
 */
export const get = query({
  args: { id: v.id("weatherAlerts") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Get alerts by severity (for dashboard widgets)
 */
export const getBySeverity = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const now = Date.now();

    const alerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();

    // Group by severity
    const bySeverity: Record<string, Doc<"weatherAlerts">[]> = {
      Extreme: [],
      Severe: [],
      Moderate: [],
      Minor: [],
      Unknown: [],
    };

    for (const alert of alerts) {
      const severity = alert.severity || "Unknown";
      bySeverity[severity].push(alert);
    }

    return bySeverity;
  },
});

// ===================
// Mutations
// ===================

/**
 * Create a weather alert
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    nwsId: v.string(),
    event: v.string(),
    headline: v.string(),
    description: v.optional(v.string()),
    instruction: v.optional(v.string()),
    severity: v.union(
      v.literal("Extreme"),
      v.literal("Severe"),
      v.literal("Moderate"),
      v.literal("Minor"),
      v.literal("Unknown")
    ),
    urgency: v.optional(
      v.union(
        v.literal("Immediate"),
        v.literal("Expected"),
        v.literal("Future"),
        v.literal("Unknown")
      )
    ),
    certainty: v.optional(
      v.union(
        v.literal("Observed"),
        v.literal("Likely"),
        v.literal("Possible"),
        v.literal("Unlikely"),
        v.literal("Unknown")
      )
    ),
    category: v.optional(v.string()),
    onset: v.optional(v.number()),
    expires: v.number(),
    ends: v.optional(v.number()),
    affectedZones: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("weatherAlerts", {
      ...args,
      status: "active",
    });
  },
});

/**
 * Batch upsert weather alerts from NWS sync
 */
export const batchUpsertFromNWS = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    alerts: v.array(
      v.object({
        nwsId: v.string(),
        event: v.string(),
        headline: v.string(),
        description: v.optional(v.string()),
        instruction: v.optional(v.string()),
        severity: v.union(
          v.literal("Extreme"),
          v.literal("Severe"),
          v.literal("Moderate"),
          v.literal("Minor"),
          v.literal("Unknown")
        ),
        urgency: v.optional(
          v.union(
            v.literal("Immediate"),
            v.literal("Expected"),
            v.literal("Future"),
            v.literal("Unknown")
          )
        ),
        certainty: v.optional(
          v.union(
            v.literal("Observed"),
            v.literal("Likely"),
            v.literal("Possible"),
            v.literal("Unlikely"),
            v.literal("Unknown")
          )
        ),
        category: v.optional(v.string()),
        onset: v.optional(v.number()),
        expires: v.number(),
        ends: v.optional(v.number()),
        affectedZones: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { tenantId, alerts }) => {
    let created = 0;
    let updated = 0;

    for (const alert of alerts) {
      // Check if alert exists
      const existing = await ctx.db
        .query("weatherAlerts")
        .withIndex("by_tenant_nwsid", (q) =>
          q.eq("tenantId", tenantId).eq("nwsId", alert.nwsId)
        )
        .unique();

      if (existing) {
        // Update existing alert
        await ctx.db.patch(existing._id, {
          event: alert.event,
          headline: alert.headline,
          description: alert.description,
          instruction: alert.instruction,
          severity: alert.severity,
          urgency: alert.urgency,
          certainty: alert.certainty,
          category: alert.category,
          onset: alert.onset,
          expires: alert.expires,
          ends: alert.ends,
          affectedZones: alert.affectedZones,
        });
        updated++;
      } else {
        // Create new alert
        await ctx.db.insert("weatherAlerts", {
          tenantId,
          nwsId: alert.nwsId,
          event: alert.event,
          headline: alert.headline,
          description: alert.description,
          instruction: alert.instruction,
          severity: alert.severity,
          urgency: alert.urgency,
          certainty: alert.certainty,
          category: alert.category,
          onset: alert.onset,
          expires: alert.expires,
          ends: alert.ends,
          affectedZones: alert.affectedZones,
          status: "active",
        });
        created++;
      }
    }

    return { created, updated };
  },
});

/**
 * Expire old alerts
 */
export const expireOldAlerts = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const now = Date.now();

    const expiredAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.lte(q.field("expires"), now))
      .collect();

    let expired = 0;
    for (const alert of expiredAlerts) {
      await ctx.db.patch(alert._id, { status: "expired" });
      expired++;
    }

    return { expired };
  },
});

/**
 * Cancel an alert
 */
export const cancel = mutation({
  args: { id: v.id("weatherAlerts") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "cancelled" });
  },
});
