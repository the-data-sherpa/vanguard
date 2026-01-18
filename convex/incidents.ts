import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

// ===================
// Type Definitions
// ===================

type IncidentStatus = "active" | "closed" | "archived";
type CallTypeCategory = "fire" | "medical" | "rescue" | "traffic" | "hazmat" | "other";

// ===================
// Queries
// ===================

/**
 * List incidents for a tenant with filtering
 * This is REACTIVE - UI updates automatically when data changes
 */
export const list = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(v.literal("active"), v.literal("closed"), v.literal("archived"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, status, limit }) => {
    if (status) {
      return await ctx.db
        .query("incidents")
        .withIndex("by_tenant_status", (idx) =>
          idx.eq("tenantId", tenantId).eq("status", status)
        )
        .order("desc")
        .take(limit || 100);
    } else {
      return await ctx.db
        .query("incidents")
        .withIndex("by_tenant", (idx) => idx.eq("tenantId", tenantId))
        .order("desc")
        .take(limit || 100);
    }
  },
});

/**
 * List active incidents - optimized for dashboard
 */
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .order("desc")
      .collect();
  },
});

/**
 * Get a single incident by ID
 */
export const get = query({
  args: { id: v.id("incidents") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Search incidents by address
 */
export const searchByAddress = query({
  args: {
    tenantId: v.id("tenants"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, searchTerm, limit }) => {
    const normalizedSearch = searchTerm.toLowerCase();

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.or(
          q.eq(q.field("fullAddress"), searchTerm),
          q.eq(q.field("normalizedAddress"), normalizedSearch)
        )
      )
      .take(limit || 50);

    return incidents;
  },
});

/**
 * Get incidents by category for charts/analytics
 */
export const getByCategory = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(v.literal("active"), v.literal("closed"), v.literal("archived"))),
  },
  handler: async (ctx, { tenantId, status }) => {
    let incidents: Doc<"incidents">[];

    if (status) {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_tenant_status", (idx) =>
          idx.eq("tenantId", tenantId).eq("status", status)
        )
        .collect();
    } else {
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_tenant", (idx) => idx.eq("tenantId", tenantId))
        .collect();
    }

    // Group by category
    const byCategory: Record<string, Doc<"incidents">[]> = {};
    for (const incident of incidents) {
      const category = incident.callTypeCategory || "other";
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(incident);
    }

    return byCategory;
  },
});

/**
 * Internal query to find existing incident by external ID
 */
export const findByExternalId = internalQuery({
  args: {
    tenantId: v.id("tenants"),
    externalId: v.string(),
  },
  handler: async (ctx, { tenantId, externalId }) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_external", (q) =>
        q.eq("tenantId", tenantId).eq("externalId", externalId)
      )
      .unique();
  },
});

// ===================
// Mutations
// ===================

/**
 * Create a new incident
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    source: v.union(
      v.literal("pulsepoint"),
      v.literal("user_submitted"),
      v.literal("merged"),
      v.literal("manual")
    ),
    externalId: v.optional(v.string()),
    callType: v.string(),
    callTypeCategory: v.optional(
      v.union(
        v.literal("fire"),
        v.literal("medical"),
        v.literal("rescue"),
        v.literal("traffic"),
        v.literal("hazmat"),
        v.literal("other")
      )
    ),
    fullAddress: v.string(),
    normalizedAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    units: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    callReceivedTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("incidents", {
      ...args,
      status: "active",
      normalizedAddress: args.normalizedAddress || args.fullAddress.toLowerCase(),
    });
  },
});

/**
 * Update an incident's status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("incidents"),
    status: v.union(v.literal("active"), v.literal("closed"), v.literal("archived")),
    callClosedTime: v.optional(v.number()),
  },
  handler: async (ctx, { id, status, callClosedTime }) => {
    await ctx.db.patch(id, {
      status,
      callClosedTime: status === "closed" ? callClosedTime || Date.now() : undefined,
    });
  },
});

/**
 * Update incident units
 */
export const updateUnits = mutation({
  args: {
    id: v.id("incidents"),
    units: v.array(v.string()),
    unitStatuses: v.optional(
      v.record(
        v.string(),
        v.object({
          unit: v.string(),
          status: v.string(),
          timestamp: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, { id, units, unitStatuses }) => {
    await ctx.db.patch(id, { units, unitStatuses });
  },
});

/**
 * Batch upsert incidents from PulsePoint sync
 * This is the KEY function for efficient syncing
 */
export const batchUpsertFromPulsePoint = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    incidents: v.array(
      v.object({
        externalId: v.string(),
        callType: v.string(),
        callTypeCategory: v.union(
          v.literal("fire"),
          v.literal("medical"),
          v.literal("rescue"),
          v.literal("traffic"),
          v.literal("hazmat"),
          v.literal("other")
        ),
        fullAddress: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        units: v.optional(v.array(v.string())),
        unitStatuses: v.optional(v.any()),
        status: v.union(v.literal("active"), v.literal("closed")),
        callReceivedTime: v.number(),
        callClosedTime: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { tenantId, incidents }) => {
    let created = 0;
    let updated = 0;

    for (const incident of incidents) {
      // Check if incident exists
      const existing = await ctx.db
        .query("incidents")
        .withIndex("by_tenant_external", (q) =>
          q.eq("tenantId", tenantId).eq("externalId", incident.externalId)
        )
        .unique();

      if (existing) {
        // Update existing incident
        await ctx.db.patch(existing._id, {
          callType: incident.callType,
          callTypeCategory: incident.callTypeCategory,
          fullAddress: incident.fullAddress,
          normalizedAddress: incident.fullAddress.toLowerCase(),
          latitude: incident.latitude,
          longitude: incident.longitude,
          units: incident.units,
          unitStatuses: incident.unitStatuses,
          status: incident.status,
          callClosedTime: incident.callClosedTime,
        });
        updated++;
      } else {
        // Create new incident
        await ctx.db.insert("incidents", {
          tenantId,
          source: "pulsepoint",
          externalId: incident.externalId,
          callType: incident.callType,
          callTypeCategory: incident.callTypeCategory,
          fullAddress: incident.fullAddress,
          normalizedAddress: incident.fullAddress.toLowerCase(),
          latitude: incident.latitude,
          longitude: incident.longitude,
          units: incident.units,
          unitStatuses: incident.unitStatuses,
          status: incident.status,
          callReceivedTime: incident.callReceivedTime,
          callClosedTime: incident.callClosedTime,
        });
        created++;
      }
    }

    return { created, updated };
  },
});

/**
 * Close stale incidents (incidents not updated recently)
 */
export const closeStaleIncidents = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    staleThresholdMs: v.number(), // e.g., 2 hours = 7200000
  },
  handler: async (ctx, { tenantId, staleThresholdMs }) => {
    const cutoff = Date.now() - staleThresholdMs;

    const staleIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.lt(q.field("callReceivedTime"), cutoff))
      .collect();

    let closed = 0;
    for (const incident of staleIncidents) {
      await ctx.db.patch(incident._id, {
        status: "closed",
        callClosedTime: Date.now(),
      });
      closed++;
    }

    return { closed };
  },
});

/**
 * Delete all incidents for a tenant (for config reset)
 */
export const deleteAllForTenant = internalMutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    for (const incident of incidents) {
      await ctx.db.delete(incident._id);
    }

    return { deleted: incidents.length };
  },
});
