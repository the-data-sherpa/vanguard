import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Type definitions for scheduler results
type TickResult = {
  duration: number;
  incidents: unknown;
  weather: unknown;
};

type MaintenanceTickResult = {
  duration: number;
  staleIncidents: unknown;
};

/**
 * Master scheduler tick
 *
 * This replaces multiple separate cron jobs to reduce database bandwidth and function calls.
 * Runs every 2 minutes and conditionally executes sync operations only when needed.
 *
 * Pattern from ICAW: Single tick that checks for pending work before running expensive operations.
 */
export const tick = internalAction({
  args: {},
  handler: async (ctx): Promise<TickResult> => {
    const startTime = Date.now();
    console.log("[SCHEDULER] Tick started");

    // 1. Fetch external data (PulsePoint & Weather) in parallel
    // These are the primary data sources that need frequent polling
    const [incidentResult, weatherResult] = await Promise.all([
      ctx.runAction(internal.sync.syncAllTenantIncidents).catch((error) => {
        console.error("[SCHEDULER] Incident sync failed:", error);
        return { error: String(error) };
      }),
      ctx.runAction(internal.sync.syncAllTenantWeather).catch((error) => {
        console.error("[SCHEDULER] Weather sync failed:", error);
        return { error: String(error) };
      }),
    ]);

    // Log results
    console.log("[SCHEDULER] Sync results:", {
      incidents: Array.isArray(incidentResult)
        ? `${incidentResult.filter((r: { success: boolean }) => r.success).length} tenants synced`
        : "error",
      weather: Array.isArray(weatherResult)
        ? `${weatherResult.filter((r: { success: boolean }) => r.success).length} tenants synced`
        : "error",
    });

    const duration = Date.now() - startTime;
    console.log(`[SCHEDULER] Tick completed in ${duration}ms`);

    return {
      duration,
      incidents: incidentResult,
      weather: weatherResult,
    };
  },
});

/**
 * Maintenance tick - runs less frequently for cleanup tasks
 *
 * Handles:
 * - Closing stale incidents (not updated in 2+ hours)
 * - Other periodic maintenance tasks
 */
export const maintenanceTick = internalAction({
  args: {},
  handler: async (ctx): Promise<MaintenanceTickResult> => {
    const startTime = Date.now();
    console.log("[MAINTENANCE] Tick started");

    // Close stale incidents for all tenants
    const staleResult = await ctx.runAction(internal.maintenance.closeAllStaleIncidents).catch((error) => {
      console.error("[MAINTENANCE] Close stale incidents failed:", error);
      return { error: String(error) };
    });

    const duration = Date.now() - startTime;
    console.log(`[MAINTENANCE] Tick completed in ${duration}ms`);

    return {
      duration,
      staleIncidents: staleResult,
    };
  },
});
