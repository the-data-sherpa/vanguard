import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ===================
// Reusable Validators
// ===================

const tenantStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("deactivated"),
  v.literal("pending_deletion")
);

const tenantTier = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("professional"),
  v.literal("enterprise")
);

const incidentSource = v.union(
  v.literal("pulsepoint"),
  v.literal("user_submitted"),
  v.literal("merged"),
  v.literal("manual")
);

const incidentStatus = v.union(
  v.literal("active"),
  v.literal("closed"),
  v.literal("archived")
);

const callTypeCategory = v.union(
  v.literal("fire"),
  v.literal("medical"),
  v.literal("rescue"),
  v.literal("traffic"),
  v.literal("hazmat"),
  v.literal("other")
);

const alertSeverity = v.union(
  v.literal("Extreme"),
  v.literal("Severe"),
  v.literal("Moderate"),
  v.literal("Minor"),
  v.literal("Unknown")
);

const alertUrgency = v.union(
  v.literal("Immediate"),
  v.literal("Expected"),
  v.literal("Future"),
  v.literal("Unknown")
);

const alertCertainty = v.union(
  v.literal("Observed"),
  v.literal("Likely"),
  v.literal("Possible"),
  v.literal("Unlikely"),
  v.literal("Unknown")
);

const alertStatus = v.union(
  v.literal("active"),
  v.literal("expired"),
  v.literal("cancelled")
);

// ===================
// Schema Definition
// ===================

export default defineSchema({
  // ===================
  // Tenants
  // ===================
  tenants: defineTable({
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    status: tenantStatus,
    tier: tenantTier,

    // PulsePoint Configuration
    pulsepointConfig: v.optional(
      v.object({
        enabled: v.boolean(),
        agencyIds: v.array(v.string()),
        syncInterval: v.number(),
        callTypes: v.optional(v.array(v.string())),
      })
    ),

    // Weather Configuration
    weatherZones: v.optional(v.array(v.string())),

    // Features & Limits
    features: v.optional(
      v.object({
        facebook: v.optional(v.boolean()),
        twitter: v.optional(v.boolean()),
        instagram: v.optional(v.boolean()),
        discord: v.optional(v.boolean()),
        weatherAlerts: v.optional(v.boolean()),
        userSubmissions: v.optional(v.boolean()),
        forum: v.optional(v.boolean()),
        customBranding: v.optional(v.boolean()),
        apiAccess: v.optional(v.boolean()),
        advancedAnalytics: v.optional(v.boolean()),
      })
    ),
    limits: v.optional(
      v.object({
        maxUsers: v.optional(v.number()),
        maxIncidentsPerDay: v.optional(v.number()),
        maxApiRequestsPerHour: v.optional(v.number()),
        maxStorageMb: v.optional(v.number()),
        maxSocialAccounts: v.optional(v.number()),
      })
    ),

    // Billing & Trial
    trialEndsAt: v.optional(v.number()),
    billingCustomerId: v.optional(v.string()),
    billingSubscriptionId: v.optional(v.string()),

    // Deactivation
    deactivatedAt: v.optional(v.number()),
    deactivatedReason: v.optional(v.string()),
    deletionScheduledAt: v.optional(v.number()),

    // Unit Legend (for PulsePoint unit codes)
    unitLegend: v.optional(
      v.array(
        v.object({
          UnitKey: v.string(),
          Description: v.string(),
        })
      )
    ),
    unitLegendUpdatedAt: v.optional(v.number()),
    unitLegendAvailable: v.optional(v.boolean()),

    // Sync tracking
    lastIncidentSync: v.optional(v.number()),
    lastWeatherSync: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // ===================
  // Incidents
  // ===================
  incidents: defineTable({
    tenantId: v.id("tenants"),
    groupId: v.optional(v.id("incidentGroups")),

    // Source & External ID
    source: incidentSource,
    externalId: v.optional(v.string()),

    // Call Details
    callType: v.string(),
    callTypeCategory: v.optional(callTypeCategory),
    description: v.optional(v.string()),

    // Location
    fullAddress: v.string(),
    normalizedAddress: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),

    // Units
    units: v.optional(v.array(v.string())),
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

    // Status & Times
    status: incidentStatus,
    callReceivedTime: v.number(),
    callClosedTime: v.optional(v.number()),

    // User Submission
    submittedBy: v.optional(v.id("users")),
    moderationStatus: v.optional(
      v.union(
        v.literal("auto_approved"),
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
    moderatedBy: v.optional(v.id("users")),
    moderatedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),

    // Social Sync
    isSyncedToFacebook: v.optional(v.boolean()),
    facebookPostId: v.optional(v.string()),
    needsFacebookUpdate: v.optional(v.boolean()),
    lastSyncAttempt: v.optional(v.number()),
    syncError: v.optional(v.string()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_time", ["tenantId", "callReceivedTime"])
    .index("by_tenant_external", ["tenantId", "externalId"])
    .index("by_tenant_address_type", ["tenantId", "normalizedAddress", "callType"]),

  // ===================
  // Incident Groups (for merging related incidents)
  // ===================
  incidentGroups: defineTable({
    tenantId: v.id("tenants"),
    mergeKey: v.string(),
    mergeReason: v.union(v.literal("auto_address_time"), v.literal("manual")),
    callType: v.optional(v.string()),
    normalizedAddress: v.optional(v.string()),
    windowStart: v.optional(v.number()),
    windowEnd: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_key", ["tenantId", "mergeKey"]),

  // ===================
  // Weather Alerts
  // ===================
  weatherAlerts: defineTable({
    tenantId: v.id("tenants"),
    nwsId: v.string(),
    event: v.string(),
    headline: v.string(),
    description: v.optional(v.string()),
    instruction: v.optional(v.string()),
    severity: alertSeverity,
    urgency: v.optional(alertUrgency),
    certainty: v.optional(alertCertainty),
    category: v.optional(v.string()),
    onset: v.optional(v.number()),
    expires: v.number(),
    ends: v.optional(v.number()),
    affectedZones: v.optional(v.array(v.string())),
    status: alertStatus,

    // Social Sync
    isSyncedToFacebook: v.optional(v.boolean()),
    facebookPostId: v.optional(v.string()),
    lastFacebookPostTime: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_nwsid", ["tenantId", "nwsId"]),

  // ===================
  // Users
  // ===================
  users: defineTable({
    tenantId: v.optional(v.id("tenants")),
    email: v.string(),
    emailVisibility: v.boolean(),
    verified: v.boolean(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("platform_admin")),
    tenantRole: v.optional(
      v.union(
        v.literal("member"),
        v.literal("moderator"),
        v.literal("admin"),
        v.literal("owner")
      )
    ),
    isActive: v.optional(v.boolean()),
    isBanned: v.optional(v.boolean()),
    bannedAt: v.optional(v.number()),
    bannedReason: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
        emailNotifications: v.optional(v.boolean()),
        pushNotifications: v.optional(v.boolean()),
        timezone: v.optional(v.string()),
      })
    ),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_tenant", ["tenantId"]),

  // ===================
  // Audit Logs
  // ===================
  auditLogs: defineTable({
    tenantId: v.optional(v.id("tenants")),
    actorId: v.string(),
    actorType: v.optional(v.union(v.literal("user"), v.literal("system"), v.literal("api"))),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    result: v.optional(v.union(v.literal("success"), v.literal("failure"))),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_actor", ["actorId"]),
});
