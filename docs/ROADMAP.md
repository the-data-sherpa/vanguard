# Vanguard Implementation Roadmap

> Multi-Tenant Emergency Incident Management Platform
>
> Version: 1.0.0
> Last Updated: January 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Phase 0: Foundation Completion](#3-phase-0-foundation-completion)
4. [Phase 1: Core Multi-Tenancy](#4-phase-1-core-multi-tenancy)
5. [Phase 2: ICAW Feature Migration](#5-phase-2-icaw-feature-migration)
6. [Phase 3: Platform Administration](#6-phase-3-platform-administration)
7. [Phase 4: Community Features](#7-phase-4-community-features)
8. [Phase 5: Production Readiness](#8-phase-5-production-readiness)
9. [Phase 6: Growth & Scale](#9-phase-6-growth--scale)
10. [Dependency Graph](#10-dependency-graph)
11. [Risk Register](#11-risk-register)

---

## 1. Executive Summary

### 1.1 Project Vision

Transform ICAW (Iredell Calls & Weather Alerts) into **Vanguard**, a multi-tenant SaaS platform enabling any county, municipality, or emergency services organization to deploy their own isolated emergency incident management system.

### 1.2 Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | Next.js 15 (App Router) | Scaffolded |
| Backend | Next.js API Routes | Partial |
| Database | PocketBase | Configured |
| Auth | NextAuth + PocketBase Adapter | Implemented |
| Email | Resend | Stub implemented |
| Hosting | Vercel + Self-hosted PocketBase | Planned |

### 1.3 Timeline Overview

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| **Phase 0** | Foundation Completion | 1 week | In Progress |
| **Phase 1** | Core Multi-Tenancy | 2 weeks | Not Started |
| **Phase 2** | ICAW Feature Migration | 3 weeks | Not Started |
| **Phase 3** | Platform Administration | 1 week | Not Started |
| **Phase 4** | Community Features | 2 weeks | Not Started |
| **Phase 5** | Production Readiness | 2 weeks | Not Started |
| **Phase 6** | Growth & Scale | Ongoing | Not Started |

---

## 2. Current State Assessment

### 2.1 Implemented Components

#### Services Layer (✅ Complete)

| File | Description | Quality |
|------|-------------|---------|
| `services/config.ts` | System config CRUD with singleton pattern | Production-ready |
| `services/tenant.ts` | Tenant CRUD operations | Production-ready |
| `services/tenantLifecycle.ts` | 30-day grace period, hard delete | Production-ready |
| `services/rateLimiter.ts` | Token-bucket rate limiting (PocketBase-backed) | Production-ready |
| `services/social.ts` | OAuth token storage per tenant | Production-ready |
| `services/features.ts` | Feature flag management | Production-ready |
| `services/audit.ts` | Audit logging | Production-ready |
| `services/mailer.ts` | Resend email integration | Production-ready |
| `services/pulsepoint.ts` | Rate-limited PulsePoint fetch | Needs real API |
| `services/pocketbaseAdapter.ts` | NextAuth adapter for PocketBase | Production-ready |

#### API Routes (✅ Complete)

| File | Description | Quality |
|------|-------------|---------|
| `pages/api/auth/[...nextauth].ts` | Email magic link + Facebook OAuth | Production-ready |
| `pages/api/tenant/[action].ts` | Tenant CRUD API (admin-protected) | Production-ready |
| `pages/api/tenant/cron.ts` | Lifecycle job trigger | Production-ready |
| `pages/api/config/route.ts` | System config API | Needs verification |
| `pages/api/pulsepoint/fetch.ts` | Tenant-scoped PulsePoint | Needs verification |
| `pages/api/social/[provider].ts` | OAuth callbacks | Needs verification |

#### UI Pages (⚠️ Minimal)

| File | Description | Quality |
|------|-------------|---------|
| `app/tenant/[slug]/page.tsx` | Basic tenant dashboard | Stub only |

#### Schema (⚠️ Incomplete)

| Collection | Exists | Notes |
|------------|--------|-------|
| `system_config` | ✅ | Complete |
| `tenants` | ✅ | Complete |
| `users` | ✅ | Missing tenantRole field |
| `social_accounts` | ✅ | Complete |
| `audit_logs` | ✅ | Complete |
| `rate_counters` | ✅ | Complete |
| `accounts` | ❌ | Required by NextAuth adapter |
| `sessions` | ❌ | Required by NextAuth adapter |
| `incidents` | ❌ | Core feature - from ICAW |
| `incident_updates` | ❌ | Core feature - from ICAW |
| `posts` | ❌ | Community feature - from ICAW |
| `media` | ❌ | Community feature - from ICAW |
| `forum_threads` | ❌ | Community feature - from ICAW |
| `forum_messages` | ❌ | Community feature - from ICAW |
| `weather_alerts` | ❌ | Core feature - from ICAW |
| `moderation_queue` | ❌ | Community feature - from ICAW |

### 2.2 Missing Components

#### Critical (Blocking)

- [ ] `app/middleware.ts` - Tenant context injection
- [ ] Extended PocketBase schema (`accounts`, `sessions`)
- [ ] Incident management system
- [ ] Platform admin UI

#### Important (Core Functionality)

- [ ] Weather alerts integration
- [ ] Facebook auto-posting
- [ ] User management UI
- [ ] Tenant settings UI

#### Nice to Have (Enhancement)

- [ ] Forum system
- [ ] Media uploads
- [ ] Community posts
- [ ] Analytics dashboard

---

## 3. Phase 0: Foundation Completion

> **Goal**: Complete the multi-tenant foundation so any tenant can be created and accessed
>
> **Duration**: 1 week
> **Priority**: Critical

### 3.1 Schema Completion

**Task 0.1: Update PocketBase Schema**

Extend `pb_schema.json` with missing collections:

```json
{
  "collections": [
    // ... existing collections ...
    {
      "id": "accounts",
      "name": "Accounts",
      "type": "base",
      "schema": [
        { "name": "userId", "type": "relation", "required": true, "collectionId": "users" },
        { "name": "type", "type": "text", "required": true },
        { "name": "provider", "type": "text", "required": true },
        { "name": "providerAccountId", "type": "text", "required": true },
        { "name": "accessToken", "type": "text" },
        { "name": "refreshToken", "type": "text" },
        { "name": "expiresAt", "type": "datetime" },
        { "name": "tokenType", "type": "text" },
        { "name": "scope", "type": "text" },
        { "name": "idToken", "type": "text" },
        { "name": "sessionState", "type": "text" }
      ],
      "indexes": [
        { "type": "unique", "fields": ["provider", "providerAccountId"] }
      ]
    },
    {
      "id": "sessions",
      "name": "Sessions",
      "type": "base",
      "schema": [
        { "name": "sessionToken", "type": "text", "required": true },
        { "name": "userId", "type": "relation", "required": true, "collectionId": "users" },
        { "name": "expires", "type": "datetime", "required": true }
      ],
      "indexes": [
        { "type": "unique", "fields": ["sessionToken"] }
      ]
    }
  ]
}
```

**Deliverables:**
- [ ] Add `accounts` collection for OAuth linking
- [ ] Add `sessions` collection for session management
- [ ] Add `tenantRole` field to `users` collection
- [ ] Add `tier` and `limits` fields to `tenants` collection
- [ ] Test schema import via PocketBase admin

### 3.2 Middleware Implementation

**Task 0.2: Create Tenant Context Middleware**

```typescript
// app/middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Extract tenant slug from URL
  // 2. Validate tenant exists and is active
  // 3. Inject tenant context headers
  // 4. Block cross-tenant access
}
```

**Deliverables:**
- [ ] Create `app/middleware.ts`
- [ ] Implement tenant slug extraction
- [ ] Add tenant validation
- [ ] Inject `x-tenant-id`, `x-tenant-slug`, `x-tenant-features` headers
- [ ] Add error handling for inactive/missing tenants

### 3.3 Authentication Enhancement

**Task 0.3: Complete Auth Flow**

**Deliverables:**
- [ ] Test email magic link flow end-to-end
- [ ] Test Facebook OAuth flow
- [ ] Verify session includes `tenantId` and `tenantRole`
- [ ] Add role-based route protection

### 3.4 Development Environment

**Task 0.4: Docker Compose Setup**

```yaml
# docker-compose.yml
version: '3.8'
services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb_data
      - ./pb_schema.json:/pb_schema.json

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Deliverables:**
- [ ] Create `docker-compose.yml`
- [ ] Add PocketBase container
- [ ] Add Redis container (for production rate limiting)
- [ ] Document local setup in README

### 3.5 Phase 0 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Extend schema | `pb_schema.json` | ⬜ |
| Create middleware | `app/middleware.ts` | ⬜ |
| Test auth flow | N/A | ⬜ |
| Docker compose | `docker-compose.yml` | ⬜ |
| Update README | `README.md` | ⬜ |

**Exit Criteria:**
- [ ] Can create a tenant via API
- [ ] Can access `/tenant/[slug]` and see tenant-specific data
- [ ] Auth flow works with tenant context
- [ ] Local dev environment runs with single command

---

## 4. Phase 1: Core Multi-Tenancy

> **Goal**: Implement core incident management with full tenant isolation
>
> **Duration**: 2 weeks
> **Priority**: Critical

### 4.1 Incident Schema & Services

**Task 1.1: Incident Data Model**

```typescript
// Schema additions to pb_schema.json
{
  "id": "incidents",
  "schema": [
    { "name": "tenantId", "type": "relation", "required": true, "collectionId": "tenants" },
    { "name": "source", "type": "select", "options": ["pulsepoint", "user_submitted", "manual"] },
    { "name": "externalId", "type": "text" },
    { "name": "callType", "type": "text", "required": true },
    { "name": "fullAddress", "type": "text", "required": true },
    { "name": "latitude", "type": "number" },
    { "name": "longitude", "type": "number" },
    { "name": "units", "type": "json" },
    { "name": "status", "type": "select", "options": ["active", "closed", "archived"] },
    { "name": "callReceivedTime", "type": "datetime", "required": true },
    { "name": "callClosedTime", "type": "datetime" },
    // ... moderation and sync fields
  ]
}
```

**Deliverables:**
- [ ] Add `incidents` collection to schema
- [ ] Create `services/incidents.ts` with tenant-scoped queries
- [ ] Implement incident aggregation logic (from ICAW)
- [ ] Add incident merging by address/time window

### 4.2 PulsePoint Integration

**Task 1.2: Real PulsePoint Service**

Port the ICAW PulsePoint integration:

**Deliverables:**
- [ ] Update `services/pulsepoint.ts` with real API endpoints
- [ ] Implement AES-256-CBC decryption
- [ ] Add per-tenant agency ID configuration
- [ ] Create background sync job
- [ ] Add `pages/api/cron/pulsepoint.ts` for scheduled fetching

### 4.3 Weather Alerts

**Task 1.3: NWS Weather Integration**

**Deliverables:**
- [ ] Add `weather_alerts` collection to schema
- [ ] Create `services/weather.ts`
- [ ] Implement NWS API integration
- [ ] Add per-tenant zone configuration
- [ ] Create weather alert UI component

### 4.4 Incident UI

**Task 1.4: Tenant Dashboard**

**Deliverables:**
- [ ] Redesign `app/tenant/[slug]/page.tsx`
- [ ] Create `components/incidents/IncidentCard.tsx`
- [ ] Create `components/incidents/IncidentList.tsx`
- [ ] Add real-time updates via polling or websockets
- [ ] Add incident filtering (type, status, medical toggle)

### 4.5 Phase 1 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Incident schema | `pb_schema.json` | ⬜ |
| Incident service | `services/incidents.ts` | ⬜ |
| PulsePoint real API | `services/pulsepoint.ts` | ⬜ |
| Weather alerts | `services/weather.ts` | ⬜ |
| Tenant dashboard | `app/tenant/[slug]/page.tsx` | ⬜ |
| Incident components | `components/incidents/*` | ⬜ |

**Exit Criteria:**
- [ ] Incidents sync from PulsePoint for configured tenants
- [ ] Weather alerts display for configured zones
- [ ] Tenant dashboard shows real-time incident data
- [ ] Data is fully isolated between tenants

---

## 5. Phase 2: ICAW Feature Migration

> **Goal**: Port remaining ICAW features to multi-tenant architecture
>
> **Duration**: 3 weeks
> **Priority**: High

### 5.1 Facebook Integration

**Task 2.1: Auto-Posting System**

**Deliverables:**
- [ ] Create `services/facebook.ts` with Graph API integration
- [ ] Implement incident formatting for Facebook posts
- [ ] Add unit grouping by department
- [ ] Create Facebook sync cron job
- [ ] Add rate limiting (5 posts/2 minutes)

### 5.2 User Submissions

**Task 2.2: User-Generated Content**

**Deliverables:**
- [ ] Add `incident_updates` collection
- [ ] Create submission UI (`app/tenant/[slug]/submit/page.tsx`)
- [ ] Implement moderation workflow
- [ ] Add moderation queue for tenant admins

### 5.3 Interactive Map

**Task 2.3: Incident Map**

**Deliverables:**
- [ ] Create `components/map/IncidentMap.tsx`
- [ ] Integrate Leaflet/Mapbox
- [ ] Add incident markers with clustering
- [ ] Implement real-time marker updates

### 5.4 Analytics Dashboard

**Task 2.4: Tenant Analytics**

**Deliverables:**
- [ ] Create `app/tenant/[slug]/analytics/page.tsx`
- [ ] Add incident trend charts
- [ ] Add call type breakdown
- [ ] Add unit utilization stats
- [ ] Implement data export (CSV/JSON)

### 5.5 Phase 2 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Facebook integration | `services/facebook.ts` | ⬜ |
| User submissions | `services/userContent.ts` | ⬜ |
| Moderation system | `services/moderation.ts` | ⬜ |
| Interactive map | `components/map/*` | ⬜ |
| Analytics dashboard | `app/tenant/[slug]/analytics/*` | ⬜ |

**Exit Criteria:**
- [ ] Incidents auto-post to Facebook (per tenant)
- [ ] Users can submit incident updates
- [ ] Moderators can approve/reject submissions
- [ ] Map displays incidents with real-time updates
- [ ] Analytics show tenant-specific data

---

## 6. Phase 3: Platform Administration

> **Goal**: Build platform admin interface for managing tenants
>
> **Duration**: 1 week
> **Priority**: High

### 6.1 Platform Dashboard

**Task 3.1: Admin Home**

**Deliverables:**
- [ ] Create `app/platform/page.tsx`
- [ ] Add platform statistics (total tenants, users, incidents)
- [ ] Add system health indicators
- [ ] Add recent activity feed

### 6.2 Tenant Management UI

**Task 3.2: Tenant CRUD Interface**

**Deliverables:**
- [ ] Create `app/platform/tenants/page.tsx` (list view)
- [ ] Create `app/platform/tenants/new/page.tsx` (create form)
- [ ] Create `app/platform/tenants/[id]/page.tsx` (detail/edit)
- [ ] Add tenant status actions (activate, suspend, deactivate)
- [ ] Add tenant impersonation for support

### 6.3 Platform Settings

**Task 3.3: Global Configuration UI**

**Deliverables:**
- [ ] Create `app/platform/settings/page.tsx`
- [ ] Add OAuth credentials management
- [ ] Add rate limit configuration
- [ ] Add global feature flags
- [ ] Add email configuration

### 6.4 Phase 3 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Platform dashboard | `app/platform/page.tsx` | ⬜ |
| Tenant list | `app/platform/tenants/page.tsx` | ⬜ |
| Tenant detail | `app/platform/tenants/[id]/page.tsx` | ⬜ |
| Platform settings | `app/platform/settings/page.tsx` | ⬜ |

**Exit Criteria:**
- [ ] Platform admins can create/manage tenants via UI
- [ ] Platform admins can configure global settings
- [ ] All admin actions are audit logged

---

## 7. Phase 4: Community Features

> **Goal**: Add forum, media uploads, and community engagement
>
> **Duration**: 2 weeks
> **Priority**: Medium

### 7.1 Forum System

**Task 4.1: Discussion Forums**

**Deliverables:**
- [ ] Add `forum_threads` and `forum_messages` collections
- [ ] Create `services/forum.ts`
- [ ] Create `app/tenant/[slug]/forum/page.tsx`
- [ ] Implement thread categories
- [ ] Add moderation (pin, lock, delete)

### 7.2 Media Uploads

**Task 4.2: Photo/Video Support**

**Deliverables:**
- [ ] Add `media` collection
- [ ] Create `services/media.ts`
- [ ] Integrate PocketBase file storage
- [ ] Add media moderation workflow
- [ ] Create upload UI components

### 7.3 User Profiles

**Task 4.3: Profile Management**

**Deliverables:**
- [ ] Create `app/tenant/[slug]/profile/page.tsx`
- [ ] Add profile editing (name, bio, avatar)
- [ ] Add user preferences
- [ ] Add activity history

### 7.4 Phase 4 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Forum schema | `pb_schema.json` | ⬜ |
| Forum service | `services/forum.ts` | ⬜ |
| Forum UI | `app/tenant/[slug]/forum/*` | ⬜ |
| Media uploads | `services/media.ts` | ⬜ |
| User profiles | `app/tenant/[slug]/profile/*` | ⬜ |

**Exit Criteria:**
- [ ] Users can create and reply to forum threads
- [ ] Users can upload photos/videos
- [ ] Content moderation works for all types

---

## 8. Phase 5: Production Readiness

> **Goal**: Prepare for production deployment
>
> **Duration**: 2 weeks
> **Priority**: Critical (before launch)

### 8.1 Testing

**Task 5.1: Test Suite**

**Deliverables:**
- [ ] Create `jest.config.js`
- [ ] Add unit tests for all services
- [ ] Create `playwright.config.ts`
- [ ] Add E2E tests for critical flows
- [ ] Achieve 80%+ code coverage

### 8.2 CI/CD Pipeline

**Task 5.2: GitHub Actions**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      pocketbase:
        image: ghcr.io/muchobien/pocketbase:latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npx playwright test
```

**Deliverables:**
- [ ] Create CI workflow
- [ ] Add lint, type-check, test steps
- [ ] Add Playwright E2E tests
- [ ] Configure deployment to Vercel

### 8.3 Security Hardening

**Task 5.3: Security Audit**

**Deliverables:**
- [ ] Implement CSRF protection
- [ ] Add Content Security Policy headers
- [ ] Audit all API routes for auth
- [ ] Add input validation with Zod
- [ ] Review cross-tenant isolation
- [ ] Set up Sentry for error tracking

### 8.4 Performance Optimization

**Task 5.4: Optimization**

**Deliverables:**
- [ ] Add Redis for rate limiting (production)
- [ ] Implement query caching
- [ ] Add loading skeletons
- [ ] Optimize bundle size
- [ ] Add image optimization

### 8.5 Documentation

**Task 5.5: User Documentation**

**Deliverables:**
- [ ] Create user guide
- [ ] Write API documentation
- [ ] Add tenant onboarding guide
- [ ] Create admin documentation
- [ ] Write privacy policy and ToS

### 8.6 Phase 5 Checklist

| Task | File(s) | Status |
|------|---------|--------|
| Jest setup | `jest.config.js` | ⬜ |
| Unit tests | `tests/unit/*` | ⬜ |
| Playwright setup | `playwright.config.ts` | ⬜ |
| E2E tests | `tests/e2e/*` | ⬜ |
| CI workflow | `.github/workflows/ci.yml` | ⬜ |
| Security headers | `next.config.ts` | ⬜ |
| Error tracking | Sentry integration | ⬜ |
| Documentation | `docs/user-guide/*` | ⬜ |

**Exit Criteria:**
- [ ] All tests pass in CI
- [ ] Security audit complete
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## 9. Phase 6: Growth & Scale

> **Goal**: Add features for growth and scaling
>
> **Duration**: Ongoing
> **Priority**: Low (post-launch)

### 6.1 Billing Integration

**Deliverables:**
- [ ] Integrate Stripe
- [ ] Create subscription tiers (Free, Starter, Professional, Enterprise)
- [ ] Add billing portal
- [ ] Implement usage metering

### 6.2 Custom Domains

**Deliverables:**
- [ ] Add custom domain support
- [ ] Implement SSL certificate provisioning
- [ ] Add domain verification

### 6.3 White-Labeling

**Deliverables:**
- [ ] Add tenant branding (logo, colors)
- [ ] Implement custom CSS
- [ ] Remove Vanguard branding for enterprise

### 6.4 API Access

**Deliverables:**
- [ ] Create public REST API
- [ ] Add API key management
- [ ] Write API documentation (OpenAPI)
- [ ] Implement webhooks

### 6.5 Push Notifications

**Deliverables:**
- [ ] Implement Web Push API
- [ ] Add notification preferences
- [ ] Create incident type filtering

---

## 10. Dependency Graph

```
Phase 0 (Foundation)
    │
    ├── Schema completion
    │       └── accounts, sessions collections
    │
    ├── Middleware
    │       └── Tenant context injection
    │
    └── Auth verification
            └── Test all flows
                    │
                    ▼
Phase 1 (Core Multi-Tenancy)
    │
    ├── Incident management ◄── Depends on: Schema, Middleware
    │       │
    │       ├── PulsePoint integration
    │       │
    │       └── Weather alerts
    │
    └── Tenant dashboard UI
                    │
                    ▼
Phase 2 (ICAW Migration)
    │
    ├── Facebook integration ◄── Depends on: Incidents
    │
    ├── User submissions ◄── Depends on: Incidents, Auth
    │
    ├── Map view ◄── Depends on: Incidents
    │
    └── Analytics ◄── Depends on: Incidents
                    │
                    ▼
Phase 3 (Platform Admin)
    │
    ├── Platform dashboard ◄── Depends on: Core tenancy
    │
    ├── Tenant management UI
    │
    └── Settings UI
                    │
                    ▼
Phase 4 (Community)
    │
    ├── Forum ◄── Depends on: Auth, Users
    │
    ├── Media uploads
    │
    └── User profiles
                    │
                    ▼
Phase 5 (Production)
    │
    ├── Testing ◄── Depends on: All features
    │
    ├── CI/CD
    │
    ├── Security
    │
    └── Documentation
                    │
                    ▼
Phase 6 (Growth)
    │
    ├── Billing ◄── Depends on: Core platform
    │
    ├── Custom domains
    │
    ├── White-labeling
    │
    └── API access
```

---

## 11. Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| PulsePoint API changes | High | Medium | Abstract API layer, version pinning |
| Cross-tenant data leak | Critical | Low | Multiple isolation layers, security audit |
| PocketBase scalability | High | Medium | Redis caching, read replicas, consider PostgreSQL |
| NextAuth compatibility | Medium | Low | Pin versions, comprehensive testing |
| Facebook API rate limits | Medium | High | Queue system, exponential backoff |
| NWS API downtime | Low | Medium | Caching, graceful degradation |

---

## Quick Reference: File Structure

```
vanguard/
├── app/
│   ├── middleware.ts              # Phase 0: Tenant context
│   ├── tenant/
│   │   └── [slug]/
│   │       ├── page.tsx           # Phase 1: Dashboard
│   │       ├── submit/            # Phase 2: User submissions
│   │       ├── analytics/         # Phase 2: Analytics
│   │       ├── forum/             # Phase 4: Forum
│   │       └── profile/           # Phase 4: Profile
│   └── platform/
│       ├── page.tsx               # Phase 3: Admin dashboard
│       ├── tenants/               # Phase 3: Tenant management
│       └── settings/              # Phase 3: Platform config
├── components/
│   ├── incidents/                 # Phase 1: Incident UI
│   ├── map/                       # Phase 2: Map components
│   ├── weather/                   # Phase 1: Weather UI
│   └── ui/                        # Shared UI components
├── services/
│   ├── incidents.ts               # Phase 1: Incident service
│   ├── weather.ts                 # Phase 1: Weather service
│   ├── facebook.ts                # Phase 2: Facebook integration
│   ├── forum.ts                   # Phase 4: Forum service
│   └── media.ts                   # Phase 4: Media service
├── pages/api/
│   ├── cron/                      # Background jobs
│   └── webhooks/                  # External webhooks
├── tests/
│   ├── unit/                      # Phase 5: Unit tests
│   └── e2e/                       # Phase 5: E2E tests
└── docs/
    └── architecture/              # Architecture documentation
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial comprehensive roadmap |

---

*This roadmap supersedes the previous MissingFilesRoadmap.md and aligns with the architecture documentation in `/docs/architecture/`.*
