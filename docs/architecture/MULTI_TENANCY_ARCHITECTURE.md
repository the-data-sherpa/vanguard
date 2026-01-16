# Multi-Tenancy Architecture Plan

> **Vanguard Platform** - Tenant-Isolated Emergency Incident Management SaaS
>
> Version: 1.0.0
> Last Updated: January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Tenant Isolation Strategy](#3-tenant-isolation-strategy)
4. [Data Model](#4-data-model)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Tenant Lifecycle Management](#6-tenant-lifecycle-management)
7. [API Architecture](#7-api-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Scalability & Performance](#9-scalability--performance)
10. [Integration Architecture](#10-integration-architecture)
11. [Billing & Monetization](#11-billing--monetization)
12. [White-Labeling & Customization](#12-white-labeling--customization)
13. [Monitoring & Observability](#13-monitoring--observability)
14. [Disaster Recovery](#14-disaster-recovery)
15. [Migration Strategy from ICAW](#15-migration-strategy-from-icaw)

---

## 1. Executive Summary

### 1.1 Purpose

Vanguard transforms the single-tenant ICAW (Iredell Calls & Weather Alerts) platform into a multi-tenant SaaS solution, enabling any county, municipality, or emergency services organization to deploy their own isolated instance of the emergency incident management platform.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tenancy Model** | Shared database with tenant isolation | Cost-effective, simpler operations, sufficient isolation for this use case |
| **Database** | PocketBase (SQLite-based) | Self-hostable, real-time subscriptions, built-in auth, low operational overhead |
| **Frontend** | Next.js App Router | SSR/SSG capabilities, excellent DX, React ecosystem |
| **Authentication** | NextAuth + PocketBase adapter | Flexible providers, session management, tenant-aware |
| **Isolation Level** | Logical (row-level) | All tenant data tagged with `tenantId`, enforced at query layer |

### 1.3 Core Principles

1. **Tenant Isolation** - No tenant can access another tenant's data under any circumstance
2. **Defense in Depth** - Multiple layers of security validation
3. **Graceful Degradation** - One tenant's issues must not affect others
4. **Operational Simplicity** - Single deployment serves all tenants
5. **Horizontal Scalability** - Architecture supports adding capacity as needed

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER                                   │
│                         (Vercel Edge / Cloudflare)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS APPLICATION                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Middleware │  │  App Router │  │  API Routes │  │  Server Components  │ │
│  │  (Tenant    │  │  /tenant/   │  │  /api/*     │  │  (Data Fetching)    │ │
│  │   Extract)  │  │  [slug]/*   │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│    POCKETBASE       │  │   EXTERNAL APIS     │  │      REDIS CACHE        │
│  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────────┐  │
│  │ system_config │  │  │  │  PulsePoint   │  │  │  │ Rate Limit State  │  │
│  │ tenants       │  │  │  │  (per tenant) │  │  │  │ Session Cache     │  │
│  │ users         │  │  │  ├───────────────┤  │  │  │ Query Cache       │  │
│  │ incidents     │  │  │  │  Facebook     │  │  │  └───────────────────┘  │
│  │ social_accts  │  │  │  │  (per tenant) │  │  └─────────────────────────┘
│  │ audit_logs    │  │  │  ├───────────────┤  │
│  │ rate_counters │  │  │  │  Weather API  │  │
│  └───────────────┘  │  │  │  (NWS)        │  │
└─────────────────────┘  │  └───────────────┘  │
                         └─────────────────────┘
```

### 2.2 Request Flow

```
1. Request arrives: GET /tenant/iredell/incidents
                            │
                            ▼
2. Middleware extracts slug "iredell" from URL
                            │
                            ▼
3. Middleware queries PocketBase: SELECT * FROM tenants WHERE slug = 'iredell'
                            │
                            ▼
4. Tenant found? ─────────► NO ──► Return 404 "Tenant not found"
        │
        ▼ YES
5. Tenant status check ───► DEACTIVATED ──► Return 403 "Tenant suspended"
        │
        ▼ ACTIVE
6. Inject tenant context into request headers:
   - x-tenant-id: <tenant_record_id>
   - x-tenant-slug: iredell
   - x-tenant-features: {"facebook": true, "weather": true}
                            │
                            ▼
7. Route handler receives request with tenant context
                            │
                            ▼
8. All database queries include: WHERE tenantId = <tenant_record_id>
                            │
                            ▼
9. Response returned to client
```

### 2.3 Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ENVIRONMENT                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Vercel     │    │   Vercel     │    │   Vercel     │          │
│  │  (Region A)  │    │  (Region B)  │    │  (Region C)  │          │
│  │              │    │              │    │              │          │
│  │  Next.js     │    │  Next.js     │    │  Next.js     │          │
│  │  Instances   │    │  Instances   │    │  Instances   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    POCKETBASE CLUSTER                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │   │
│  │  │  Primary   │  │  Replica   │  │  Replica   │              │   │
│  │  │  (Write)   │──│  (Read)    │──│  (Read)    │              │   │
│  │  └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      REDIS CLUSTER                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │   │
│  │  │   Master   │──│  Replica   │──│  Replica   │              │   │
│  │  └────────────┘  └────────────┘  └────────────┘              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tenant Isolation Strategy

### 3.1 Isolation Model Selection

| Model | Description | Pros | Cons | Our Choice |
|-------|-------------|------|------|------------|
| **Separate Databases** | Each tenant gets own DB | Strongest isolation | Expensive, complex ops | No |
| **Separate Schemas** | Shared DB, separate schemas | Good isolation | Schema migration complexity | No |
| **Shared Schema (Row-Level)** | Shared tables, `tenantId` column | Cost-effective, simple | Requires careful query design | **Yes** |

### 3.2 Row-Level Isolation Implementation

Every tenant-scoped table includes a `tenantId` foreign key:

```typescript
// Example: incidents table
{
  "id": "incidents",
  "schema": [
    { "name": "tenantId", "type": "relation", "required": true,
      "collectionId": "tenants", "onDelete": "cascade" },
    { "name": "pulsePointId", "type": "text", "required": false },
    { "name": "callType", "type": "text", "required": true },
    { "name": "fullAddress", "type": "text", "required": true },
    // ... other fields
  ],
  "indexes": [
    { "type": "index", "fields": ["tenantId"] },
    { "type": "index", "fields": ["tenantId", "status"] },
    { "type": "index", "fields": ["tenantId", "callReceivedTime"] }
  ]
}
```

### 3.3 Query Enforcement Layers

**Layer 1: Middleware Injection**
```typescript
// app/middleware.ts
export async function middleware(request: NextRequest) {
  const slug = extractTenantSlug(request.url);
  const tenant = await getTenantBySlug(slug);

  if (!tenant) return new Response('Tenant not found', { status: 404 });
  if (tenant.status !== 'active') return new Response('Tenant suspended', { status: 403 });

  // Inject tenant context
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenant.id);
  headers.set('x-tenant-slug', tenant.slug);
  headers.set('x-tenant-features', JSON.stringify(tenant.features || {}));

  return NextResponse.next({ request: { headers } });
}
```

**Layer 2: Service Layer Enforcement**
```typescript
// services/incidents.ts
export class IncidentService {
  constructor(private tenantId: string) {
    if (!tenantId) throw new Error('tenantId is required');
  }

  async getIncidents(filters: IncidentFilters = {}) {
    // tenantId is ALWAYS included - never optional
    return pb.collection('incidents').getList(1, 50, {
      filter: `tenantId = "${this.tenantId}" && status = "active"`,
      sort: '-callReceivedTime'
    });
  }

  async createIncident(data: CreateIncidentInput) {
    return pb.collection('incidents').create({
      ...data,
      tenantId: this.tenantId, // Enforced at service layer
    });
  }
}
```

**Layer 3: Database-Level Rules (PocketBase)**
```javascript
// PocketBase collection rules (API rules)
{
  "listRule": "@request.auth.id != '' && tenantId = @request.auth.tenantId",
  "viewRule": "@request.auth.id != '' && tenantId = @request.auth.tenantId",
  "createRule": "@request.auth.id != '' && tenantId = @request.auth.tenantId",
  "updateRule": "@request.auth.id != '' && tenantId = @request.auth.tenantId",
  "deleteRule": "@request.auth.id != '' && tenantId = @request.auth.tenantId"
}
```

### 3.4 Cross-Tenant Access Prevention

```typescript
// Utility to create tenant-scoped services
export function createTenantContext(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');
  const tenantSlug = request.headers.get('x-tenant-slug');
  const features = JSON.parse(request.headers.get('x-tenant-features') || '{}');

  if (!tenantId) {
    throw new UnauthorizedError('No tenant context');
  }

  return {
    tenantId,
    tenantSlug,
    features,
    services: {
      incidents: new IncidentService(tenantId),
      posts: new PostService(tenantId),
      users: new UserService(tenantId),
      media: new MediaService(tenantId),
    }
  };
}
```

---

## 4. Data Model

### 4.1 Complete Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLATFORM-LEVEL TABLES                              │
│                        (No tenantId - global scope)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  system_config          │  Global platform configuration                     │
│  tenants                │  Tenant registry                                   │
│  platform_audit_logs    │  Platform-level audit trail                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           TENANT-SCOPED TABLES                               │
│                        (All have tenantId foreign key)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  users                  │  Tenant users (linked to tenant)                   │
│  incidents              │  Emergency incidents                               │
│  incident_updates       │  User-submitted incident updates                   │
│  posts                  │  Community posts                                   │
│  media                  │  Photo/video uploads                               │
│  forum_threads          │  Discussion threads                                │
│  forum_messages         │  Forum replies                                     │
│  weather_alerts         │  NWS weather alerts                                │
│  social_accounts        │  OAuth tokens for social media                     │
│  moderation_queue       │  Content moderation items                          │
│  rate_counters          │  Per-tenant rate limiting                          │
│  tenant_audit_logs      │  Tenant-specific audit trail                       │
│  tenant_config          │  Per-tenant configuration overrides                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Core Tables Schema

#### 4.2.1 Tenants Table (Platform-Level)

```json
{
  "id": "tenants",
  "name": "Tenants",
  "type": "base",
  "schema": [
    { "name": "slug", "type": "text", "required": true, "unique": true,
      "options": { "min": 3, "max": 50, "pattern": "^[a-z0-9-]+$" }},
    { "name": "name", "type": "text", "required": true },
    { "name": "displayName", "type": "text", "required": false },
    { "name": "description", "type": "text", "required": false },
    { "name": "logoUrl", "type": "url", "required": false },
    { "name": "faviconUrl", "type": "url", "required": false },
    { "name": "primaryColor", "type": "text", "required": false },
    { "name": "customDomain", "type": "text", "required": false },
    { "name": "status", "type": "select", "required": true,
      "options": { "values": ["pending", "active", "suspended", "deactivated", "pending_deletion"] }},
    { "name": "tier", "type": "select", "required": true,
      "options": { "values": ["free", "starter", "professional", "enterprise"] }},
    { "name": "pulsepointAgencyId", "type": "text", "required": false },
    { "name": "pulsepointConfig", "type": "json", "required": false },
    { "name": "weatherZones", "type": "json", "required": false },
    { "name": "features", "type": "json", "required": false },
    { "name": "limits", "type": "json", "required": false },
    { "name": "billingCustomerId", "type": "text", "required": false },
    { "name": "billingSubscriptionId", "type": "text", "required": false },
    { "name": "trialEndsAt", "type": "datetime", "required": false },
    { "name": "deactivatedAt", "type": "datetime", "required": false },
    { "name": "deactivatedReason", "type": "text", "required": false },
    { "name": "deletionScheduledAt", "type": "datetime", "required": false },
    { "name": "createdAt", "type": "datetime", "required": true, "options": { "autogenerate": true }},
    { "name": "updatedAt", "type": "datetime", "required": true, "options": { "autogenerate": true }}
  ],
  "indexes": [
    { "type": "unique", "fields": ["slug"] },
    { "type": "unique", "fields": ["customDomain"] },
    { "type": "index", "fields": ["status"] },
    { "type": "index", "fields": ["tier"] },
    { "type": "index", "fields": ["deactivatedAt"] },
    { "type": "index", "fields": ["deletionScheduledAt"] }
  ]
}
```

#### 4.2.2 Users Table (Tenant-Scoped)

```json
{
  "id": "users",
  "name": "Users",
  "type": "auth",
  "schema": [
    { "name": "tenantId", "type": "relation", "required": false,
      "collectionId": "tenants", "onDelete": "set null" },
    { "name": "email", "type": "email", "required": true },
    { "name": "name", "type": "text", "required": false },
    { "name": "username", "type": "text", "required": false },
    { "name": "avatarUrl", "type": "url", "required": false },
    { "name": "bio", "type": "text", "required": false },
    { "name": "role", "type": "select", "required": true,
      "options": { "values": ["user", "contributor", "moderator", "tenant_admin", "platform_admin"] }},
    { "name": "tenantRole", "type": "select", "required": false,
      "options": { "values": ["member", "moderator", "admin", "owner"] }},
    { "name": "subscriptionTier", "type": "select", "required": false,
      "options": { "values": ["free", "supporter", "patron"] }},
    { "name": "isActive", "type": "bool", "required": true },
    { "name": "isBanned", "type": "bool", "required": true },
    { "name": "bannedAt", "type": "datetime", "required": false },
    { "name": "bannedReason", "type": "text", "required": false },
    { "name": "lastLoginAt", "type": "datetime", "required": false },
    { "name": "emailVerified", "type": "bool", "required": true },
    { "name": "preferences", "type": "json", "required": false }
  ],
  "indexes": [
    { "type": "unique", "fields": ["email"] },
    { "type": "index", "fields": ["tenantId"] },
    { "type": "index", "fields": ["tenantId", "role"] },
    { "type": "index", "fields": ["tenantId", "tenantRole"] },
    { "type": "index", "fields": ["role"] }
  ]
}
```

#### 4.2.3 Incidents Table (Tenant-Scoped)

```json
{
  "id": "incidents",
  "name": "Incidents",
  "type": "base",
  "schema": [
    { "name": "tenantId", "type": "relation", "required": true,
      "collectionId": "tenants", "onDelete": "cascade" },
    { "name": "source", "type": "select", "required": true,
      "options": { "values": ["pulsepoint", "user_submitted", "merged", "manual"] }},
    { "name": "externalId", "type": "text", "required": false },
    { "name": "callType", "type": "text", "required": true },
    { "name": "callTypeCategory", "type": "select", "required": false,
      "options": { "values": ["fire", "medical", "rescue", "traffic", "hazmat", "other"] }},
    { "name": "fullAddress", "type": "text", "required": true },
    { "name": "normalizedAddress", "type": "text", "required": false },
    { "name": "latitude", "type": "number", "required": false },
    { "name": "longitude", "type": "number", "required": false },
    { "name": "units", "type": "json", "required": false },
    { "name": "unitStatuses", "type": "json", "required": false },
    { "name": "description", "type": "text", "required": false },
    { "name": "status", "type": "select", "required": true,
      "options": { "values": ["active", "closed", "archived"] }},
    { "name": "callReceivedTime", "type": "datetime", "required": true },
    { "name": "callClosedTime", "type": "datetime", "required": false },
    { "name": "submittedBy", "type": "relation", "required": false,
      "collectionId": "users", "onDelete": "set null" },
    { "name": "moderationStatus", "type": "select", "required": false,
      "options": { "values": ["auto_approved", "pending", "approved", "rejected"] }},
    { "name": "moderatedBy", "type": "relation", "required": false,
      "collectionId": "users", "onDelete": "set null" },
    { "name": "moderatedAt", "type": "datetime", "required": false },
    { "name": "rejectionReason", "type": "text", "required": false },
    { "name": "isSyncedToFacebook", "type": "bool", "required": true },
    { "name": "facebookPostId", "type": "text", "required": false },
    { "name": "lastSyncAttempt", "type": "datetime", "required": false },
    { "name": "syncError", "type": "text", "required": false },
    { "name": "needsFacebookUpdate", "type": "bool", "required": false }
  ],
  "indexes": [
    { "type": "index", "fields": ["tenantId"] },
    { "type": "index", "fields": ["tenantId", "status"] },
    { "type": "index", "fields": ["tenantId", "callReceivedTime"] },
    { "type": "index", "fields": ["tenantId", "source"] },
    { "type": "index", "fields": ["tenantId", "moderationStatus"] },
    { "type": "index", "fields": ["tenantId", "isSyncedToFacebook"] },
    { "type": "unique", "fields": ["tenantId", "externalId"] }
  ]
}
```

### 4.3 Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │  system_config  │
                                    │  (singleton)    │
                                    └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANTS (Registry)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ id | slug      | name           | status  | tier         | features   │  │
│  │ 1  | iredell   | Iredell County | active  | professional | {...}      │  │
│  │ 2  | mecklenburg| Mecklenburg   | active  | enterprise   | {...}      │  │
│  │ 3  | cabarrus  | Cabarrus Co    | trial   | starter      | {...}      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     users       │      │   incidents     │      │ social_accounts │
│  tenantId: FK   │      │  tenantId: FK   │      │  tenantId: FK   │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ email           │      │ source          │      │ provider        │
│ role            │◄────►│ callType        │      │ accessToken     │
│ tenantRole      │      │ fullAddress     │      │ refreshToken    │
└────────┬────────┘      │ status          │      └─────────────────┘
         │               │ submittedBy: FK │
         │               └────────┬────────┘
         │                        │
         │               ┌────────┴────────┐
         │               ▼                 ▼
         │      ┌─────────────────┐ ┌─────────────────┐
         │      │incident_updates │ │     media       │
         │      │ tenantId: FK    │ │  tenantId: FK   │
         │      │ incidentId: FK  │ │  incidentId: FK │
         │      │ submittedBy: FK │ │  uploadedBy: FK │
         │      └─────────────────┘ └─────────────────┘
         │
         │               ┌─────────────────┐
         └──────────────►│  forum_threads  │
                         │  tenantId: FK   │
                         │  authorId: FK   │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ forum_messages  │
                         │  tenantId: FK   │
                         │  threadId: FK   │
                         │  authorId: FK   │
                         └─────────────────┘
```

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                │
└────────────────────────────────────────────────────────────────────────────┘

  User visits /tenant/iredell/login
              │
              ▼
  ┌───────────────────────┐
  │  Choose Auth Method   │
  │  - Email Magic Link   │
  │  - Google OAuth       │
  │  - Facebook OAuth     │
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐
  │   NextAuth Handler    │
  │   Validates & Creates │
  │   Session             │
  └───────────┬───────────┘
              │
              ▼
  ┌───────────────────────┐     ┌───────────────────────┐
  │  User exists in DB?   │─NO─►│  Create user record   │
  │  For this tenant?     │     │  Link to tenantId     │
  └───────────┬───────────┘     └───────────┬───────────┘
              │ YES                         │
              ▼                             ▼
  ┌───────────────────────────────────────────────────────┐
  │           JWT Session Created                          │
  │  {                                                     │
  │    userId: "user_abc123",                              │
  │    email: "user@example.com",                          │
  │    tenantId: "tenant_iredell",                         │
  │    tenantSlug: "iredell",                              │
  │    role: "user",                                       │
  │    tenantRole: "member",                               │
  │    features: { facebook: true, weather: true }         │
  │  }                                                     │
  └───────────────────────────────────────────────────────┘
```

### 5.2 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROLE HIERARCHY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PLATFORM LEVEL                    TENANT LEVEL                              │
│  ─────────────                     ────────────                              │
│                                                                              │
│  platform_admin ────────────────► Can access ALL tenants                     │
│       │                            Can manage platform config                │
│       │                            Can create/delete tenants                 │
│       ▼                                                                      │
│  (No other platform roles)                                                   │
│                                                                              │
│                                    tenant_admin (owner) ◄─── Highest tenant  │
│                                         │                     authority      │
│                                         ▼                                    │
│                                    tenant_admin ◄─────────── Manages tenant  │
│                                         │                     settings       │
│                                         ▼                                    │
│                                    moderator ◄────────────── Content         │
│                                         │                     moderation     │
│                                         ▼                                    │
│                                    contributor ◄──────────── Post without    │
│                                         │                     moderation     │
│                                         ▼                                    │
│                                    user ◄─────────────────── Basic access    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Permission Matrix

| Action | User | Contributor | Moderator | Tenant Admin | Platform Admin |
|--------|------|-------------|-----------|--------------|----------------|
| View incidents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit incident | ✅ (moderated) | ✅ | ✅ | ✅ | ✅ |
| Submit update | ✅ (moderated) | ✅ | ✅ | ✅ | ✅ |
| Moderate content | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Tenant settings | ❌ | ❌ | ❌ | ✅ | ✅ |
| Social connections | ❌ | ❌ | ❌ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| Billing management | ❌ | ❌ | ❌ | ✅ (owner only) | ✅ |
| Platform settings | ❌ | ❌ | ❌ | ❌ | ✅ |
| Create tenants | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete tenants | ❌ | ❌ | ❌ | ❌ | ✅ |

### 5.4 Authorization Implementation

```typescript
// lib/auth/permissions.ts

export const PERMISSIONS = {
  // Incident permissions
  'incidents:view': ['user', 'contributor', 'moderator', 'tenant_admin', 'platform_admin'],
  'incidents:create': ['user', 'contributor', 'moderator', 'tenant_admin', 'platform_admin'],
  'incidents:moderate': ['moderator', 'tenant_admin', 'platform_admin'],
  'incidents:delete': ['tenant_admin', 'platform_admin'],

  // User management
  'users:view': ['moderator', 'tenant_admin', 'platform_admin'],
  'users:manage': ['tenant_admin', 'platform_admin'],
  'users:ban': ['moderator', 'tenant_admin', 'platform_admin'],

  // Tenant settings
  'tenant:settings:view': ['tenant_admin', 'platform_admin'],
  'tenant:settings:edit': ['tenant_admin', 'platform_admin'],
  'tenant:social:manage': ['tenant_admin', 'platform_admin'],
  'tenant:billing:manage': ['tenant_admin', 'platform_admin'], // owner only enforced separately

  // Platform administration
  'platform:config': ['platform_admin'],
  'platform:tenants:manage': ['platform_admin'],
} as const;

export function hasPermission(
  userRole: string,
  tenantRole: string | null,
  permission: keyof typeof PERMISSIONS
): boolean {
  const allowedRoles = PERMISSIONS[permission];

  // Platform admin always has access
  if (userRole === 'platform_admin') return true;

  // Check tenant role
  if (tenantRole && allowedRoles.includes(tenantRole)) return true;

  // Check user role
  return allowedRoles.includes(userRole);
}

// Middleware helper
export function requirePermission(permission: keyof typeof PERMISSIONS) {
  return async (request: Request) => {
    const session = await getSession(request);
    if (!session) throw new UnauthorizedError('Not authenticated');

    if (!hasPermission(session.role, session.tenantRole, permission)) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }

    return session;
  };
}
```

---

## 6. Tenant Lifecycle Management

### 6.1 Lifecycle States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TENANT LIFECYCLE STATES                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────────┐
  │ PENDING  │────►│  ACTIVE  │────►│  SUSPENDED   │────►│   DEACTIVATED   │
  └──────────┘     └──────────┘     └──────────────┘     └─────────────────┘
       │                │                  │                      │
       │                │                  │                      │
       │           Can restore        Can restore          30-day grace
       │                │                  │                      │
       │                ▼                  ▼                      ▼
       │           ┌──────────┐     ┌──────────────┐     ┌─────────────────┐
       └──────────►│  ACTIVE  │◄────│   ACTIVE     │◄────│     ACTIVE      │
                   └──────────┘     └──────────────┘     └─────────────────┘
                                                                  │
                                                         After 30 days
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │PENDING_DELETION │
                                                         └────────┬────────┘
                                                                  │
                                                         Platform admin
                                                         confirms deletion
                                                                  │
                                                                  ▼
                                                         ┌─────────────────┐
                                                         │    DELETED      │
                                                         │  (hard delete)  │
                                                         └─────────────────┘
```

### 6.2 Lifecycle Operations

```typescript
// services/tenant.ts

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      throw new ValidationError('Slug must be lowercase alphanumeric with hyphens');
    }

    // Check slug uniqueness
    const existing = await this.getTenantBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Tenant slug already exists');
    }

    // Create tenant
    const tenant = await pb.collection('tenants').create({
      slug: input.slug,
      name: input.name,
      displayName: input.displayName || input.name,
      status: input.skipTrial ? 'active' : 'pending',
      tier: input.tier || 'free',
      features: this.getDefaultFeatures(input.tier || 'free'),
      limits: this.getDefaultLimits(input.tier || 'free'),
      trialEndsAt: input.skipTrial ? null : addDays(new Date(), 14),
    });

    // Create owner user if provided
    if (input.ownerEmail) {
      await this.createTenantOwner(tenant.id, input.ownerEmail);
    }

    // Audit log
    await audit.log('tenant:created', { tenantId: tenant.id, slug: input.slug });

    return tenant;
  }

  /**
   * Suspend a tenant (reversible)
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await pb.collection('tenants').update(tenantId, {
      status: 'suspended',
      deactivatedAt: new Date().toISOString(),
      deactivatedReason: reason,
    });

    await audit.log('tenant:suspended', { tenantId, reason });
  }

  /**
   * Deactivate a tenant (30-day grace period starts)
   */
  async deactivateTenant(tenantId: string, reason: string): Promise<void> {
    const deletionDate = addDays(new Date(), 30);

    await pb.collection('tenants').update(tenantId, {
      status: 'deactivated',
      deactivatedAt: new Date().toISOString(),
      deactivatedReason: reason,
      deletionScheduledAt: deletionDate.toISOString(),
    });

    // Notify tenant owner
    await this.notifyTenantDeactivation(tenantId, deletionDate);

    await audit.log('tenant:deactivated', { tenantId, reason, deletionScheduledAt: deletionDate });
  }

  /**
   * Restore a deactivated tenant
   */
  async restoreTenant(tenantId: string): Promise<void> {
    const tenant = await pb.collection('tenants').getOne(tenantId);

    if (tenant.status === 'pending_deletion') {
      throw new ConflictError('Cannot restore tenant pending deletion');
    }

    await pb.collection('tenants').update(tenantId, {
      status: 'active',
      deactivatedAt: null,
      deactivatedReason: null,
      deletionScheduledAt: null,
    });

    await audit.log('tenant:restored', { tenantId });
  }

  /**
   * Hard delete a tenant and all data (irreversible)
   */
  async hardDeleteTenant(tenantId: string, confirmedBy: string): Promise<void> {
    const tenant = await pb.collection('tenants').getOne(tenantId);

    if (tenant.status !== 'pending_deletion') {
      throw new ConflictError('Tenant must be in pending_deletion status');
    }

    // Export data before deletion (optional backup)
    await this.exportTenantData(tenantId);

    // Delete all tenant data (cascade deletes handle related records)
    await pb.collection('tenants').delete(tenantId);

    await audit.log('tenant:deleted', { tenantId, slug: tenant.slug, confirmedBy });
  }
}
```

### 6.3 Lifecycle Cron Job

```typescript
// services/tenantLifecycle.ts

export async function processTenantLifecycle(): Promise<void> {
  const now = new Date();

  // Find tenants deactivated for 30+ days
  const deactivatedTenants = await pb.collection('tenants').getList(1, 100, {
    filter: `status = "deactivated" && deletionScheduledAt <= "${now.toISOString()}"`,
  });

  for (const tenant of deactivatedTenants.items) {
    await pb.collection('tenants').update(tenant.id, {
      status: 'pending_deletion',
    });

    // Notify platform admins
    await notifyPlatformAdmins('tenant:pending_deletion', {
      tenantId: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    });

    await audit.log('tenant:marked_for_deletion', { tenantId: tenant.id });
  }

  // Expire trials
  const expiredTrials = await pb.collection('tenants').getList(1, 100, {
    filter: `status = "pending" && trialEndsAt <= "${now.toISOString()}"`,
  });

  for (const tenant of expiredTrials.items) {
    await pb.collection('tenants').update(tenant.id, {
      status: 'suspended',
      deactivatedReason: 'Trial expired',
    });

    await notifyTenantOwner(tenant.id, 'trial:expired');
    await audit.log('tenant:trial_expired', { tenantId: tenant.id });
  }
}
```

---

## 7. API Architecture

### 7.1 API Route Structure

```
/api
├── /auth
│   └── /[...nextauth].ts          # NextAuth handlers
├── /platform                       # Platform admin only
│   ├── /config
│   │   └── route.ts               # GET/POST platform config
│   ├── /tenants
│   │   ├── route.ts               # GET list, POST create
│   │   └── /[tenantId]
│   │       ├── route.ts           # GET/PATCH/DELETE tenant
│   │       ├── /suspend           # POST suspend tenant
│   │       ├── /restore           # POST restore tenant
│   │       └── /users             # GET tenant users
│   └── /analytics
│       └── route.ts               # Platform-wide analytics
├── /tenant                         # Tenant-scoped endpoints
│   └── /[slug]
│       ├── /incidents
│       │   ├── route.ts           # GET list, POST create
│       │   └── /[id]
│       │       ├── route.ts       # GET/PATCH incident
│       │       └── /updates       # GET/POST updates
│       ├── /posts
│       │   ├── route.ts           # GET list, POST create
│       │   └── /[id]
│       │       └── route.ts       # GET/PATCH/DELETE post
│       ├── /forum
│       │   ├── /threads
│       │   │   ├── route.ts       # GET list, POST create
│       │   │   └── /[id]
│       │   │       ├── route.ts   # GET thread with messages
│       │   │       └── /messages  # POST new message
│       │   └── /categories        # GET categories
│       ├── /weather
│       │   └── /alerts            # GET active alerts
│       ├── /users
│       │   ├── route.ts           # GET list (admin)
│       │   └── /[id]
│       │       ├── route.ts       # GET/PATCH user
│       │       └── /ban           # POST ban/unban
│       ├── /moderation
│       │   ├── /queue             # GET queue, PATCH item
│       │   └── /stats             # GET moderation stats
│       ├── /settings
│       │   ├── route.ts           # GET/PATCH tenant settings
│       │   └── /social
│       │       └── /[provider]    # GET/POST/DELETE social connection
│       ├── /analytics
│       │   └── route.ts           # GET tenant analytics
│       └── /pulsepoint
│           └── /fetch             # GET PulsePoint data (rate limited)
└── /webhooks
    ├── /stripe                    # Stripe payment webhooks
    ├── /clerk                     # Clerk auth webhooks (if used)
    └── /pulsepoint                # PulsePoint push notifications
```

### 7.2 API Response Format

```typescript
// Standard success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}

// Standard error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}

// Rate limit response (429)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

### 7.3 Rate Limiting by Tier

| Resource | Free | Starter | Professional | Enterprise |
|----------|------|---------|--------------|------------|
| API requests/min | 60 | 300 | 1000 | Unlimited |
| PulsePoint fetch/min | 0.5 | 1 | 2 | 5 |
| Facebook posts/hour | 5 | 20 | 50 | 200 |
| Media uploads/day | 10 | 50 | 200 | 1000 |
| Incident submissions/day | 20 | 100 | 500 | Unlimited |

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Edge Security (Cloudflare/Vercel)                                 │
│  ├── DDoS protection                                                         │
│  ├── Bot detection                                                           │
│  ├── Rate limiting (global)                                                  │
│  └── WAF rules                                                               │
│                                                                              │
│  Layer 2: Transport Security                                                 │
│  ├── TLS 1.3 enforced                                                        │
│  ├── HSTS headers                                                            │
│  └── Certificate pinning (mobile apps)                                       │
│                                                                              │
│  Layer 3: Application Security                                               │
│  ├── NextAuth session validation                                             │
│  ├── CSRF protection                                                         │
│  ├── Input validation (zod schemas)                                          │
│  └── Content Security Policy                                                 │
│                                                                              │
│  Layer 4: Tenant Isolation                                                   │
│  ├── Middleware tenant extraction                                            │
│  ├── Service layer enforcement                                               │
│  └── Database query scoping                                                  │
│                                                                              │
│  Layer 5: Data Security                                                      │
│  ├── Encryption at rest                                                      │
│  ├── Encryption in transit                                                   │
│  ├── PII handling policies                                                   │
│  └── Audit logging                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Tenant Data Isolation Guarantees

1. **Query Scoping**: Every database query includes `tenantId` filter
2. **Service Injection**: Services are instantiated with tenant context
3. **API Validation**: All tenant-scoped endpoints validate tenant access
4. **Audit Trail**: All data access is logged with tenant context
5. **Cascade Deletes**: Tenant deletion removes all associated data

### 8.3 Sensitive Data Handling

```typescript
// Encrypted fields for social tokens
const ENCRYPTED_FIELDS = ['accessToken', 'refreshToken'];

export async function storeSocialAccount(
  tenantId: string,
  provider: string,
  tokens: OAuthTokens
) {
  const encryptedTokens = {
    accessToken: encrypt(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
  };

  return pb.collection('social_accounts').create({
    tenantId,
    provider,
    providerUserId: tokens.providerUserId,
    ...encryptedTokens,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
  });
}
```

### 8.4 Audit Logging

```typescript
// Every significant action is logged
interface AuditEntry {
  id: string;
  timestamp: Date;
  actorId: string;           // User who performed action
  actorType: 'user' | 'system' | 'api';
  tenantId?: string;         // Null for platform-level actions
  action: string;            // e.g., 'incident:created', 'user:banned'
  targetType?: string;       // e.g., 'incident', 'user'
  targetId?: string;         // ID of affected resource
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Audit log retention: 2 years
// Platform audit logs: Never deleted
// Tenant audit logs: Deleted with tenant
```

---

## 9. Scalability & Performance

### 9.1 Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCALING TIERS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tier 1: Single Instance (0-50 tenants)                                     │
│  ├── Single PocketBase instance                                              │
│  ├── Single Redis instance                                                   │
│  ├── Vercel serverless (auto-scaling)                                        │
│  └── Cost: ~$50/month                                                        │
│                                                                              │
│  Tier 2: Replicated (50-500 tenants)                                        │
│  ├── PocketBase primary + read replicas                                      │
│  ├── Redis cluster (3 nodes)                                                 │
│  ├── Vercel Pro with edge functions                                          │
│  └── Cost: ~$200-500/month                                                   │
│                                                                              │
│  Tier 3: Sharded (500+ tenants)                                             │
│  ├── Multiple PocketBase clusters (by region/tenant size)                    │
│  ├── Redis cluster with sharding                                             │
│  ├── Dedicated compute instances                                             │
│  └── Cost: $1000+/month                                                      │
│                                                                              │
│  Tier 4: Enterprise (1000+ tenants, high-volume)                            │
│  ├── Dedicated database per large tenant                                     │
│  ├── Multi-region deployment                                                 │
│  ├── Custom infrastructure                                                   │
│  └── Cost: Custom pricing                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Caching Strategy

```typescript
// Cache layers
const CACHE_CONFIG = {
  // L1: In-memory (per-instance)
  memory: {
    tenantConfig: '5m',      // Tenant configuration
    featureFlags: '1m',      // Feature flags
    permissions: '5m',       // Permission lookups
  },

  // L2: Redis (shared)
  redis: {
    incidents: '30s',        // Active incidents list
    weatherAlerts: '3m',     // Weather alerts
    analytics: '5m',         // Analytics summaries
    rateLimits: 'persistent', // Rate limit counters
  },

  // L3: CDN (Vercel Edge)
  cdn: {
    staticAssets: '1y',      // Images, fonts, JS bundles
    publicPages: '1h',       // Marketing pages
  },
};
```

### 9.3 Database Optimization

```sql
-- Key indexes for performance

-- Tenant lookups (most frequent)
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_custom_domain ON tenants(customDomain) WHERE customDomain IS NOT NULL;

-- Incident queries (high volume)
CREATE INDEX idx_incidents_tenant_status ON incidents(tenantId, status);
CREATE INDEX idx_incidents_tenant_time ON incidents(tenantId, callReceivedTime DESC);
CREATE INDEX idx_incidents_tenant_sync ON incidents(tenantId, isSyncedToFacebook) WHERE isSyncedToFacebook = false;

-- User lookups
CREATE INDEX idx_users_tenant ON users(tenantId);
CREATE INDEX idx_users_tenant_role ON users(tenantId, tenantRole);
CREATE INDEX idx_users_email ON users(email);

-- Audit log queries
CREATE INDEX idx_audit_tenant_time ON tenant_audit_logs(tenantId, timestamp DESC);
CREATE INDEX idx_audit_actor ON tenant_audit_logs(actorId, timestamp DESC);
```

---

## 10. Integration Architecture

### 10.1 PulsePoint Integration (Per-Tenant)

```typescript
// services/pulsepoint.ts

export class PulsePointService {
  constructor(
    private tenantId: string,
    private config: PulsePointConfig
  ) {}

  async fetchIncidents(): Promise<Incident[]> {
    // Check rate limit
    const allowed = await rateLimiter.checkAndConsume(
      this.tenantId,
      'pulsepoint',
      1
    );

    if (!allowed) {
      throw new RateLimitError('PulsePoint rate limit exceeded');
    }

    // Fetch from PulsePoint API
    const response = await fetch(
      `https://api.pulsepoint.org/incidents?agencyId=${this.config.agencyId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    const data = await response.json();

    // Decrypt and transform
    const incidents = this.decryptAndTransform(data);

    // Store in database with tenant context
    await this.storeIncidents(incidents);

    return incidents;
  }

  private async storeIncidents(incidents: RawIncident[]): Promise<void> {
    for (const incident of incidents) {
      const existing = await pb.collection('incidents').getFirstListItem(
        `tenantId = "${this.tenantId}" && externalId = "${incident.id}"`
      ).catch(() => null);

      if (existing) {
        await pb.collection('incidents').update(existing.id, {
          ...this.transformIncident(incident),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await pb.collection('incidents').create({
          tenantId: this.tenantId,
          source: 'pulsepoint',
          externalId: incident.id,
          ...this.transformIncident(incident),
          moderationStatus: 'auto_approved',
        });
      }
    }
  }
}
```

### 10.2 Social Media Integration (Per-Tenant)

```typescript
// services/social.ts

export class SocialService {
  constructor(private tenantId: string) {}

  async connectFacebook(code: string): Promise<void> {
    // Exchange code for tokens
    const tokens = await this.exchangeFacebookCode(code);

    // Store encrypted tokens
    await pb.collection('social_accounts').create({
      tenantId: this.tenantId,
      provider: 'facebook',
      providerUserId: tokens.userId,
      accessToken: encrypt(tokens.accessToken),
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });

    await audit.log('social:connected', {
      tenantId: this.tenantId,
      provider: 'facebook',
    });
  }

  async postToFacebook(content: FacebookPost): Promise<string> {
    const account = await this.getFacebookAccount();
    if (!account) throw new Error('Facebook not connected');

    const accessToken = decrypt(account.accessToken);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.providerUserId}/feed`,
      {
        method: 'POST',
        body: JSON.stringify({
          message: content.message,
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();
    return data.id;
  }
}
```

### 10.3 Weather Integration (Shared Service)

```typescript
// services/weather.ts
// Weather data is fetched globally and filtered per-tenant

export class WeatherService {
  async fetchAlertsForTenant(tenantId: string): Promise<WeatherAlert[]> {
    const tenant = await pb.collection('tenants').getOne(tenantId);
    const zones = tenant.weatherZones || [];

    if (zones.length === 0) return [];

    // Fetch from NWS API (cached globally)
    const allAlerts = await this.fetchNWSAlerts();

    // Filter to tenant's zones
    const tenantAlerts = allAlerts.filter(alert =>
      alert.affectedZones.some(zone => zones.includes(zone))
    );

    return tenantAlerts;
  }
}
```

---

## 11. Billing & Monetization

### 11.1 Subscription Tiers

| Feature | Free | Starter ($29/mo) | Professional ($99/mo) | Enterprise (Custom) |
|---------|------|------------------|----------------------|---------------------|
| Active incidents | 100/mo | 1,000/mo | 10,000/mo | Unlimited |
| Users | 5 | 25 | 100 | Unlimited |
| PulsePoint refresh | 2 min | 1 min | 30 sec | 15 sec |
| Facebook posting | Manual | Auto (5/hr) | Auto (50/hr) | Auto (unlimited) |
| Weather alerts | Basic | Full | Full + custom zones | Full + API |
| Analytics | 7 days | 30 days | 1 year | Unlimited |
| Custom domain | ❌ | ❌ | ✅ | ✅ |
| White-labeling | ❌ | ❌ | Logo only | Full |
| API access | ❌ | ❌ | Read-only | Full |
| SLA | None | 99% | 99.9% | 99.99% |
| Support | Community | Email | Priority | Dedicated |

### 11.2 Stripe Integration

```typescript
// services/billing.ts

export class BillingService {
  async createSubscription(tenantId: string, tier: SubscriptionTier): Promise<void> {
    const tenant = await pb.collection('tenants').getOne(tenantId);

    // Create Stripe customer if needed
    let customerId = tenant.billingCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.ownerEmail,
        metadata: { tenantId, tenantSlug: tenant.slug },
      });
      customerId = customer.id;
      await pb.collection('tenants').update(tenantId, {
        billingCustomerId: customerId,
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICE_IDS[tier] }],
      metadata: { tenantId },
    });

    await pb.collection('tenants').update(tenantId, {
      tier,
      billingSubscriptionId: subscription.id,
      features: TIER_FEATURES[tier],
      limits: TIER_LIMITS[tier],
    });
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }
}
```

---

## 12. White-Labeling & Customization

### 12.1 Customization Options

```typescript
// Tenant customization schema
interface TenantCustomization {
  // Branding
  displayName: string;
  logoUrl: string;
  faviconUrl: string;

  // Colors (CSS variables)
  primaryColor: string;      // e.g., "#FF5722"
  secondaryColor: string;
  accentColor: string;

  // Custom domain
  customDomain?: string;     // e.g., "alerts.iredellcounty.gov"

  // Content
  welcomeMessage?: string;
  footerText?: string;
  contactEmail?: string;

  // Features
  features: {
    showPoweredBy: boolean;  // "Powered by Vanguard"
    customCss?: string;      // Enterprise only
    customJs?: string;       // Enterprise only
  };
}
```

### 12.2 Custom Domain Support

```typescript
// middleware.ts - Custom domain handling

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');

  // Check if custom domain
  if (!host?.includes('vanguard.app')) {
    const tenant = await pb.collection('tenants').getFirstListItem(
      `customDomain = "${host}"`
    ).catch(() => null);

    if (tenant) {
      // Rewrite to tenant route internally
      const url = request.nextUrl.clone();
      url.pathname = `/tenant/${tenant.slug}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Standard tenant routing
  return handleStandardTenantRouting(request);
}
```

---

## 13. Monitoring & Observability

### 13.1 Metrics Collection

```typescript
// Key metrics to track
const METRICS = {
  // Platform health
  'platform.tenants.total': 'gauge',
  'platform.tenants.active': 'gauge',
  'platform.users.total': 'gauge',

  // Per-tenant metrics
  'tenant.incidents.active': 'gauge',
  'tenant.api.requests': 'counter',
  'tenant.api.errors': 'counter',
  'tenant.api.latency': 'histogram',

  // Integration health
  'pulsepoint.fetch.success': 'counter',
  'pulsepoint.fetch.errors': 'counter',
  'facebook.post.success': 'counter',
  'facebook.post.errors': 'counter',

  // Business metrics
  'billing.mrr': 'gauge',
  'billing.churn': 'gauge',
};
```

### 13.2 Health Checks

```typescript
// pages/api/health.ts

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    pulsepoint: await checkPulsePoint(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'healthy');

  return Response.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503 });
}
```

---

## 14. Disaster Recovery

### 14.1 Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| Database (full) | Daily | 30 days | S3 + cross-region |
| Database (incremental) | Hourly | 7 days | S3 |
| Media files | Real-time sync | Indefinite | S3 + CDN |
| Audit logs | Daily | 2 years | S3 Glacier |

### 14.2 Recovery Procedures

1. **Single Tenant Recovery**: Restore from backup, replay audit logs
2. **Platform Recovery**: Failover to replica, restore from backup
3. **Data Center Failure**: DNS failover to secondary region

---

## 15. Migration Strategy from ICAW

### 15.1 Migration Phases

```
Phase 1: Schema Migration (Week 1)
├── Add tenantId to all tables
├── Create tenant record for existing data
├── Migrate existing data with default tenant
└── Verify data integrity

Phase 2: Code Migration (Week 2-3)
├── Update all queries to include tenantId
├── Add tenant context middleware
├── Update authentication flow
└── Add multi-tenant UI routes

Phase 3: Testing (Week 4)
├── Create test tenants
├── Verify tenant isolation
├── Load testing
└── Security audit

Phase 4: Deployment (Week 5)
├── Deploy to production
├── Migrate ICAW as first tenant
├── Monitor and fix issues
└── Begin onboarding new tenants
```

### 15.2 Data Migration Script

```typescript
// scripts/migrate-from-icaw.ts

async function migrateFromICAW() {
  // Create Iredell County tenant
  const tenant = await pb.collection('tenants').create({
    slug: 'iredell',
    name: 'Iredell County',
    status: 'active',
    tier: 'professional',
    pulsepointAgencyId: 'EMS1681',
    weatherZones: ['NCZ036'],
  });

  // Migrate incidents
  const incidents = await convex.query('incidents:getAll');
  for (const incident of incidents) {
    await pb.collection('incidents').create({
      ...incident,
      tenantId: tenant.id,
      source: 'pulsepoint',
      moderationStatus: 'auto_approved',
    });
  }

  // Migrate users
  const users = await convex.query('users:getAll');
  for (const user of users) {
    await pb.collection('users').create({
      ...user,
      tenantId: tenant.id,
      tenantRole: user.role === 'admin' ? 'admin' : 'member',
    });
  }

  // Migrate other data...
  console.log('Migration complete!');
}
```

---

## Appendix A: Configuration Reference

### A.1 Environment Variables

```bash
# Application
NEXT_PUBLIC_APP_URL=https://vanguard.app
NODE_ENV=production

# PocketBase
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@vanguard.app
POCKETBASE_ADMIN_PASSWORD=<secure-password>

# Authentication
NEXTAUTH_SECRET=<32-char-secret>
NEXTAUTH_URL=https://vanguard.app

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@vanguard.app

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>
```

### A.2 Feature Flags Reference

```typescript
const FEATURE_FLAGS = {
  // Platform-level (system_config.globalFeatures)
  'maintenance_mode': boolean,
  'new_tenant_registration': boolean,
  'stripe_billing': boolean,

  // Tenant-level (tenants.features)
  'pulsepoint': boolean,
  'facebook': boolean,
  'twitter': boolean,
  'weather_alerts': boolean,
  'forum': boolean,
  'user_submissions': boolean,
  'api_access': boolean,
  'custom_domain': boolean,
  'white_label': boolean,
};
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | January 2025 | Architecture Team | Initial version |

---

*This document serves as the authoritative reference for the Vanguard multi-tenancy architecture. All implementation should align with the patterns and principles defined herein.*
