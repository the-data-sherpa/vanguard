import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Master tick: Runs every 2 minutes
 *
 * Replaces multiple separate cron jobs to reduce DB bandwidth and function calls.
 * - Syncs PulsePoint incidents for all enabled tenants
 * - Syncs NWS weather alerts for all enabled tenants
 *
 * Uses rate limiting and locking to prevent excessive API calls.
 */
crons.interval(
  "master-tick",
  { seconds: 120 }, // 2 minutes
  internal.scheduler.tick
);

/**
 * Maintenance tick: Runs every 15 minutes
 *
 * Handles periodic cleanup tasks:
 * - Close stale incidents (not updated in 2+ hours)
 */
crons.interval(
  "maintenance-tick",
  { minutes: 15 },
  internal.scheduler.maintenanceTick
);

/**
 * Daily cleanup: Runs at 6 AM UTC (2 AM ET)
 *
 * - Removes expired weather alerts (older than 24 hours)
 * - Deletes old incidents (30-day retention policy)
 * - Syncs unit legends from PulsePoint
 */
crons.daily(
  "daily-cleanup",
  { hourUTC: 6, minuteUTC: 0 }, // 6:00 AM UTC / 2:00 AM ET
  internal.scheduler.dailyCleanupTick
);

export default crons;
