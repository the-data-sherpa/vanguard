# Multi-Tenancy Architecture

> Vanguard Platform - Tenant-Isolated Emergency Incident Management SaaS
>
> Version: 2.0.0
> Last Updated: January 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Tenant Isolation Strategy](#3-tenant-isolation-strategy)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Data Model](#5-data-model)
6. [Real-Time Subscriptions](#6-real-time-subscriptions)
7. [External Integrations](#7-external-integrations)
8. [Security Architecture](#8-security-architecture)

---

## 1. Executive Summary

### 1.1 Purpose

Vanguard is a multi-tenant SaaS platform enabling counties, municipalities, and emergency services organizations to deploy their own isolated emergency incident tracking system.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tenancy Model** | Shared database with tenant isolation | Cost-effective, simpler operations, sufficient isolation |
| **Backend** | Convex (real-time BaaS) | Built-in real-time subscriptions, managed database, serverless |
| **Frontend** | Next.js App Router | SSR/SSG capabilities, excellent DX, React ecosystem |
| **Authentication** | Convex Auth | Built-in auth framework, role-based access |
| **Isolation Level** | Logical (row-level) | All tenant data tagged with `tenantId`, enforced at query layer |

### 1.3 Core Principles

1. **Tenant Isolation** - No tenant can access another tenant's data
2. **Defense in Depth** - Multiple layers of security validation
3. **Real-Time First** - Automatic subscriptions for live data updates
4. **Operational Simplicity** - Single deployment serves all tenants
5. **Serverless Scale** - Convex handles scaling automatically

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL EDGE                                     │
│                         (Next.js App Router)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS APPLICATION                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  App Router │  │ /tenant/    │  │  Server     │  │  Client             │ │
│  │  Layout     │  │ [slug]/*    │  │  Components │  │  Components         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CONVEX CLOUD                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │   Queries     │  │   Mutations   │  │   Actions     │                   │
│  │  (Real-time)  │  │  (Transact)   │  │  (External)   │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │   Database    │  │   Cron Jobs   │  │   File       │                   │
│  │   (Managed)   │  │  (Scheduler)  │  │   Storage    │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│    PULSEPOINT       │  │      NWS API        │  │    FUTURE: SOCIAL       │
│    (Incidents)      │  │    (Weather)        │  │    (Facebook, etc.)     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────────┘
```

### 2.2 Request Flow

```
1. Request arrives: GET /tenant/iredell/incidents
                            │
                            ▼
2. Next.js extracts slug "iredell" from URL
                            │
                            ▼
3. Server component queries Convex: getTenantBySlug("iredell")
                            │
                            ▼
4. Tenant found? ─────────► NO ──► Return 404 "Tenant not found"
        │
        ▼ YES
5. Tenant status check ───► SUSPENDED ──► Return 403 "Tenant suspended"
        │
        ▼ ACTIVE
6. Query incidents with tenant context:
   ctx.db.query("incidents")
     .withIndex("by_tenant_status", q => q.eq("tenantId", tenant._id))
                            │
                            ▼
7. Real-time subscription established, UI renders
```

---

## 3. Tenant Isolation Strategy

### 3.1 Isolation Model

| Model | Description | Our Choice |
|-------|-------------|------------|
| **Separate Databases** | Each tenant gets own DB | No |
| **Separate Schemas** | Shared DB, separate schemas | No |
| **Shared Schema (Row-Level)** | Shared tables, `tenantId` column | **Yes** |

### 3.2 Row-Level Isolation Implementation

Every tenant-scoped table includes a `tenantId` field:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  incidents: defineTable({
    tenantId: v.id("tenants"),
    pulsePointId: v.optional(v.string()),
    callType: v.string(),
    fullAddress: v.string(),
    status: v.union(v.literal("active"), v.literal("closed")),
    // ... other fields
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"]),
});
```

### 3.3 Query Enforcement

**All queries must scope by tenantId:**

```typescript
// convex/incidents.ts
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "active")
      )
      .order("desc")
      .collect();
  },
});
```

### 3.4 Mutation Enforcement

**All mutations must verify tenant context:**

```typescript
// convex/tenants.ts
export const updatePulsepointConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    agencyId: v.string(),
  },
  handler: async (ctx, args) => {
    // Server-side authorization check
    await requireTenantAccess(ctx, args.tenantId, "admin");

    await ctx.db.patch(args.tenantId, {
      pulsepointAgencyId: args.agencyId,
    });
  },
});
```

---

## 4. Authentication & Authorization

### 4.1 Role Hierarchy

```
PLATFORM LEVEL                    TENANT LEVEL
─────────────                     ────────────

platform_admin ──────────────► Can access ALL tenants
                               Can manage platform config

                               owner ◄─── Highest tenant authority
                                 │
                                 ▼
                               admin ◄─── Manages tenant settings
                                 │
                                 ▼
                               moderator ◄─ Content moderation
                                 │
                                 ▼
                               member ◄─── Basic access
```

### 4.2 Authorization Helper

```typescript
// convex/tenants.ts
async function requireTenantAccess(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  requiredRole: "member" | "moderator" | "admin" | "owner" = "admin"
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  // Platform admins bypass tenant checks
  if (user.role === "platform_admin") {
    return { userId: user._id, tenantRole: "platform_admin" };
  }

  // Verify tenant membership
  if (user.tenantId?.toString() !== tenantId.toString()) {
    throw new Error("Access denied: not a member of this tenant");
  }

  // Check role hierarchy
  const roleHierarchy = ["member", "moderator", "admin", "owner"];
  const userRoleIndex = roleHierarchy.indexOf(user.tenantRole || "member");
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  if (userRoleIndex < requiredRoleIndex) {
    throw new Error(`Access denied: requires ${requiredRole} role`);
  }

  return { userId: user._id, tenantRole: user.tenantRole || "member" };
}
```

### 4.3 Permission Matrix

| Action | Member | Moderator | Admin | Owner | Platform Admin |
|--------|--------|-----------|-------|-------|----------------|
| View incidents | ✅ | ✅ | ✅ | ✅ | ✅ |
| View weather | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit incident | ✅ | ✅ | ✅ | ✅ | ✅ |
| Moderate content | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ | ✅ |
| Tenant settings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete tenant | ❌ | ❌ | ❌ | ✅ | ✅ |
| Platform settings | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. Data Model

### 5.1 Core Tables

See `convex/schema.ts` for complete schema. Key tables:

| Table | Purpose |
|-------|---------|
| `tenants` | Tenant configuration, features, limits |
| `incidents` | Emergency incidents with status tracking |
| `incidentGroups` | Merged incident groupings |
| `weatherAlerts` | NWS weather alerts |
| `users` | User accounts with tenant roles |
| `auditLogs` | Compliance audit trail |

### 5.2 Tenant-Scoped Tables

All these tables include a `tenantId` field:
- `incidents`
- `incidentGroups`
- `weatherAlerts`
- `users`
- `auditLogs`

---

## 6. Real-Time Subscriptions

### 6.1 Automatic Real-Time

Convex provides automatic real-time subscriptions:

```typescript
// React component
const incidents = useQuery(api.incidents.listActive, {
  tenantId: tenant._id
});

// Automatically updates when:
// - New incident synced from PulsePoint
// - Incident status changes
// - Incident is closed/archived
```

### 6.2 No Polling Required

- Dashboard stats update instantly
- Incident lists refresh automatically
- Weather alerts appear as soon as synced
- All clients see consistent data

---

## 7. External Integrations

### 7.1 PulsePoint Sync

```typescript
// convex/sync.ts
export const syncPulsePoint = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.runQuery(api.tenants.getById, {
      id: args.tenantId
    });

    if (!tenant?.pulsepointAgencyId) return;

    // Fetch from PulsePoint API
    const incidents = await fetchPulsePointIncidents(tenant.pulsepointAgencyId);

    // Upsert incidents
    for (const incident of incidents) {
      await ctx.runMutation(api.incidents.upsertFromPulsePoint, {
        tenantId: args.tenantId,
        data: incident,
      });
    }
  },
});
```

### 7.2 Weather Sync

```typescript
// convex/sync.ts
export const syncWeather = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const tenant = await ctx.runQuery(api.tenants.getById, {
      id: args.tenantId
    });

    if (!tenant?.weatherZones?.length) return;

    // Fetch from NWS API with safe URL construction
    const nwsUrl = new URL("https://api.weather.gov/alerts/active");
    nwsUrl.searchParams.set("zone", tenant.weatherZones.join(","));

    const response = await fetch(nwsUrl.toString(), {
      headers: { "User-Agent": "(vanguard, contact@vanguardalerts.com)" },
    });

    // Process and store alerts...
  },
});
```

### 7.3 Scheduled Jobs

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.interval(
  "sync-all-tenants",
  { minutes: 2 },
  api.scheduler.masterSync
);

crons.interval(
  "maintenance",
  { minutes: 15 },
  api.maintenance.closeStaleIncidents
);

export default crons;
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
Layer 1: Vercel Edge
├── DDoS protection
├── TLS termination
└── Geographic routing

Layer 2: Next.js Application
├── URL-based tenant extraction
├── Server component authorization
└── Client-side route protection

Layer 3: Convex Backend
├── Authentication via Convex Auth
├── Authorization helpers on mutations
├── Input validation
└── Audit logging

Layer 4: Data Layer
├── Row-level tenant isolation
├── Index-based query scoping
└── Cascade deletes for tenant data
```

### 8.2 Input Validation

```typescript
// NWS Zone validation
const NWS_ZONE_PATTERN = /^[A-Z]{2}[CZ]\d{3}$/;

function isValidNWSZone(zone: string): boolean {
  return NWS_ZONE_PATTERN.test(zone);
}

export const updateWeatherZones = mutation({
  args: {
    tenantId: v.id("tenants"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId, "admin");

    const invalidZones = args.zones.filter((z) => !isValidNWSZone(z));
    if (invalidZones.length > 0) {
      throw new Error(`Invalid NWS zone format: ${invalidZones.join(", ")}`);
    }

    await ctx.db.patch(args.tenantId, { weatherZones: args.zones });
  },
});
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial version (PocketBase) |
| 2.0.0 | January 2026 | Rewritten for Convex architecture |

---

*This document serves as the authoritative reference for the Vanguard multi-tenancy architecture.*
