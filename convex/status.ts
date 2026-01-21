import { v } from "convex/values";
import { query } from "./_generated/server";

// ===================
// Public Status Page Queries
// ===================
// These queries are used by the public status page and do NOT require authentication.
// They return null if the tenant doesn't exist or has the publicStatusPage feature disabled.

/**
 * Get public tenant info (branding) if the status page feature is enabled.
 * Returns null if tenant doesn't exist or feature is disabled.
 */
export const getPublicTenantInfo = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    // Return null if tenant doesn't exist, isn't active, or feature is disabled
    if (!tenant) return null;
    if (tenant.status !== "active") return null;
    if (!tenant.features?.publicStatusPage) return null;

    // Return only public-safe information
    return {
      name: tenant.displayName || tenant.name,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      timezone: tenant.timezone,
    };
  },
});

/**
 * Get public stats (incident counts, category breakdown, alert count).
 * Returns null if tenant doesn't exist or feature is disabled.
 */
export const getPublicStats = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!tenant) return null;
    if (tenant.status !== "active") return null;
    if (!tenant.features?.publicStatusPage) return null;

    const now = Date.now();

    // Get active incidents count
    const activeIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenant._id).eq("status", "active")
      )
      .collect();

    // Get active weather alerts count
    const activeAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenant._id).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();

    // Count by category
    const categoryBreakdown: Record<string, number> = {};
    for (const incident of activeIncidents) {
      const category = incident.callTypeCategory || "other";
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    }

    return {
      activeIncidentCount: activeIncidents.length,
      activeAlertCount: activeAlerts.length,
      categoryBreakdown,
    };
  },
});

/**
 * Get public incidents (limited fields for public display).
 * Returns null if tenant doesn't exist or feature is disabled.
 */
export const getPublicIncidents = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!tenant) return null;
    if (tenant.status !== "active") return null;
    if (!tenant.features?.publicStatusPage) return null;

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenant._id).eq("status", "active")
      )
      .order("desc")
      .take(50);

    // Return only public-safe fields
    return incidents.map((incident) => ({
      _id: incident._id,
      callType: incident.callType,
      callTypeCategory: incident.callTypeCategory,
      fullAddress: incident.fullAddress,
      callReceivedTime: incident.callReceivedTime,
      unitCount: incident.units?.length || 0,
    }));
  },
});

/**
 * Get public weather alerts.
 * Returns null if tenant doesn't exist or feature is disabled.
 */
export const getPublicWeatherAlerts = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!tenant) return null;
    if (tenant.status !== "active") return null;
    if (!tenant.features?.publicStatusPage) return null;

    const now = Date.now();

    const alerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenant._id).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();

    // Return only public-safe fields
    return alerts.map((alert) => ({
      _id: alert._id,
      event: alert.event,
      headline: alert.headline,
      severity: alert.severity,
      urgency: alert.urgency,
      onset: alert.onset,
      expires: alert.expires,
    }));
  },
});

/**
 * Get incident history for the last N days.
 * Returns daily incident counts for the timeline.
 */
export const getIncidentHistory = query({
  args: {
    slug: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { slug, days = 30 }) => {
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (!tenant) return null;
    if (tenant.status !== "active") return null;
    if (!tenant.features?.publicStatusPage) return null;

    // Calculate start date
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenant._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), startDate.getTime()),
          q.lte(q.field("callReceivedTime"), endDate.getTime())
        )
      )
      .collect();

    // Group by date
    const dailyCounts: Record<string, number> = {};

    // Initialize all days with 0
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      dailyCounts[dateStr] = 0;
    }

    // Count incidents per day
    for (const incident of incidents) {
      const date = new Date(incident.callReceivedTime);
      const dateStr = date.toISOString().split("T")[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    }

    // Convert to array sorted by date
    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});
