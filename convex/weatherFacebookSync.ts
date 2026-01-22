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
const AUTO_POST_THRESHOLD = 55;

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

  // Extreme severity always posts regardless of other factors
  if (alert.severity === "Extreme") {
    return { shouldPost: true, reason: "Extreme severity alert" };
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
 * Severity to emoji mapping
 */
const SEVERITY_EMOJI: Record<string, string> = {
  Extreme: "🔴",
  Severe: "🟠",
  Moderate: "🟡",
  Minor: "🟢",
  Unknown: "⚠️",
};

/**
 * Parse NWS structured description into sections
 * NWS descriptions use * WHAT..., * WHERE..., * WHEN..., * IMPACTS... format
 */
function parseNWSDescription(description: string): {
  what?: string;
  where?: string;
  when?: string;
  impacts?: string;
  additional?: string;
} {
  const sections: Record<string, string> = {};

  // Match sections like "* WHAT..." or "* ADDITIONAL DETAILS..."
  const sectionRegex = /\*\s*(WHAT|WHERE|WHEN|IMPACTS|ADDITIONAL DETAILS)\.{3}([^*]*)/gi;
  let match;

  while ((match = sectionRegex.exec(description)) !== null) {
    const key = match[1].toLowerCase().replace(" details", "");
    // Clean up the text: trim and normalize whitespace
    const value = match[2].trim().replace(/\s+/g, " ");
    sections[key] = value;
  }

  return {
    what: sections["what"],
    where: sections["where"],
    when: sections["when"],
    impacts: sections["impacts"],
    additional: sections["additional"],
  };
}

/**
 * Truncate instruction text to approximately 3-4 sentences
 */
function truncateInstructions(instruction: string, maxSentences: number = 3): string {
  // Split by sentence-ending punctuation followed by space or newline
  const sentences = instruction.split(/(?<=[.!?])\s+/).filter((s) => s.trim());

  if (sentences.length <= maxSentences) {
    return instruction.trim();
  }

  return sentences.slice(0, maxSentences).join(" ").trim();
}

/**
 * Extract state abbreviations from zone codes for hashtags
 */
function extractStateHashtags(zones: string[]): string[] {
  const states = new Set<string>();

  for (const zone of zones) {
    // Zone URLs look like "https://api.weather.gov/zones/forecast/NCZ060"
    const match = zone.match(/\/([A-Z]{2})Z\d{3}$/);
    if (match) {
      states.add(match[1]);
    }
  }

  // Convert to hashtags (e.g., NC -> #NCwx)
  return Array.from(states).map((state) => `#${state}wx`);
}

/**
 * Format a weather alert for Facebook posting
 */
function formatWeatherPost(alert: Doc<"weatherAlerts">, tenantName?: string, timezone?: string): string {
  const lines: string[] = [];
  const tz = timezone || "America/New_York";

  // Header with severity emoji and event name in caps
  const emoji = SEVERITY_EMOJI[alert.severity] || "⚠️";
  lines.push(`${emoji} ${alert.event.toUpperCase()}`);

  // Parse structured description
  const parsed = alert.description ? parseNWSDescription(alert.description) : {};

  // WHERE first (location context)
  if (parsed.where) {
    lines.push(`📍 WHERE: ${parsed.where}`);
  }

  lines.push("");

  // WHAT
  if (parsed.what) {
    lines.push(`❄️ WHAT: ${parsed.what}`);
  }

  lines.push("");

  // WHEN with dates
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: tz,
    });
  };

  if (parsed.when) {
    // Use 'ends' for actual event end time, fall back to 'expires'
    const endsTimestamp = alert.ends || alert.expires;
    const onsetDate = alert.onset ? formatDate(alert.onset) : null;
    const endsDate = formatDate(endsTimestamp);

    let whenText = `⏰ WHEN: ${parsed.when}`;
    if (onsetDate && endsDate) {
      whenText += ` (${onsetDate} - ${endsDate})`;
    }
    lines.push(whenText);
  }

  lines.push("");

  // IMPACTS
  if (parsed.impacts) {
    lines.push(`⚠️ IMPACTS:`);
    lines.push(parsed.impacts);
  }

  lines.push("");

  // INSTRUCTIONS (truncated)
  if (alert.instruction) {
    lines.push(`📋 INSTRUCTIONS:`);
    lines.push(truncateInstructions(alert.instruction, 2));
  }

  lines.push("");

  // Hashtags from affected zones + event type
  const hashtags: string[] = [];

  if (alert.affectedZones && alert.affectedZones.length > 0) {
    hashtags.push(...extractStateHashtags(alert.affectedZones));
  }

  // Add event-based hashtag
  const eventHashtag = alert.event.replace(/\s+/g, "");
  hashtags.push(`#${eventHashtag}`);

  // Add NWS office hashtag from headline if available
  const nwsMatch = alert.headline.match(/NWS\s+([\w-]+)/i);
  if (nwsMatch) {
    hashtags.push(`#NWS${nwsMatch[1].replace(/[^a-zA-Z]/g, "")}`);
  }

  lines.push(hashtags.join(" "));

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
