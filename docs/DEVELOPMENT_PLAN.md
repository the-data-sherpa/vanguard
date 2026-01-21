# Vanguard Development Plan

> Building Block Approach to Platform Completion
>
> Last Updated: January 2025

---

## Current Architecture

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | Next.js 16 (App Router) | Production-ready |
| Backend | Convex (real-time BaaS) | Production-ready |
| Database | Convex managed DB | Production-ready |
| Auth | Clerk + Convex Auth | Production-ready |
| Styling | Tailwind CSS v4 + shadcn/ui | Production-ready |
| Hosting | Vercel + Convex Cloud | Configured |

---

## Foundation Status

```
┌─────────────────────────────────────────────────────────────────┐
│                    FOUNDATION (COMPLETE)                        │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Multi-tenant architecture (slug-based routing)               │
│ ✅ Convex backend with real-time subscriptions                  │
│ ✅ Database schema (tenants, incidents, weather, users, audit)  │
│ ✅ PulsePoint sync (every 2 min, rate-limited, batch upsert)    │
│ ✅ NWS weather sync (zone-based, severity mapping)              │
│ ✅ Cron jobs (sync, maintenance, cleanup)                       │
│ ✅ Role-based auth framework (user→owner)                       │
│ ✅ Server-side tenant authorization on mutations                │
│ ✅ Input validation (NWS zone format)                           │
│ ✅ Dashboard, incidents list, weather list, settings pages      │
│ ✅ Responsive UI with shadcn/ui components                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Tenant Management | ✅ Done | CRUD, settings, slug routing |
| User Auth Framework | ✅ Done | Role hierarchy, authorization helpers |
| Auth Provider Config | ✅ Done | Clerk configured with webhooks |
| User Management UI | ✅ Done | Profile, invite, roles, ban |
| PulsePoint Sync | ✅ Done | Real-time, rate-limited |
| Weather Alerts | ✅ Done | NWS integration, zone-based |
| Dashboard | ✅ Done | Real-time stats, incidents, weather |
| Settings Pages | ✅ Done | Tabbed layout with all config options |
| Tenant Branding | ✅ Done | Logo upload, colors, display name |
| Feature Toggles | ✅ Done | Enable/disable features with tier gating |
| User Preferences | ✅ Done | Timezone, email/push notifications |
| Data Export | ✅ Done | CSV/JSON export for incidents, weather, audit |
| Social Media | 🔄 In Progress | Mission Control, Facebook integration, auto-post rules, templates |
| User Submissions | 🔮 Deferred | Schema ready, deprioritized |
| Moderation Queue | 🔮 Deferred | Depends on submissions |
| Public Status Page | ⬜ Needed | Not started |
| Interactive Map | ⬜ Needed | Not started (Phase 5) |
| Analytics | ⬜ Needed | Not started |
| Platform Admin | ✅ Done | Dashboard, tenant overview, health monitoring |
| Tenant Lifecycle | ✅ Done | Create, suspend, delete, tier management |
| Billing & Subscriptions | ✅ Done | Stripe, trials, billing portal, demo tenant |

---

## Phase 1: Tenant Platform Hardening

**Goal**: Make each tenant's experience production-ready

### Block 1A: Auth & User Management ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Configure Convex auth provider (Clerk) | ✅ Done | Clerk + Convex Auth with webhooks |
| Build login/signup pages | ✅ Done | `/login`, `/signup` with Clerk components |
| User profile page (view/edit) | ✅ Done | `/tenant/[slug]/profile` with tabs |
| Tenant user management UI | ✅ Done | Invite, roles, ban, remove |
| Password reset / email verification | ✅ Done | Handled by Clerk |
| Route protection middleware | ✅ Done | Clerk middleware + AuthGuard |

**Files created:**
- `convex/auth.config.ts` - Clerk provider config
- `convex/http.ts` - Webhook handler for user sync
- `convex/users.ts` - User management mutations/queries
- `middleware.ts` - Route protection
- `components/auth/AuthGuard.tsx` - Role-based access guard
- `app/login/[[...login]]/page.tsx` - Clerk SignIn
- `app/signup/[[...signup]]/page.tsx` - Clerk SignUp
- `app/tenant/[slug]/profile/page.tsx` - User profile
- `app/tenant/[slug]/users/page.tsx` - User management (admin)
- `components/users/UserTable.tsx` - User list with actions
- `components/users/RoleSelector.tsx` - Role picker
- `components/users/InviteUserDialog.tsx` - Invite modal

**Security note:** Platform admins do NOT have automatic tenant access - they must be explicitly invited to each tenant like any other user.

### Block 1B: Tenant Settings Completion ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Tenant branding (logo upload, colors, display name) | ✅ Done | Convex file storage, color picker |
| Feature toggles UI (enable/disable weather, submissions) | ✅ Done | Switch components with tier gating |
| Notification preferences | ✅ Done | Email/push toggles on profile page |
| Timezone configuration | ✅ Done | Full IANA timezone selector |
| Data export (CSV/JSON download) | ✅ Done | Incidents, weather, audit logs |

**Files created:**
- `app/tenant/[slug]/settings/GeneralSettings.tsx` - Branding & tenant info tab
- `app/tenant/[slug]/settings/IntegrationSettings.tsx` - PulsePoint, weather zones, sync
- `app/tenant/[slug]/settings/FeatureSettings.tsx` - Feature toggles
- `app/tenant/[slug]/settings/DataSettings.tsx` - Data export (CSV/JSON)
- `convex/files.ts` - File storage for logo uploads
- `convex/exports.ts` - Export queries for incidents, weather, audit logs
- `convex/seed.ts` - Development seeding utilities
- `components/ui/switch.tsx` - Toggle switch component
- `components/ui/textarea.tsx` - Textarea component

**Files modified:**
- `app/tenant/[slug]/settings/page.tsx` - Restructured with tabbed layout
- `app/tenant/[slug]/profile/page.tsx` - Added timezone & notification preferences
- `convex/tenants.ts` - Added `updateBranding`, `updateFeatures` mutations

### Block 1C: Incident Enhancements ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Incident detail modal/page (full info, unit timeline) | ✅ Done | Full detail page with timeline, maps link |
| Advanced filtering (date range, unit, address search) | ✅ Done | Server-side date range, client-side filters |
| Incident notes/comments (admin annotations) | ✅ Done | CRUD with role-based permissions |
| Manual incident creation (for non-PulsePoint events) | ✅ Done | Create/edit dialog with full form |
| Auto-group related incidents | ✅ Done | Same address + call type within 10 min window |

**Auto-Grouping**: PulsePoint sometimes creates separate incident records for the same real-world event (one per responding agency/unit type). The sync now auto-detects these by matching `normalizedAddress` + `callType` within a 10-minute window and links them via `groupId`. This enables combined display in UI and single posts to social media.

**Files created:**
- `app/tenant/[slug]/incidents/[id]/page.tsx` - Incident detail page
- `components/incidents/IncidentDetail.tsx` - Detail view component
- `components/incidents/IncidentTimeline.tsx` - Unit timeline visualization
- `components/incidents/UnitStatusBadge.tsx` - Unit status display
- `components/incidents/IncidentFilters.tsx` - Advanced filtering UI
- `components/incidents/IncidentNotes.tsx` - Notes CRUD component
- `components/incidents/CreateIncidentDialog.tsx` - Manual incident form
- `convex/incidentNotes.ts` - Notes backend (add, update, remove)

**Files modified:**
- `convex/incidents.ts` - Added `createManual`, `updateManual`, `listWithDateRange`, `searchByAddress`, auto-grouping in `batchUpsertFromPulsePoint`, merge queries (`getGroupedIncidents`, `getMergeGroupForIncident`)
- `app/tenant/[slug]/incidents/page.tsx` - Integrated filters and create dialog

---

## Phase 2: Platform Administration

**Goal**: Tools for managing the entire platform

### Block 2A: Platform Admin Dashboard ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Admin route (/admin) with platform_admin role gate | ✅ Done | PlatformAdminGuard checks user.role |
| All tenants overview (status, tier, last activity) | ✅ Done | TenantOverviewTable with actions |
| Platform-wide stats (total incidents, users, alerts) | ✅ Done | Stats grid on dashboard |
| System health monitoring (sync status, error rates) | ✅ Done | SystemHealthCard flags stale syncs |
| Quick actions (suspend tenant, trigger sync) | ✅ Done | Row actions with confirmation dialogs |

**Files created:**
- `convex/admin.ts` - Authorization helpers, queries (listAllTenants, getPlatformStats, getSystemHealth, getTenantDetails), mutations (suspendTenant, reactivateTenant, updateTenantTier, triggerTenantSync)
- `components/admin/PlatformAdminGuard.tsx` - Access guard for platform_admin role
- `components/admin/TenantOverviewTable.tsx` - Table with suspend/reactivate/sync actions
- `components/admin/SystemHealthCard.tsx` - Shows operational status or stale syncs
- `components/admin/index.ts` - Component exports
- `components/layout/AdminLayout.tsx` - Admin navigation header
- `app/admin/layout.tsx` - Route layout with guard
- `app/admin/page.tsx` - Dashboard with stats, health, tenant overview

**Security note:** All admin queries/mutations validate platform_admin role in Convex backend. Admin actions are logged to auditLogs. Platform admins see aggregate stats only (no automatic tenant data access).

**Deferred to Block 2B:** User impersonation, full tenant details page, tenant creation wizard

### Block 2B: Tenant Lifecycle Management ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Tenant creation wizard | ✅ Done | Admin can create tenants with full config |
| Tenant suspension/reactivation | ✅ Done | Integrated in admin actions |
| Tenant deletion (soft delete → scheduled purge) | ✅ Done | Status-based deletion flow |
| Tier upgrades/downgrades | ✅ Done | Admin can change tenant tiers |
| Feature flag overrides | ✅ Done | Feature toggles in tenant settings |

**Files created:**
- `app/admin/tenants/page.tsx` - Tenant list and management
- `app/admin/tenants/new/page.tsx` - Tenant creation wizard
- `app/admin/tenants/[id]/page.tsx` - Tenant details and actions

**Files modified:**
- `convex/tenants.ts` - Added lifecycle mutations (create, suspend, delete)

### Block 2C: Billing & Subscriptions ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Stripe integration | ✅ Done | Checkout, webhooks, billing portal |
| Subscription model ($29.99/mo + 14-day trial) | ✅ Done | Single tier, no free plan |
| Trial management | ✅ Done | Auto-start on tenant creation, expiration cron |
| Invoice history | ✅ Done | Fetched from Stripe API |
| Trial/subscription enforcement | ✅ Done | SubscriptionGuard blocks expired trials |
| Public demo tenant | ✅ Done | `/demo` with mock data |
| Admin billing dashboard | ✅ Done | MRR, subscriber count, conversion metrics |

**Files created:**
- `convex/stripe.ts` - Stripe API actions (customer, checkout, portal, subscriptions)
- `convex/billing.ts` - Billing queries/mutations, subscription status
- `convex/demo.ts` - Demo tenant with mock incidents and weather
- `lib/stripe.ts` - Client-side Stripe utilities and pricing constants
- `lib/demo-types.ts` - TypeScript types for demo data
- `app/tenant/[slug]/billing/page.tsx` - Tenant billing portal
- `app/admin/billing/page.tsx` - Admin billing dashboard with MRR metrics
- `app/demo/page.tsx` - Public demo dashboard
- `app/demo/layout.tsx` - Demo layout with banner
- `app/demo/incidents/page.tsx` - Demo incidents list
- `app/demo/weather/page.tsx` - Demo weather alerts
- `components/billing/TrialBanner.tsx` - Trial countdown/warning banner
- `components/billing/SubscribeButton.tsx` - Checkout trigger
- `components/billing/SubscriptionGuard.tsx` - Access enforcement for expired trials
- `components/ui/alert.tsx` - Alert component for billing UI

**Files modified:**
- `convex/http.ts` - Added Stripe webhook handler (`/stripe-webhook`)
- `convex/schema.ts` - Added subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd
- `convex/tenants.ts` - Auto-start 14-day trial on tenant creation
- `convex/maintenance.ts` - Added `expireTrials` action
- `convex/scheduler.ts` - Added trial expiration to daily cron
- `components/layout/TenantLayout.tsx` - Integrated TrialBanner and SubscriptionGuard
- `middleware.ts` - Added `/demo` to public routes

**Environment variables required:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe key
- `STRIPE_PRICE_ID` - Monthly subscription price ID

---

## Phase 3: Social Media Integration

**Goal**: Enable automated incident sharing

### Block 3A: Social Media Integration ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Facebook page connection (OAuth flow) | ✅ Done | Settings page with connect/disconnect |
| Post templates (customizable per incident type) | ✅ Done | Per-tenant template configuration |
| Auto-post rules (which incidents, when) | ✅ Done | Category-based auto-post settings |
| Post history & status tracking | ✅ Done | Mission Control dashboard with sync status |
| Manual post trigger with preview | ✅ Done | Preview and post from incident cards |

**Files created:**
- `app/tenant/[slug]/mission-control/page.tsx` - Mission Control dashboard
- `app/tenant/[slug]/settings/social/page.tsx` - Social media settings
- `convex/facebook.ts` - Facebook API integration (OAuth, posting)
- `convex/missionControl.ts` - Dashboard stats, pending/posted/failed queries
- `convex/incidentUpdates.ts` - Incident updates for posting

**Components created:**
- `components/mission-control/IncidentPostCard.tsx` - Incident card with post controls
- `components/mission-control/SyncStatusBadge.tsx` - Post status indicator
- `components/mission-control/UpdatesList.tsx` - List of incident updates

### Block 3B: Auto-Post Rules Configuration ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Auto-post rules UI (enable/disable toggle, call type filters) | ✅ Done | Settings > Social page |
| Backend mutations (save, get, delete rules) | ✅ Done | convex/autoPostRules.ts |
| Call type filter with multi-select | ✅ Done | Fire, EMS, Traffic, Rescue, HazMat, Other |
| Exclude medical calls toggle | ✅ Done | Privacy filter option |
| Minimum units threshold | ✅ Done | Only post if N+ units respond |
| Delay before posting setting | ✅ Done | Wait X seconds before auto-post |

**Files created:**
- `convex/autoPostRules.ts` - CRUD mutations for auto-post rules
- `convex/callTypes.ts` - 90+ call type code mappings, unit status codes

**Files modified:**
- `app/tenant/[slug]/settings/social/page.tsx` - Full rules configuration UI

### Block 3C: Post Templates ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Template list UI with create/edit/delete | ✅ Done | Settings > Social page |
| Template CRUD mutations | ✅ Done | convex/postTemplates.ts |
| Placeholder system ({{callType}}, {{address}}, etc.) | ✅ Done | Dynamic content replacement |
| Call type assignment for templates | ✅ Done | Match template to incident type |
| Default template designation | ✅ Done | Fallback when no match |
| Template preview | ✅ Done | Live preview with sample data |

**Files created:**
- `convex/postTemplates.ts` - CRUD mutations, template engine, applyTemplate()
- `lib/callTypes.ts` - Frontend call type definitions for UI

**Files modified:**
- `app/tenant/[slug]/settings/social/page.tsx` - Full template management UI

### Block 3D: Template Engine Integration ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Template-aware post formatting | ✅ Done | applyTemplate() replaces hardcoded formatting |
| Rule-based filtering in sync jobs | ✅ Done | shouldAutoPost() checks rules before posting |
| Template selection by call type | ✅ Done | getForCallTypeInternal() matches templates |
| Fallback to default template | ✅ Done | Uses default when no specific match |
| Tenant timezone support | ✅ Done | All times use tenant's configured timezone |

**Files modified:**
- `convex/facebookSync.ts` - Integrated template engine and rule checking
- `convex/schema.ts` - Added timezone field to tenants
- `convex/tenants.ts` - Added updateTimezone mutation
- `app/tenant/[slug]/settings/GeneralSettings.tsx` - Timezone selector UI

---

## Phase 4: Status Page & Analytics

**Goal**: Public visibility and data insights

### Block 4A: Public Service Status Page

| Task | Priority | Complexity |
|------|----------|------------|
| Public status page (no auth required) | 🟡 Medium | Medium |
| Current active incidents summary | 🟡 Medium | Low |
| Active weather alerts display | 🟡 Medium | Low |
| System operational status indicator | 🟡 Medium | Low |
| Historical uptime/incident timeline | 🟡 Medium | Medium |
| Customizable tenant branding on public page | 🟡 Medium | Low |
| Embeddable widget option | 🟡 Low | Medium |

**Files to create/modify:**
- `app/[slug]/status/page.tsx` - Public status page (outside tenant auth)
- `components/status/ActiveIncidentsSummary.tsx`
- `components/status/WeatherAlertsBanner.tsx`
- `components/status/SystemStatus.tsx`
- `components/status/IncidentTimeline.tsx`
- `convex/publicStatus.ts` - Public queries (no auth required)

### Block 4B: Analytics Dashboard

| Task | Priority | Complexity |
|------|----------|------------|
| Incident trends over time (line charts) | 🟡 Low | Medium |
| Call type distribution (pie/bar charts) | 🟡 Low | Low |
| Busiest times analysis (hour/day heatmap) | 🟡 Low | Medium |
| Unit utilization metrics | 🟡 Low | Medium |
| Response time tracking (if data available) | 🟡 Low | Medium |
| Exportable reports (PDF) | 🟡 Low | High |

**Files to create/modify:**
- `app/tenant/[slug]/analytics/page.tsx`
- `components/analytics/TrendChart.tsx`
- `components/analytics/CallTypeBreakdown.tsx`
- `components/analytics/TimeHeatmap.tsx`
- `convex/analytics.ts`

---

## Phase 5: Interactive Map

**Goal**: Visual representation of incidents and alerts

### Block 5A: Interactive Map

| Task | Priority | Complexity |
|------|----------|------------|
| Map component (Leaflet or Mapbox) | 🟡 Low | Medium |
| Real-time incident markers with clustering | 🟡 Low | Medium |
| Weather alert overlays (polygon zones) | 🟡 Low | High |
| Historical heatmap view | 🟡 Low | Medium |
| Filter by type/time on map | 🟡 Low | Low |

**Files to create/modify:**
- `app/tenant/[slug]/map/page.tsx`
- `components/map/IncidentMap.tsx`
- `components/map/WeatherOverlay.tsx`
- `components/map/MapFilters.tsx`

---

## Far Future: Community Features

**Goal**: Enable community participation (deferred - not needed for initial launch)

### User Submissions

| Task | Priority | Complexity |
|------|----------|------------|
| Public incident submission form | 🔮 Deferred | Medium |
| Photo/media upload with Convex file storage | 🔮 Deferred | Medium |
| Location picker (address autocomplete or map pin) | 🔮 Deferred | Medium |
| Submission confirmation & tracking | 🔮 Deferred | Low |
| Rate limiting for submissions | 🔮 Deferred | Low |

**Files to create/modify:**
- `app/tenant/[slug]/submit/page.tsx`
- `components/submissions/SubmitIncidentForm.tsx`
- `components/submissions/LocationPicker.tsx`
- `convex/submissions.ts`

### Moderation Queue

| Task | Priority | Complexity |
|------|----------|------------|
| Moderation dashboard (pending submissions list) | 🔮 Deferred | Medium |
| Approve/reject workflow with reasons | 🔮 Deferred | Low |
| Edit before publish capability | 🔮 Deferred | Medium |
| Auto-approve rules (trusted users, low-risk types) | 🔮 Deferred | Medium |
| Moderation audit log | 🔮 Deferred | Low |

**Files to create/modify:**
- `app/tenant/[slug]/moderation/page.tsx`
- `components/moderation/ModerationQueue.tsx`
- `components/moderation/ModerationActions.tsx`
- `convex/moderation.ts`

---

## Recommended Execution Order

| Priority | Block | Rationale | Status |
|----------|-------|-----------|--------|
| 🔴 1 | **1A: Auth & Users** | Can't go live without login | ✅ Done |
| 🔴 2 | **1B: Tenant Settings** | Completes the admin experience | ✅ Done |
| 🔴 3 | **1C: Incident Enhancements** | Quality of life improvements | ✅ Done |
| 🟠 4 | **2A: Platform Admin Dashboard** | Needed for tenant management | ✅ Done |
| 🟠 5 | **2B: Tenant Lifecycle** | Create/suspend/delete tenants | ✅ Done |
| 🟠 6 | **2C: Billing** | Revenue and trial management | ✅ Done |
| 🟡 7 | **3A: Social Media** | High value for existing ICAW users | ✅ Done |
| 🟡 8 | **4A: Status Page** | Public visibility, transparency | ⬜ Pending |
| 🟡 9 | **4B: Analytics** | Nice-to-have for launch | ⬜ Pending |
| 🟢 10 | **5A: Map** | Visual appeal, differentiation | ⬜ Pending |

---

## Quick Wins (Can Do Anytime)

- [ ] Add loading skeletons to all pages
- [ ] Error boundaries with friendly messages
- [ ] Empty states for no data scenarios
- [ ] Keyboard shortcuts (j/k navigation)
- [ ] Toast notifications for actions
- [ ] Favicon per tenant (using logo)
- [ ] Dark mode polish
- [ ] Mobile navigation improvements

---

## Technical Debt to Address

- [ ] Add comprehensive test suite (Vitest + Playwright)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add Sentry for error tracking
- [ ] Performance monitoring (Vercel Analytics)
- [ ] API documentation (if exposing public API)
- [ ] Security audit before production launch

---

## Dependencies Between Blocks

```
Block 1A (Auth)
    │
    ├──► Block 1B (Settings) - needs user context
    │
    └──► Block 2A (Platform Admin) - needs platform_admin role
             │
             └──► Block 2B (Tenant Lifecycle) - needs admin dashboard

Block 1C (Incidents)
    │
    ├──► Block 3A (Social) - posts incidents to Facebook
    │
    ├──► Block 4A (Status Page) - public incident/weather display
    │
    ├──► Block 4B (Analytics) - analyzes incident data
    │
    └──► Block 5A (Map) - displays incidents on map
```

---

## Milestones

### MVP Launch (Blocks 1A + 1B + 1C) ✅ COMPLETE
- Users can log in
- Admins can configure their tenant
- Real-time incident and weather display works
- Advanced incident filtering and detail views

### Platform Admin Launch (+ Blocks 2A + 2B + 2C) ✅ COMPLETE
- Platform admin dashboard
- Tenant creation/suspension/deletion
- Full tenant lifecycle management
- Billing with Stripe ($29.99/mo + 14-day trial)
- Demo tenant for prospects

### Social Launch (+ Block 3A) ✅ COMPLETE
- Social media auto-posting via Mission Control
- Facebook page integration with OAuth
- Post templates and auto-post rules
- Sync status tracking (pending/posted/failed)

### Public Visibility (+ Blocks 4A, 4B) ⬜ FUTURE
- Public service status page
- Analytics dashboards

### Full Platform (+ Block 5A) ⬜ FUTURE
- Interactive maps with real-time incidents
- Weather alert overlays

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial building block plan based on codebase assessment |
| 1.1.0 | January 2025 | Block 1B complete - tenant settings, branding, feature toggles, preferences, export |
| 1.2.0 | January 2025 | Block 1C complete - detail page, filtering, notes, manual creation, auto-grouping for related incidents |
| 1.3.0 | January 2025 | Deferred User Submissions and Moderation Queue to Far Future section |
| 1.4.0 | January 2025 | Prioritized Platform Administration to Phase 2; Social Media now Phase 3; Visualization now Phase 4 |
| 1.5.0 | January 2025 | Block 2A complete - Platform Admin Dashboard with tenant overview, stats, health monitoring, suspend/reactivate actions |
| 1.6.0 | January 2025 | Block 2B complete - Tenant Lifecycle Management with creation wizard, suspension, deletion, tier upgrades |
| 1.7.0 | January 2025 | Block 2C complete - Billing & Subscriptions with Stripe integration, 14-day trials, demo tenant, billing portal |
| 1.8.0 | January 2025 | Block 3A complete - Mission Control, Facebook integration, auto-posting, sync status tracking |
| 1.9.0 | January 2025 | Blocks 3B, 3C, 3D complete - Auto-post rules, post templates with placeholder system, template engine integration, tenant timezone support, call type/unit status mappings, searchable call type selector |
| 2.0.0 | January 2025 | Restructured Phase 4: Added Public Service Status Page (4A), moved Interactive Map to new Phase 5 |

---

*This plan reflects the current Convex-based architecture. See ROADMAP.md for historical context on the original PocketBase-based design.*
