import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helper
// ===================

async function requireTenantAdmin(
  ctx: QueryCtx,
  tenantId: Id<"tenants">
): Promise<void> {
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

  const roleHierarchy: Record<string, number> = {
    member: 1,
    moderator: 2,
    admin: 3,
    owner: 4,
  };

  const userRoleLevel = roleHierarchy[user.tenantRole || "member"] || 0;
  if (userRoleLevel < roleHierarchy.admin) {
    throw new Error("Access denied: requires admin role or higher");
  }
}

// ===================
// Export Queries
// ===================

/**
 * Get incidents for export
 * Returns incidents in a flat, exportable format
 */
export const getIncidentsForExport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startDate, endDate }) => {
    // Verify user has admin access
    await requireTenantAdmin(ctx, tenantId);

    // Query incidents
    let incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Apply date filters
    if (startDate) {
      incidents = incidents.filter((i) => i.callReceivedTime >= startDate);
    }
    if (endDate) {
      incidents = incidents.filter((i) => i.callReceivedTime <= endDate);
    }

    // Transform to flat export format
    return incidents.map((incident) => ({
      id: incident._id,
      externalId: incident.externalId,
      source: incident.source,
      callType: incident.callType,
      callTypeCategory: incident.callTypeCategory,
      description: incident.description,
      fullAddress: incident.fullAddress,
      normalizedAddress: incident.normalizedAddress,
      latitude: incident.latitude,
      longitude: incident.longitude,
      units: incident.units?.join("; "),
      status: incident.status,
      callReceivedTime: incident.callReceivedTime,
      callReceivedTimeFormatted: new Date(incident.callReceivedTime).toISOString(),
      callClosedTime: incident.callClosedTime,
      callClosedTimeFormatted: incident.callClosedTime
        ? new Date(incident.callClosedTime).toISOString()
        : null,
      moderationStatus: incident.moderationStatus,
      isSyncedToFacebook: incident.isSyncedToFacebook,
    }));
  },
});

/**
 * Get weather alerts for export
 * Returns weather alerts in a flat, exportable format
 */
export const getWeatherAlertsForExport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startDate, endDate }) => {
    // Verify user has admin access
    await requireTenantAdmin(ctx, tenantId);

    // Query weather alerts
    let alerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Apply date filters based on expires time
    if (startDate) {
      alerts = alerts.filter((a) => a.expires >= startDate);
    }
    if (endDate) {
      alerts = alerts.filter((a) => a.expires <= endDate);
    }

    // Transform to flat export format
    return alerts.map((alert) => ({
      id: alert._id,
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
      onsetFormatted: alert.onset ? new Date(alert.onset).toISOString() : null,
      expires: alert.expires,
      expiresFormatted: new Date(alert.expires).toISOString(),
      ends: alert.ends,
      endsFormatted: alert.ends ? new Date(alert.ends).toISOString() : null,
      affectedZones: alert.affectedZones?.join("; "),
      status: alert.status,
      isSyncedToFacebook: alert.isSyncedToFacebook,
    }));
  },
});

/**
 * Get audit logs for export
 * Returns audit logs in a flat, exportable format
 */
export const getAuditLogsForExport = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startDate, endDate }) => {
    // Verify user has admin access
    await requireTenantAdmin(ctx, tenantId);

    // Query audit logs
    let logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Apply date filters based on _creationTime
    if (startDate) {
      logs = logs.filter((l) => l._creationTime >= startDate);
    }
    if (endDate) {
      logs = logs.filter((l) => l._creationTime <= endDate);
    }

    // Transform to flat export format
    return logs.map((log) => ({
      id: log._id,
      timestamp: log._creationTime,
      timestampFormatted: new Date(log._creationTime).toISOString(),
      actorId: log.actorId,
      actorType: log.actorType,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details ? JSON.stringify(log.details) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      result: log.result,
    }));
  },
});
