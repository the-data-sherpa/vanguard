import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import { hasIncidentChanged, UnitStatus } from "./syncHelpers";

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
 * Get a single incident by ID with tenant validation
 */
export const getById = query({
  args: {
    tenantId: v.id("tenants"),
    id: v.id("incidents"),
  },
  handler: async (ctx, { tenantId, id }) => {
    const incident = await ctx.db.get(id);
    if (!incident) {
      return null;
    }
    // Verify the incident belongs to this tenant
    if (incident.tenantId !== tenantId) {
      return null;
    }
    return incident;
  },
});

/**
 * List incidents with date range filtering (server-side)
 */
export const listWithDateRange = query({
  args: {
    tenantId: v.id("tenants"),
    status: v.optional(v.union(v.literal("active"), v.literal("closed"), v.literal("archived"))),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, status, startTime, endTime, limit }) => {
    // Query with index and apply date filter
    let query = ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (idx) => idx.eq("tenantId", tenantId))
      .order("desc");

    // Apply filters
    if (startTime !== undefined || endTime !== undefined || status) {
      query = query.filter((q) => {
        const conditions: ReturnType<typeof q.eq>[] = [];

        if (startTime !== undefined) {
          conditions.push(q.gte(q.field("callReceivedTime"), startTime));
        }
        if (endTime !== undefined) {
          conditions.push(q.lte(q.field("callReceivedTime"), endTime));
        }
        if (status) {
          conditions.push(q.eq(q.field("status"), status));
        }

        return conditions.length === 1
          ? conditions[0]
          : q.and(...(conditions as [ReturnType<typeof q.eq>, ...ReturnType<typeof q.eq>[]]));
      });
    }

    return await query.take(limit || 500);
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
 * Now includes conflict detection to reduce unnecessary DB writes
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
        normalizedAddress: v.string(),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        units: v.optional(v.array(v.string())),
        // New UnitStatus array format with richer timestamps
        unitStatuses: v.optional(
          v.array(
            v.object({
              unitId: v.string(),
              status: v.string(),
              timeDispatched: v.optional(v.number()),
              timeAcknowledged: v.optional(v.number()),
              timeEnroute: v.optional(v.number()),
              timeOnScene: v.optional(v.number()),
              timeCleared: v.optional(v.number()),
            })
          )
        ),
        status: v.union(v.literal("active"), v.literal("closed")),
        callReceivedTime: v.number(),
        callClosedTime: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { tenantId, incidents }) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const incident of incidents) {
      // Check if incident exists
      const existing = await ctx.db
        .query("incidents")
        .withIndex("by_tenant_external", (q) =>
          q.eq("tenantId", tenantId).eq("externalId", incident.externalId)
        )
        .unique();

      if (existing) {
        // Convert existing unitStatuses to UnitStatus[] format for comparison
        let existingUnitStatuses: UnitStatus[] | undefined;
        if (existing.unitStatuses) {
          if (Array.isArray(existing.unitStatuses)) {
            existingUnitStatuses = existing.unitStatuses as UnitStatus[];
          } else {
            // Legacy Record format - convert for comparison
            existingUnitStatuses = Object.values(existing.unitStatuses as Record<string, { unit: string; status: string; timestamp: number }>)
              .map(r => ({
                unitId: r.unit,
                status: r.status,
                timeDispatched: r.timestamp,
              }));
          }
        }

        // Check if incident has actually changed
        const hasChanged = hasIncidentChanged(
          {
            callType: existing.callType,
            fullAddress: existing.fullAddress,
            latitude: existing.latitude,
            longitude: existing.longitude,
            units: existing.units,
            unitStatuses: existingUnitStatuses,
            status: existing.status as "active" | "closed",
            callClosedTime: existing.callClosedTime,
          },
          {
            callType: incident.callType,
            fullAddress: incident.fullAddress,
            latitude: incident.latitude,
            longitude: incident.longitude,
            units: incident.units,
            unitStatuses: incident.unitStatuses,
            status: incident.status,
            callClosedTime: incident.callClosedTime,
          }
        );

        if (!hasChanged) {
          // No meaningful changes, skip update
          skipped++;
          continue;
        }

        // Update existing incident
        await ctx.db.patch(existing._id, {
          callType: incident.callType,
          callTypeCategory: incident.callTypeCategory,
          fullAddress: incident.fullAddress,
          normalizedAddress: incident.normalizedAddress,
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
          normalizedAddress: incident.normalizedAddress,
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

    return { created, updated, skipped };
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

/**
 * Create a manual incident (for non-PulsePoint events)
 */
export const createManual = mutation({
  args: {
    tenantId: v.id("tenants"),
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
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    units: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    callReceivedTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("incidents", {
      tenantId: args.tenantId,
      source: "manual",
      callType: args.callType,
      callTypeCategory: args.callTypeCategory || "other",
      fullAddress: args.fullAddress,
      normalizedAddress: args.fullAddress.toLowerCase(),
      latitude: args.latitude,
      longitude: args.longitude,
      units: args.units,
      description: args.description,
      status: "active",
      callReceivedTime: args.callReceivedTime || Date.now(),
    });
  },
});

/**
 * Update a manual incident (only manual incidents can be edited)
 */
export const updateManual = mutation({
  args: {
    id: v.id("incidents"),
    callType: v.optional(v.string()),
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
    fullAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    units: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("closed"), v.literal("archived"))),
  },
  handler: async (ctx, { id, ...updates }) => {
    const incident = await ctx.db.get(id);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Only manual incidents can be edited
    if (incident.source !== "manual") {
      throw new Error("Only manual incidents can be edited");
    }

    const patchData: Record<string, unknown> = {};

    if (updates.callType !== undefined) patchData.callType = updates.callType;
    if (updates.callTypeCategory !== undefined) patchData.callTypeCategory = updates.callTypeCategory;
    if (updates.fullAddress !== undefined) {
      patchData.fullAddress = updates.fullAddress;
      patchData.normalizedAddress = updates.fullAddress.toLowerCase();
    }
    if (updates.latitude !== undefined) patchData.latitude = updates.latitude;
    if (updates.longitude !== undefined) patchData.longitude = updates.longitude;
    if (updates.units !== undefined) patchData.units = updates.units;
    if (updates.description !== undefined) patchData.description = updates.description;
    if (updates.status !== undefined) {
      patchData.status = updates.status;
      if (updates.status === "closed") {
        patchData.callClosedTime = Date.now();
      }
    }

    await ctx.db.patch(id, patchData);
    return id;
  },
});
