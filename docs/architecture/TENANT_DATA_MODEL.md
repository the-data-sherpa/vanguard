# Tenant Data Model

> Complete schema reference for the Vanguard multi-tenant platform
>
> Version: 2.0.0
> Last Updated: January 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Convex Schema](#2-convex-schema)
3. [Table Definitions](#3-table-definitions)
4. [Data Relationships](#4-data-relationships)
5. [Index Strategy](#5-index-strategy)

---

## 1. Overview

### 1.1 Schema Design Principles

1. **Tenant Isolation**: All tenant data includes `tenantId` foreign key
2. **Real-Time Ready**: Schema optimized for Convex subscriptions
3. **Type Safety**: Convex validators enforce data types
4. **Index Performance**: Indexes defined for common query patterns

### 1.2 Table Categories

| Category | Tenant Scope | Description |
|----------|--------------|-------------|
| **Platform** | No | Tenant registry |
| **Core Data** | Yes | Incidents, weather alerts |
| **User Data** | Yes | Users, preferences |
| **Operations** | Yes | Audit logs |

---

## 2. Convex Schema

The complete schema is defined in `convex/schema.ts`. This document provides reference documentation.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // See table definitions below
});
```

---

## 3. Table Definitions

### 3.1 tenants

Tenant registry and configuration.

```typescript
tenants: defineTable({
  // Identity
  slug: v.string(),                    // URL-safe identifier (unique)
  name: v.string(),                    // Official name
  displayName: v.optional(v.string()), // Display name

  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("active"),
    v.literal("suspended"),
    v.literal("deactivated")
  ),
  tier: v.union(
    v.literal("free"),
    v.literal("starter"),
    v.literal("professional"),
    v.literal("enterprise")
  ),

  // External Integrations
  pulsepointAgencyId: v.optional(v.string()),
  weatherZones: v.optional(v.array(v.string())),  // NWS zone codes

  // Features & Limits
  features: v.optional(v.object({
    pulsepoint: v.boolean(),
    weather: v.boolean(),
    userSubmissions: v.boolean(),
  })),
  limits: v.optional(v.object({
    maxUsers: v.number(),
    maxIncidentsPerMonth: v.number(),
  })),

  // Unit Legend (for display names)
  unitLegend: v.optional(v.array(v.object({
    pattern: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
  }))),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"]),
```

### 3.2 incidents

Emergency incidents from PulsePoint or manual entry.

```typescript
incidents: defineTable({
  tenantId: v.id("tenants"),

  // Source & Identity
  pulsePointId: v.optional(v.string()),    // External ID from PulsePoint

  // Location
  fullAddress: v.string(),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  city: v.optional(v.string()),

  // Incident Details
  callType: v.string(),                    // e.g., "SF", "ME", "TC"
  callTypeDescription: v.optional(v.string()),

  // Units
  units: v.array(v.string()),              // Unit identifiers
  unitStatuses: v.optional(v.array(v.object({
    unitId: v.string(),
    status: v.string(),
    timestamp: v.optional(v.number()),
  }))),

  // Status & Timing
  status: v.union(
    v.literal("active"),
    v.literal("closed"),
    v.literal("archived")
  ),
  callReceivedTime: v.number(),            // Unix timestamp
  callClosedTime: v.optional(v.number()),

  // Grouping
  groupId: v.optional(v.id("incidentGroups")),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_status", ["tenantId", "status"])
  .index("by_tenant_received", ["tenantId", "callReceivedTime"])
  .index("by_tenant_pulsepoint", ["tenantId", "pulsePointId"]),
```

### 3.3 incidentGroups

Merged incident groupings.

```typescript
incidentGroups: defineTable({
  tenantId: v.id("tenants"),
  name: v.string(),
  address: v.string(),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"]),
```

### 3.4 weatherAlerts

NWS weather alerts for tenant's zones.

```typescript
weatherAlerts: defineTable({
  tenantId: v.id("tenants"),

  // NWS Data
  nwsId: v.string(),                       // NWS alert identifier
  event: v.string(),                       // e.g., "Tornado Warning"
  headline: v.string(),
  description: v.string(),
  instruction: v.optional(v.string()),

  // Severity
  severity: v.string(),                    // Extreme, Severe, Moderate, Minor
  urgency: v.string(),                     // Immediate, Expected, Future
  certainty: v.string(),                   // Observed, Likely, Possible

  // Timing
  onset: v.number(),                       // Unix timestamp
  expires: v.number(),                     // Unix timestamp
  ends: v.optional(v.number()),

  // Geographic
  affectedZones: v.array(v.string()),      // NWS zone codes

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("expired"),
    v.literal("cancelled")
  ),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_status", ["tenantId", "status"])
  .index("by_tenant_nws", ["tenantId", "nwsId"]),
```

### 3.5 users

User accounts with tenant association.

```typescript
users: defineTable({
  // Tenant Association
  tenantId: v.optional(v.id("tenants")),   // Null for platform admins

  // Identity
  email: v.string(),
  name: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),

  // Roles
  role: v.union(
    v.literal("user"),
    v.literal("platform_admin")
  ),
  tenantRole: v.optional(v.union(
    v.literal("member"),
    v.literal("moderator"),
    v.literal("admin"),
    v.literal("owner")
  )),

  // Status
  isActive: v.boolean(),
  emailVerified: v.optional(v.boolean()),
  lastLoginAt: v.optional(v.number()),

  // Preferences
  preferences: v.optional(v.object({
    theme: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
  })),
})
  .index("by_email", ["email"])
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_role", ["tenantId", "tenantRole"]),
```

### 3.6 auditLogs

Audit trail for compliance.

```typescript
auditLogs: defineTable({
  tenantId: v.optional(v.id("tenants")),   // Null for platform actions

  // Actor
  actorId: v.optional(v.id("users")),
  actorType: v.union(
    v.literal("user"),
    v.literal("system"),
    v.literal("api")
  ),

  // Action
  action: v.string(),                      // e.g., "incident:created"
  targetType: v.optional(v.string()),      // e.g., "incident"
  targetId: v.optional(v.string()),

  // Details
  details: v.optional(v.any()),
  ipAddress: v.optional(v.string()),

  // Metadata
  timestamp: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_tenant_timestamp", ["tenantId", "timestamp"])
  .index("by_actor", ["actorId"]),
```

---

## 4. Data Relationships

### 4.1 Entity Relationship Diagram

```
                              ┌─────────────────┐
                              │     TENANTS     │
                              │  (Registry)     │
                              └────────┬────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     USERS       │         │   INCIDENTS     │         │ WEATHER_ALERTS  │
│  tenantId: FK   │         │  tenantId: FK   │         │  tenantId: FK   │
└────────┬────────┘         │  groupId: FK?   │         └─────────────────┘
         │                  └────────┬────────┘
         │                           │
         │                           ▼
         │                  ┌─────────────────┐
         │                  │ INCIDENT_GROUPS │
         │                  │  tenantId: FK   │
         │                  └─────────────────┘
         │
         ▼
┌─────────────────┐
│   AUDIT_LOGS    │
│  tenantId: FK?  │
│  actorId: FK?   │
└─────────────────┘
```

### 4.2 Cascade Delete Behavior

When a tenant is deleted:

| Table | Behavior |
|-------|----------|
| users | Delete all tenant users |
| incidents | Delete all tenant incidents |
| incidentGroups | Delete all tenant groups |
| weatherAlerts | Delete all tenant alerts |
| auditLogs | Delete all tenant logs |

---

## 5. Index Strategy

### 5.1 Primary Access Patterns

| Query Pattern | Index |
|--------------|-------|
| Get tenant by slug | `tenants.by_slug` |
| List active incidents for tenant | `incidents.by_tenant_status` |
| Get incident by PulsePoint ID | `incidents.by_tenant_pulsepoint` |
| Get user by email | `users.by_email` |
| List users for tenant | `users.by_tenant` |
| List weather alerts for tenant | `weatherAlerts.by_tenant_status` |
| Get alert by NWS ID | `weatherAlerts.by_tenant_nws` |

### 5.2 Convex Index Usage

```typescript
// Example: Query active incidents for a tenant
const incidents = await ctx.db
  .query("incidents")
  .withIndex("by_tenant_status", (q) =>
    q.eq("tenantId", tenantId).eq("status", "active")
  )
  .order("desc")
  .take(50);

// Example: Find incident by PulsePoint ID
const existing = await ctx.db
  .query("incidents")
  .withIndex("by_tenant_pulsepoint", (q) =>
    q.eq("tenantId", tenantId).eq("pulsePointId", externalId)
  )
  .unique();
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial schema (PocketBase) |
| 2.0.0 | January 2026 | Rewritten for Convex schema format |

---

*This document defines the data model for the Vanguard multi-tenant platform. See `convex/schema.ts` for the authoritative schema definition.*
