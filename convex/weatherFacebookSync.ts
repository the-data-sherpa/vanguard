import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// ===================
// Threat Matrix Scoring (from ICAW)
// ===================

/**
 * Severity scores for threat matrix
 * Extreme=40, Severe=30, Moderate=20, Minor=10, Unknown=5
 */
const SEVERITY_SCORES: Record<string, number> = {
  Extreme: 40,
  Severe: 30,
  Moderate: 20,
  Minor: 10,
  Unknown: 5,
};

/**
 * Urgency scores for threat matrix
 * Immediate=30, Expected=20, Future=10, Unknown=5
 */
const URGENCY_SCORES: Record<string, number> = {
  Immediate: 30,
  Expected: 20,
  Future: 10,
  Unknown: 5,
};

/**
 * Certainty scores for threat matrix
 * Observed=30, Likely=25, Possible=15, Unlikely=5, Unknown=5
 */
const CERTAINTY_SCORES: Record<string, number> = {
  Observed: 30,
  Likely: 25,
  Possible: 15,
  Unlikely: 5,
  Unknown: 5,
};

/**
 * Calculate threat score for a weather alert (0-100)
 */
function calculateThreatScore(alert: Doc<"weatherAlerts">): number {
  const severityScore = SEVERITY_SCORES[alert.severity] || 5;
  const urgencyScore = URGENCY_SCORES[alert.urgency || "Unknown"] || 5;
  const certaintyScore = CERTAINTY_SCORES[alert.certainty || "Unknown"] || 5;

  return severityScore + urgencyScore + certaintyScore;
}

// ===================
// Always-Post Events
// ===================

/**
 * Critical events that bypass the scoring threshold
 * These are posted regardless of the calculated score
 */
const ALWAYS_POST_EVENTS = [
  "Tornado Warning",
  "Tornado Watch",
  "Severe Thunderstorm Warning",
  "Flash Flood Warning",
  "Hurricane Warning",
  "Extreme Wind Warning",
  "Storm Surge Warning",
  "Tsunami Warning",
];

/**
 * Minimum score threshold for auto-posting (if not an always-post event)
 */
const AUTO_POST_THRESHOLD = 60;

/**
 * Recurring post interval (6 hours in milliseconds)
 */
const RECURRING_POST_INTERVAL_MS = 6 * 60 * 60 * 1000;

// ===================
// Posting Logic
// ===================

/**
 * Check if a weather alert should be posted to Facebook
 */
function shouldPostAlert(alert: Doc<"weatherAlerts">): { shouldPost: boolean; reason?: string } {
  // Don't post expired or cancelled alerts
  if (alert.status !== "active") {
    return { shouldPost: false, reason: "Alert is not active" };
  }

  // Check if alert has expired
  if (alert.expires < Date.now()) {
    return { shouldPost: false, reason: "Alert has expired" };
  }

  // Check if this was posted recently (within 6 hours)
  if (alert.lastFacebookPostTime) {
    const timeSinceLastPost = Date.now() - alert.lastFacebookPostTime;
    if (timeSinceLastPost < RECURRING_POST_INTERVAL_MS) {
      return { shouldPost: false, reason: `Posted ${Math.round(timeSinceLastPost / (60 * 1000))} minutes ago` };
    }
  }

  // Check if it's an always-post event
  if (ALWAYS_POST_EVENTS.includes(alert.event)) {
    return { shouldPost: true, reason: `Critical event: ${alert.event}` };
  }

  // Calculate threat score
  const score = calculateThreatScore(alert);
  if (score >= AUTO_POST_THRESHOLD) {
    return { shouldPost: true, reason: `Threat score ${score} >= ${AUTO_POST_THRESHOLD}` };
  }

  return { shouldPost: false, reason: `Threat score ${score} < ${AUTO_POST_THRESHOLD}` };
}

// ===================
// Post Formatting
// ===================

/**
 * Format a weather alert for Facebook posting
 */
function formatWeatherPost(alert: Doc<"weatherAlerts">, tenantName?: string, timezone?: string): string {
  const lines: string[] = [];
  const tz = timezone || "America/New_York";

  // Header
  lines.push(`⚠️ WEATHER ALERT: ${alert.event}`);
  lines.push("");

  // Headline
  lines.push(alert.headline);
  lines.push("");

  // Description (truncated to 500 chars)
  if (alert.description) {
    const description = alert.description.length > 500
      ? alert.description.substring(0, 497) + "..."
      : alert.description;
    lines.push(description);
    lines.push("");
  }

  // Affected areas (extract zone names if available)
  if (alert.affectedZones && alert.affectedZones.length > 0) {
    // Zone URLs look like "https://api.weather.gov/zones/forecast/NCZ060"
    // Extract just the zone codes
    const zoneCodes = alert.affectedZones.map((zone) => {
      const match = zone.match(/\/([A-Z]{2}Z\d{3})$/);
      return match ? match[1] : zone;
    });
    lines.push(`📍 Affected Areas: ${zoneCodes.join(", ")}`);
  }

  // Timing
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  };

  if (alert.onset || alert.expires) {
    const onset = alert.onset ? formatTime(alert.onset) : "Now";
    const expires = formatTime(alert.expires);
    lines.push(`⏰ Effective: ${onset} - ${expires}`);
  }

  lines.push("");
  lines.push("Stay safe and monitor conditions.");

  return lines.join("\n");
}

// ===================
// Facebook API
// ===================

/**
 * Post a message to Facebook
 */
async function postToFacebook(
  pageId: string,
  pageToken: string,
  message: string
): Promise<{ id: string } | null> {
  try {
    // Use v24.0 API version
    const url = `https://graph.facebook.com/v24.0/${pageId}/feed`;
    console.log(`[Weather Facebook] Posting to page ${pageId}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        access_token: pageToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Weather Facebook] Post failed (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    console.log(`[Weather Facebook] Post successful: ${result.id}`);
    return result;
  } catch (error) {
    console.error("[Weather Facebook] Post error:", error);
    return null;
  }
}

// ===================
// Internal Queries
// ===================

/**
 * Get active weather alerts that may need posting
 */
export const getAlertsToSync = internalQuery({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const now = Date.now();

    // Get active alerts that haven't expired
    return await ctx.db
      .query("weatherAlerts")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .filter((q) => q.gt(q.field("expires"), now))
      .collect();
  },
});

// ===================
// Internal Mutations
// ===================

/**
 * Mark a weather alert as posted to Facebook
 */
export const markWeatherAlertPosted = internalMutation({
  args: {
    alertId: v.id("weatherAlerts"),
    facebookPostId: v.string(),
  },
  handler: async (ctx, { alertId, facebookPostId }) => {
    await ctx.db.patch(alertId, {
      isSyncedToFacebook: true,
      facebookPostId,
      lastFacebookPostTime: Date.now(),
    });
  },
});

// ===================
// Main Sync Action
// ===================

/**
 * Sync weather alerts to Facebook for a single tenant
 */
export const syncWeatherToFacebook = internalAction({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    // Get page token
    const credentials = await ctx.runMutation(internal.facebook.getPageToken, {
      tenantId,
    });

    if (!credentials || !credentials.pageToken || !credentials.pageId) {
      console.log(`[Weather Facebook] No Facebook credentials for tenant ${tenantId}`);
      return { posted: 0, skipped: 0 };
    }

    // Get tenant for timezone
    const tenant = await ctx.runQuery(internal.tenants.getByIdInternal, { tenantId });
    const timezone = tenant?.timezone || "America/New_York";
    const tenantName = tenant?.displayName || tenant?.name;

    // Get active alerts
    const alerts = await ctx.runQuery(internal.weatherFacebookSync.getAlertsToSync, {
      tenantId,
    });

    if (alerts.length === 0) {
      return { posted: 0, skipped: 0 };
    }

    let posted = 0;
    let skipped = 0;

    for (const alert of alerts) {
      // Check if alert should be posted
      const { shouldPost, reason } = shouldPostAlert(alert);

      if (!shouldPost) {
        console.log(`[Weather Facebook] Skipping alert ${alert.nwsId}: ${reason}`);
        skipped++;
        continue;
      }

      console.log(`[Weather Facebook] Posting alert ${alert.nwsId}: ${reason}`);

      // Format the post
      const message = formatWeatherPost(alert, tenantName, timezone);

      // Post to Facebook
      const result = await postToFacebook(
        credentials.pageId,
        credentials.pageToken,
        message
      );

      if (result?.id) {
        // Mark as posted
        await ctx.runMutation(internal.weatherFacebookSync.markWeatherAlertPosted, {
          alertId: alert._id,
          facebookPostId: result.id,
        });

        posted++;
        console.log(`[Weather Facebook] Posted alert ${alert.nwsId} as ${result.id}`);
      } else {
        console.error(`[Weather Facebook] Failed to post alert ${alert.nwsId}`);
      }
    }

    return { posted, skipped };
  },
});

/**
 * Sync weather alerts to Facebook for all tenants
 * Called by scheduler
 */
export const syncAllTenants = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active tenants with Facebook connected
    const tenants = await ctx.runQuery(api.tenants.listActive, {});

    let totalPosted = 0;
    let totalSkipped = 0;

    for (const tenant of tenants) {
      // Skip tenants without Facebook or weather features
      if (!tenant.facebookPageId) {
        continue;
      }

      if (!tenant.features?.weatherAlerts || !tenant.weatherZones?.length) {
        continue;
      }

      try {
        const result = await ctx.runAction(internal.weatherFacebookSync.syncWeatherToFacebook, {
          tenantId: tenant._id,
        });
        totalPosted += result.posted;
        totalSkipped += result.skipped;
      } catch (error) {
        console.error(`[Weather Facebook] Error syncing tenant ${tenant.slug}:`, error);
      }
    }

    console.log(`[Weather Facebook] Sync complete: ${totalPosted} posted, ${totalSkipped} skipped`);

    return { totalPosted, totalSkipped };
  },
});
