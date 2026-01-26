import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ===================
// Analytics Queries
// ===================
// Computed on-demand for MVP. Future: consider pre-aggregation for scale.

type CallTypeCategory = "fire" | "medical" | "rescue" | "traffic" | "hazmat" | "other";

/**
 * Get incident trends over time (daily counts with category breakdown).
 * Returns array of { date, count, fire, medical, traffic, hazmat, rescue, other }.
 */
export const getIncidentTrends = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, days = 30, startTime, endTime }) => {
    // Calculate date range
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - days * 24 * 60 * 60 * 1000);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .collect();

    // Group by date and category
    const dailyData: Record<string, {
      count: number;
      fire: number;
      medical: number;
      traffic: number;
      hazmat: number;
      rescue: number;
      other: number;
    }> = {};

    // Initialize all days in range
    const startDate = new Date(effectiveStartTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveEndTime);
    endDate.setHours(23, 59, 59, 999);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = {
        count: 0,
        fire: 0,
        medical: 0,
        traffic: 0,
        hazmat: 0,
        rescue: 0,
        other: 0,
      };
    }

    // Count incidents
    for (const incident of incidents) {
      const date = new Date(incident.callReceivedTime);
      const dateStr = date.toISOString().split("T")[0];

      if (dailyData[dateStr]) {
        dailyData[dateStr].count++;
        const category = (incident.callTypeCategory || "other") as CallTypeCategory;
        dailyData[dateStr][category]++;
      }
    }

    // Convert to array sorted by date
    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Get call type distribution (category counts).
 * Returns { fire: n, medical: n, rescue: n, traffic: n, hazmat: n, other: n }.
 */
export const getCallTypeDistribution = query({
  args: {
    tenantId: v.id("tenants"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startTime, endTime }) => {
    let queryBuilder = ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId));

    if (startTime !== undefined || endTime !== undefined) {
      queryBuilder = queryBuilder.filter((q) => {
        const conditions: ReturnType<typeof q.eq>[] = [];
        if (startTime !== undefined) {
          conditions.push(q.gte(q.field("callReceivedTime"), startTime));
        }
        if (endTime !== undefined) {
          conditions.push(q.lte(q.field("callReceivedTime"), endTime));
        }
        return conditions.length === 1
          ? conditions[0]
          : q.and(...(conditions as [ReturnType<typeof q.eq>, ...ReturnType<typeof q.eq>[]]));
      });
    }

    const incidents = await queryBuilder.collect();

    const distribution = {
      fire: 0,
      medical: 0,
      rescue: 0,
      traffic: 0,
      hazmat: 0,
      other: 0,
    };

    for (const incident of incidents) {
      const category = (incident.callTypeCategory || "other") as CallTypeCategory;
      distribution[category]++;
    }

    return distribution;
  },
});

/**
 * Get hourly heatmap data (7x24 matrix: day of week x hour).
 * Returns array of { dayOfWeek: 0-6, hour: 0-23, count: n }.
 */
export const getHourlyHeatmap = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, days = 30, startTime, endTime }) => {
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - days * 24 * 60 * 60 * 1000);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .collect();

    // Initialize 7x24 matrix
    const heatmap: { dayOfWeek: number; hour: number; count: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push({ dayOfWeek: day, hour, count: 0 });
      }
    }

    // Count incidents by day/hour
    for (const incident of incidents) {
      const date = new Date(incident.callReceivedTime);
      const dayOfWeek = date.getDay(); // 0 = Sunday
      const hour = date.getHours();
      const index = dayOfWeek * 24 + hour;
      heatmap[index].count++;
    }

    return heatmap;
  },
});

/**
 * Get unit utilization stats.
 * Returns array of { unitId, dispatchCount, avgOnSceneTime }.
 */
export const getUnitUtilization = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, days = 30, startTime, endTime }) => {
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - days * 24 * 60 * 60 * 1000);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .collect();

    // Track unit stats
    const unitStats: Record<string, { dispatchCount: number; onSceneTimes: number[] }> = {};

    for (const incident of incidents) {
      // Count from units array
      if (incident.units) {
        for (const unit of incident.units) {
          if (!unitStats[unit]) {
            unitStats[unit] = { dispatchCount: 0, onSceneTimes: [] };
          }
          unitStats[unit].dispatchCount++;
        }
      }

      // Get on-scene times from unitStatuses if available
      if (incident.unitStatuses && Array.isArray(incident.unitStatuses)) {
        for (const us of incident.unitStatuses) {
          if (us.timeDispatched && us.timeOnScene) {
            const onSceneTime = us.timeOnScene - us.timeDispatched;
            if (!unitStats[us.unitId]) {
              unitStats[us.unitId] = { dispatchCount: 0, onSceneTimes: [] };
            }
            unitStats[us.unitId].onSceneTimes.push(onSceneTime);
          }
        }
      }
    }

    // Convert to array with averages
    return Object.entries(unitStats)
      .map(([unitId, stats]) => ({
        unitId,
        dispatchCount: stats.dispatchCount,
        avgOnSceneTime: stats.onSceneTimes.length > 0
          ? stats.onSceneTimes.reduce((a, b) => a + b, 0) / stats.onSceneTimes.length
          : null,
      }))
      .sort((a, b) => b.dispatchCount - a.dispatchCount);
  },
});

/**
 * Get response time statistics.
 * Returns { avg, median, p90, trend: [{ date, avgTime }] }.
 */
export const getResponseTimeStats = query({
  args: {
    tenantId: v.id("tenants"),
    days: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, days = 30, startTime, endTime }) => {
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - days * 24 * 60 * 60 * 1000);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .collect();

    // Collect response times (timeDispatched -> timeOnScene)
    const responseTimes: { time: number; date: string }[] = [];

    for (const incident of incidents) {
      if (incident.unitStatuses && Array.isArray(incident.unitStatuses)) {
        for (const us of incident.unitStatuses) {
          if (us.timeDispatched && us.timeOnScene) {
            const responseTime = us.timeOnScene - us.timeDispatched;
            const date = new Date(incident.callReceivedTime).toISOString().split("T")[0];
            responseTimes.push({ time: responseTime, date });
          }
        }
      }
    }

    // No response time data available
    if (responseTimes.length === 0) {
      return null;
    }

    // Calculate statistics
    const times = responseTimes.map(r => r.time).sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const p90 = times[Math.floor(times.length * 0.9)];

    // Daily trend
    const dailyTimes: Record<string, number[]> = {};
    for (const rt of responseTimes) {
      if (!dailyTimes[rt.date]) {
        dailyTimes[rt.date] = [];
      }
      dailyTimes[rt.date].push(rt.time);
    }

    const trend = Object.entries(dailyTimes)
      .map(([date, times]) => ({
        date,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      avg,
      median,
      p90,
      trend,
      totalDataPoints: responseTimes.length,
    };
  },
});

/**
 * Get summary statistics for the analytics dashboard header.
 */
export const getSummaryStats = query({
  args: {
    tenantId: v.id("tenants"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startTime, endTime }) => {
    let queryBuilder = ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId));

    if (startTime !== undefined || endTime !== undefined) {
      queryBuilder = queryBuilder.filter((q) => {
        const conditions: ReturnType<typeof q.eq>[] = [];
        if (startTime !== undefined) {
          conditions.push(q.gte(q.field("callReceivedTime"), startTime));
        }
        if (endTime !== undefined) {
          conditions.push(q.lte(q.field("callReceivedTime"), endTime));
        }
        return conditions.length === 1
          ? conditions[0]
          : q.and(...(conditions as [ReturnType<typeof q.eq>, ...ReturnType<typeof q.eq>[]]));
      });
    }

    const incidents = await queryBuilder.collect();

    // Count unique units
    const uniqueUnits = new Set<string>();
    for (const incident of incidents) {
      if (incident.units) {
        for (const unit of incident.units) {
          uniqueUnits.add(unit);
        }
      }
    }

    // Calculate average daily incidents
    if (incidents.length === 0) {
      return {
        totalIncidents: 0,
        uniqueUnits: 0,
        avgDailyIncidents: 0,
      };
    }

    const dates = new Set<string>();
    for (const incident of incidents) {
      const date = new Date(incident.callReceivedTime).toISOString().split("T")[0];
      dates.add(date);
    }

    const avgDaily = dates.size > 0 ? incidents.length / dates.size : 0;

    return {
      totalIncidents: incidents.length,
      uniqueUnits: uniqueUnits.size,
      avgDailyIncidents: Math.round(avgDaily * 10) / 10,
    };
  },
});

/**
 * Get weather correlation data - compare incident rates during weather alerts vs normal days.
 * Returns { normalDays, normalIncidents, normalAvgPerDay, alertDays, alertIncidents, alertAvgPerDay, byAlertType }.
 */
export const getWeatherCorrelation = query({
  args: {
    tenantId: v.id("tenants"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, startTime, endTime }) => {
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - 30 * 24 * 60 * 60 * 1000);

    // Get all incidents in range
    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .collect();

    // Get all weather alerts in range (active during this period)
    const weatherAlerts = await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Filter to alerts that overlap with our time range
    const relevantAlerts = weatherAlerts.filter(alert => {
      const alertStart = alert.onset ?? (alert._creationTime);
      const alertEnd = alert.expires ?? alert.ends ?? alertStart;
      return alertStart <= effectiveEndTime && alertEnd >= effectiveStartTime;
    });

    // Build a set of days that had active weather alerts
    const alertDaysSet = new Set<string>();
    const alertTypeByDay: Record<string, Set<string>> = {};

    for (const alert of relevantAlerts) {
      const alertStart = new Date(alert.onset ?? alert._creationTime);
      const alertEnd = new Date(alert.expires ?? alert.ends ?? alert._creationTime);
      
      // Clamp to our date range
      const start = new Date(Math.max(alertStart.getTime(), effectiveStartTime));
      const end = new Date(Math.min(alertEnd.getTime(), effectiveEndTime));
      
      // Mark each day the alert was active
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        alertDaysSet.add(dateStr);
        
        if (!alertTypeByDay[dateStr]) {
          alertTypeByDay[dateStr] = new Set();
        }
        alertTypeByDay[dateStr].add(alert.event);
      }
    }

    // Count incidents by day and categorize
    const incidentsByDay: Record<string, number> = {};
    
    for (const incident of incidents) {
      const dateStr = new Date(incident.callReceivedTime).toISOString().split("T")[0];
      incidentsByDay[dateStr] = (incidentsByDay[dateStr] || 0) + 1;
    }

    // Calculate totals
    let normalDays = 0;
    let normalIncidents = 0;
    let alertDays = 0;
    let alertIncidents = 0;

    // Track by alert type
    const alertTypeStats: Record<string, { days: Set<string>; incidents: number }> = {};

    // Get all days in range
    const startDate = new Date(effectiveStartTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(effectiveEndTime);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayIncidents = incidentsByDay[dateStr] || 0;
      
      if (alertDaysSet.has(dateStr)) {
        alertDays++;
        alertIncidents += dayIncidents;
        
        // Track by alert type
        const types = alertTypeByDay[dateStr];
        if (types) {
          for (const eventType of types) {
            if (!alertTypeStats[eventType]) {
              alertTypeStats[eventType] = { days: new Set(), incidents: 0 };
            }
            alertTypeStats[eventType].days.add(dateStr);
            alertTypeStats[eventType].incidents += dayIncidents;
          }
        }
      } else {
        normalDays++;
        normalIncidents += dayIncidents;
      }
    }

    // Convert alert type stats to array
    const byAlertType = Object.entries(alertTypeStats)
      .map(([event, stats]) => ({
        event,
        days: stats.days.size,
        incidents: stats.incidents,
        avgPerDay: stats.days.size > 0 ? stats.incidents / stats.days.size : 0,
      }))
      .sort((a, b) => b.avgPerDay - a.avgPerDay);

    return {
      normalDays,
      normalIncidents,
      normalAvgPerDay: normalDays > 0 ? normalIncidents / normalDays : 0,
      alertDays,
      alertIncidents,
      alertAvgPerDay: alertDays > 0 ? alertIncidents / alertDays : 0,
      byAlertType,
    };
  },
});

/**
 * Get incidents for a specific unit (for drill-down).
 * Returns array of incidents that the unit responded to.
 */
export const getUnitIncidents = query({
  args: {
    tenantId: v.id("tenants"),
    unitId: v.string(),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, unitId, startTime, endTime, limit = 50 }) => {
    const now = Date.now();
    const effectiveEndTime = endTime ?? now;
    const effectiveStartTime = startTime ?? (now - 30 * 24 * 60 * 60 * 1000);

    const incidents = await ctx.db
      .query("incidents")
      .withIndex("by_tenant_time", (q) => q.eq("tenantId", tenantId))
      .filter((q) =>
        q.and(
          q.gte(q.field("callReceivedTime"), effectiveStartTime),
          q.lte(q.field("callReceivedTime"), effectiveEndTime)
        )
      )
      .order("desc")
      .collect();

    // Filter to incidents with this unit
    const unitIncidents = incidents
      .filter(incident => incident.units?.includes(unitId))
      .slice(0, limit)
      .map(incident => ({
        _id: incident._id,
        callType: incident.callType,
        callTypeCategory: incident.callTypeCategory,
        fullAddress: incident.fullAddress,
        callReceivedTime: incident.callReceivedTime,
        status: incident.status,
        units: incident.units,
      }));

    return unitIncidents;
  },
});
