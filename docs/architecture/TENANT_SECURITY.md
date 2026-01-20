# Tenant Security Architecture

> Security measures for tenant isolation and data protection
>
> Version: 2.0.0
> Last Updated: January 2026

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Tenant Isolation](#2-tenant-isolation)
3. [Authentication Security](#3-authentication-security)
4. [Authorization & Access Control](#4-authorization--access-control)
5. [Input Validation](#5-input-validation)
6. [Audit & Compliance](#6-audit--compliance)
7. [Security Checklist](#7-security-checklist)

---

## 1. Security Principles

### 1.1 Core Security Tenets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DEFENSE IN DEPTH                                                         │
│     Multiple layers of security controls                                     │
│     No single point of failure                                               │
│                                                                              │
│  2. LEAST PRIVILEGE                                                          │
│     Minimum necessary permissions                                            │
│     Role-based access control                                                │
│                                                                              │
│  3. FAIL SECURE                                                              │
│     Deny access on error                                                     │
│     Log security failures                                                    │
│                                                                              │
│  4. TENANT ISOLATION                                                         │
│     All queries scoped by tenantId                                           │
│     Server-side enforcement on mutations                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Cross-tenant data access | Critical | Row-level isolation, query enforcement |
| Authentication bypass | Critical | Convex Auth, server-side validation |
| Privilege escalation | High | Role validation, permission checks |
| Injection attacks | High | Input validation, Convex type safety |
| External API abuse | Medium | Rate limiting, input sanitization |

---

## 2. Tenant Isolation

### 2.1 Isolation Layers

```
Layer 1: URL/Route Level
┌─────────────────────────────────────────────────────────────────────────────┐
│  Request: GET /tenant/iredell/incidents                                      │
│                    └─────────────────┘                                       │
│                    Tenant slug extracted from URL                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 2: Server Component Validation
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Validate tenant exists via Convex query                                   │
│  - Check tenant status (active, not suspended)                               │
│  - Pass tenantId to child components                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 3: Convex Query/Mutation Enforcement
┌─────────────────────────────────────────────────────────────────────────────┐
│  - All queries filter by tenantId via index                                  │
│  - Mutations verify tenant access before modifying                           │
│  - Authorization helpers enforce role requirements                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 4: Database Index Scoping
┌─────────────────────────────────────────────────────────────────────────────┐
│  ctx.db.query("incidents")                                                   │
│    .withIndex("by_tenant_status", q => q.eq("tenantId", tenantId))          │
│                                            └─────┘                          │
│                                            Always required                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Query Enforcement

All Convex queries must scope by tenantId:

```typescript
// convex/incidents.ts
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    // ALWAYS use index with tenantId
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", args.tenantId).eq("status", "active")
      )
      .collect();
  },
});
```

### 2.3 Mutation Enforcement

All mutations verify tenant access:

```typescript
// convex/tenants.ts
export const updatePulsepointConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    agencyId: v.string(),
  },
  handler: async (ctx, args) => {
    // Server-side authorization - REQUIRED
    await requireTenantAccess(ctx, args.tenantId, "admin");

    await ctx.db.patch(args.tenantId, {
      pulsepointAgencyId: args.agencyId,
    });
  },
});
```

---

## 3. Authentication Security

### 3.1 Clerk + Convex Auth

Authentication is handled by Clerk with Convex integration:

```typescript
// Authentication flow
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Authentication required");
}

// User lookup by email (synced via Clerk webhooks)
const user = await ctx.db
  .query("users")
  .withIndex("by_email", (q) => q.eq("email", identity.email))
  .unique();
```

### 3.2 User Sync via Webhooks

Clerk webhooks sync user data to Convex:

- `user.created` - Creates user record with clerkId
- `user.updated` - Updates name, email, avatar
- `user.deleted` - Soft deletes user (deactivates)

### 3.3 Session Management

- Sessions managed by Clerk
- JWT tokens validated by Convex
- Automatic token refresh via Clerk SDK

### 3.4 Route Protection

- Next.js middleware protects `/tenant/*` routes
- Public routes: `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/security`
- Client-side `AuthGuard` component for role-based UI

---

## 4. Authorization & Access Control

### 4.1 Role Hierarchy

```
PLATFORM LEVEL                    TENANT LEVEL
─────────────                     ────────────

platform_admin ──────────────► Platform management only
                               NO automatic tenant access
                               Must be invited like any user

                               owner ◄─── Full tenant control
                                 │
                                 ▼
                               admin ◄─── Tenant settings, user management
                                 │
                                 ▼
                               moderator ◄─ Content moderation
                                 │
                                 ▼
                               member ◄─── Basic access
```

**Important:** Platform admins do NOT have automatic access to tenant data. They must be explicitly invited to each tenant by an owner. This ensures tenant data privacy even from platform operators.

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
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  // Verify tenant membership
  // Note: Platform admins do NOT have automatic tenant access
  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  // Check role hierarchy
  const roleHierarchy = { member: 1, moderator: 2, admin: 3, owner: 4 };
  const userRoleLevel = roleHierarchy[user.tenantRole || "member"] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: requires ${requiredRole} role or higher`);
  }

  return { userId: user._id, tenantRole: user.tenantRole || "member" };
}
```

### 4.3 Permission Matrix

| Action | Member | Moderator | Admin | Owner |
|--------|--------|-----------|-------|-------|
| View incidents | Yes | Yes | Yes | Yes |
| View weather | Yes | Yes | Yes | Yes |
| Update PulsePoint config | No | No | Yes | Yes |
| Update weather zones | No | No | Yes | Yes |
| Update unit legend | No | No | Yes | Yes |
| Invite users | No | No | Yes | Yes |
| Change user roles | No | No | Yes* | Yes |
| Remove users | No | No | Yes* | Yes |
| Ban/unban users | No | No | Yes* | Yes |
| Delete tenant | No | No | No | Yes |

*Admins can manage members and moderators only; cannot modify other admins.

---

## 5. Input Validation

### 5.1 Convex Type Safety

Convex validators provide type-safe input validation:

```typescript
export const updateWeatherZones = mutation({
  args: {
    tenantId: v.id("tenants"),         // Must be valid tenant ID
    zones: v.array(v.string()),         // Must be array of strings
  },
  handler: async (ctx, args) => {
    // Args are type-safe at this point
  },
});
```

### 5.2 Business Logic Validation

Additional validation for external identifiers:

```typescript
// NWS Zone format validation
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

    // Validate zone format
    const invalidZones = args.zones.filter((z) => !isValidNWSZone(z));
    if (invalidZones.length > 0) {
      throw new Error(
        `Invalid NWS zone format: ${invalidZones.join(", ")}. ` +
        `Expected format: [STATE][C/Z][NUMBER] (e.g., NCZ036)`
      );
    }

    await ctx.db.patch(args.tenantId, { weatherZones: args.zones });
  },
});
```

### 5.3 Safe URL Construction

External API URLs use URL constructor:

```typescript
// Safe URL construction for NWS API
const nwsUrl = new URL("https://api.weather.gov/alerts/active");
nwsUrl.searchParams.set("zone", zones.join(","));

const response = await fetch(nwsUrl.toString(), {
  headers: {
    "User-Agent": "(vanguard, contact@vanguardalerts.com)",
  },
});
```

---

## 6. Audit & Compliance

### 6.1 Audit Logging

Security-relevant actions are logged:

```typescript
// convex/auditLogs.ts
export const log = mutation({
  args: {
    tenantId: v.optional(v.id("tenants")),
    actorId: v.optional(v.id("users")),
    actorType: v.union(v.literal("user"), v.literal("system"), v.literal("api")),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

### 6.2 Actions to Log

| Action | Actor Type | Details |
|--------|------------|---------|
| `tenant:config:updated` | user | Fields changed |
| `incident:synced` | system | Count, source |
| `weather:synced` | system | Zone, alert count |
| `auth:failed` | user | Reason |
| `access:denied` | user | Resource, required role |

---

## 7. Security Checklist

### 7.1 Pre-Deployment Checklist

```
## Authentication
- [x] Clerk auth provider configured
- [x] Login/signup pages implemented
- [x] Session management via Clerk
- [x] Webhook sync for user data

## Authorization
- [x] All mutations use requireTenantAccess()
- [x] Role hierarchy enforced (member → moderator → admin → owner)
- [x] Platform admins require explicit tenant access
- [x] Permission checks on all admin operations

## Tenant Isolation
- [x] All queries use tenantId index
- [x] No cross-tenant data access possible
- [x] Tenant slug validation in routes
- [x] Middleware protects /tenant/* routes

## Input Validation
- [x] Convex validators on all mutations
- [x] External ID format validation (NWS zones)
- [x] Safe URL construction for external APIs

## Audit
- [ ] Audit logging for sensitive operations
- [ ] Security events logged
- [ ] Log retention policy defined
```

### 7.2 Security Review Points

| Area | Review Point |
|------|-------------|
| Queries | All queries filter by tenantId |
| Mutations | All mutations check authorization |
| External APIs | URL construction is safe |
| Input | All external identifiers validated |
| Errors | No sensitive data in error messages |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial security architecture (PocketBase) |
| 2.0.0 | January 2026 | Rewritten for Convex architecture |
| 2.1.0 | January 2026 | Clerk auth implementation, platform_admin tenant isolation |

---

*This document defines the security architecture for the Vanguard multi-tenant platform.*
