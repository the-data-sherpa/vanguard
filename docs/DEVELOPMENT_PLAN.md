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
│ ✅ Role-based auth framework (member→moderator→admin→owner)     │
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
| Social Media | ⬜ Needed | Schema ready, logic missing |
| User Submissions | ⬜ Needed | Schema ready, UI missing |
| Interactive Map | ⬜ Needed | Not started |
| Analytics | ⬜ Needed | Not started |
| Platform Admin | ⬜ Needed | Partial - needs full UI |

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

## Phase 2: User-Facing Features

**Goal**: Enable community participation and engagement

### Block 2A: User Submissions

| Task | Priority | Complexity |
|------|----------|------------|
| Public incident submission form | 🟠 Medium | Medium |
| Photo/media upload with Convex file storage | 🟠 Medium | Medium |
| Location picker (address autocomplete or map pin) | 🟠 Medium | Medium |
| Submission confirmation & tracking | 🟡 Low | Low |
| Rate limiting for submissions | 🟡 Low | Low |

**Files to create/modify:**
- `app/tenant/[slug]/submit/page.tsx`
- `components/submissions/SubmitIncidentForm.tsx`
- `components/submissions/LocationPicker.tsx`
- `convex/submissions.ts`

### Block 2B: Moderation Queue

| Task | Priority | Complexity |
|------|----------|------------|
| Moderation dashboard (pending submissions list) | 🟠 Medium | Medium |
| Approve/reject workflow with reasons | 🟠 Medium | Low |
| Edit before publish capability | 🟡 Low | Medium |
| Auto-approve rules (trusted users, low-risk types) | 🟡 Low | Medium |
| Moderation audit log | 🟡 Low | Low |

**Files to create/modify:**
- `app/tenant/[slug]/moderation/page.tsx`
- `components/moderation/ModerationQueue.tsx`
- `components/moderation/ModerationActions.tsx`
- `convex/moderation.ts`

### Block 2C: Social Media Integration

| Task | Priority | Complexity |
|------|----------|------------|
| Facebook page connection (OAuth flow) | 🟠 Medium | High |
| Post templates (customizable per incident type) | 🟠 Medium | Medium |
| Auto-post rules (which incidents, when) | 🟠 Medium | Medium |
| Post history & status tracking | 🟡 Low | Low |
| Manual post trigger with preview | 🟡 Low | Medium |

**Files to create/modify:**
- `app/tenant/[slug]/settings/social/page.tsx`
- `convex/social.ts`
- `convex/facebook.ts`
- `components/social/PostPreview.tsx`

---

## Phase 3: Visualization & Analytics

**Goal**: Help tenants understand their data

### Block 3A: Interactive Map

| Task | Priority | Complexity |
|------|----------|------------|
| Map component (Leaflet or Mapbox) | 🟠 Medium | Medium |
| Real-time incident markers with clustering | 🟠 Medium | Medium |
| Weather alert overlays (polygon zones) | 🟡 Low | High |
| Historical heatmap view | 🟡 Low | Medium |
| Filter by type/time on map | 🟡 Low | Low |

**Files to create/modify:**
- `app/tenant/[slug]/map/page.tsx`
- `components/map/IncidentMap.tsx`
- `components/map/WeatherOverlay.tsx`
- `components/map/MapFilters.tsx`

### Block 3B: Analytics Dashboard

| Task | Priority | Complexity |
|------|----------|------------|
| Incident trends over time (line charts) | 🟠 Medium | Medium |
| Call type distribution (pie/bar charts) | 🟠 Medium | Low |
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

## Phase 4: Platform Administration

**Goal**: Tools for managing the entire platform

### Block 4A: Platform Admin Dashboard

| Task | Priority | Complexity |
|------|----------|------------|
| Admin route (/admin) with platform_admin role gate | 🟢 Low | Low |
| All tenants overview (status, tier, last activity) | 🟢 Low | Medium |
| Platform-wide stats (total incidents, users, alerts) | 🟢 Low | Low |
| System health monitoring (sync status, error rates) | 🟢 Low | Medium |
| Quick actions (suspend tenant, impersonate user) | 🟢 Low | Medium |

**Files to create/modify:**
- `app/admin/page.tsx`
- `app/admin/layout.tsx`
- `components/admin/TenantOverview.tsx`
- `components/admin/SystemHealth.tsx`
- `convex/admin.ts`

### Block 4B: Tenant Lifecycle Management

| Task | Priority | Complexity |
|------|----------|------------|
| Tenant creation wizard | 🟢 Low | Medium |
| Tenant suspension/reactivation | 🟢 Low | Low |
| Tenant deletion (soft delete → scheduled purge) | 🟢 Low | Medium |
| Tier upgrades/downgrades | 🟢 Low | Low |
| Feature flag overrides | 🟢 Low | Low |

**Files to create/modify:**
- `app/admin/tenants/page.tsx`
- `app/admin/tenants/new/page.tsx`
- `app/admin/tenants/[id]/page.tsx`
- `convex/tenants.ts` (add lifecycle mutations)

### Block 4C: Billing & Subscriptions

| Task | Priority | Complexity |
|------|----------|------------|
| Stripe integration | 🟢 Low | High |
| Subscription plans (free, starter, pro, enterprise) | 🟢 Low | Medium |
| Usage tracking against limits | 🟢 Low | Medium |
| Invoice history | 🟢 Low | Low |
| Upgrade prompts when hitting limits | 🟢 Low | Low |

**Files to create/modify:**
- `app/tenant/[slug]/billing/page.tsx`
- `app/admin/billing/page.tsx`
- `convex/billing.ts`
- `convex/stripe.ts`

---

## Recommended Execution Order

| Priority | Block | Rationale |
|----------|-------|-----------|
| 🔴 1 | **1A: Auth & Users** | Can't go live without login |
| 🔴 2 | **1B: Tenant Settings** | Completes the admin experience |
| 🟠 3 | **2C: Social Media** | High value for existing ICAW users |
| 🟠 4 | **1C: Incident Enhancements** | Quality of life improvements |
| 🟡 5 | **2A + 2B: Submissions** | Community engagement |
| 🟡 6 | **3A: Map** | Visual appeal, differentiation |
| 🟢 7 | **3B: Analytics** | Nice-to-have for launch |
| 🟢 8 | **4A-C: Platform Admin** | Can manage manually initially |

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
    ├──► Block 2A (Submissions) - needs authenticated users
    │
    ├──► Block 2B (Moderation) - needs role-based access
    │
    └──► Block 4A (Platform Admin) - needs platform_admin role

Block 1C (Incidents)
    │
    ├──► Block 2C (Social) - posts incidents to Facebook
    │
    ├──► Block 3A (Map) - displays incidents on map
    │
    └──► Block 3B (Analytics) - analyzes incident data

Block 2A (Submissions)
    │
    └──► Block 2B (Moderation) - moderates submissions
```

---

## Milestones

### MVP Launch (Blocks 1A + 1B)
- Users can log in
- Admins can configure their tenant
- Real-time incident and weather display works
- Basic tenant management

### Community Launch (+ Blocks 2A, 2B, 2C)
- User submissions enabled
- Moderation workflow active
- Social media auto-posting
- Full tenant self-service

### Full Platform (+ Blocks 3A, 3B, 4A, 4B, 4C)
- Interactive maps
- Analytics dashboards
- Platform admin tools
- Billing and subscriptions

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial building block plan based on codebase assessment |
| 1.1.0 | January 2025 | Block 1B complete - tenant settings, branding, feature toggles, preferences, export |
| 1.2.0 | January 2025 | Block 1C complete - detail page, filtering, notes, manual creation, auto-grouping for related incidents |

---

*This plan reflects the current Convex-based architecture. See ROADMAP.md for historical context on the original PocketBase-based design.*
