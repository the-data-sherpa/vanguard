# Tenant Data Model

> Complete schema reference for the Vanguard multi-tenant platform
>
> Version: 1.0.0
> Last Updated: January 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Platform-Level Collections](#2-platform-level-collections)
3. [Tenant-Scoped Collections](#3-tenant-scoped-collections)
4. [Data Relationships](#4-data-relationships)
5. [Index Strategy](#5-index-strategy)
6. [Migration from ICAW](#6-migration-from-icaw)
7. [PocketBase Schema Export](#7-pocketbase-schema-export)

---

## 1. Overview

### 1.1 Schema Design Principles

1. **Tenant Isolation**: All tenant data includes `tenantId` foreign key
2. **Cascade Deletes**: Tenant deletion removes all associated data
3. **Soft Deletes**: User-facing data uses soft delete pattern
4. **Audit Trail**: All mutations are logged
5. **Type Safety**: Schema enforces data types and constraints

### 1.2 Collection Categories

| Category | Tenant Scope | Description |
|----------|--------------|-------------|
| **Platform** | No | Global configuration, tenant registry |
| **Core Data** | Yes | Incidents, posts, media, forum |
| **User Data** | Yes | Users, preferences, activity |
| **Integration** | Yes | Social accounts, API keys |
| **Operations** | Yes | Rate limits, audit logs, moderation |

---

## 2. Platform-Level Collections

### 2.1 system_config

Global platform configuration (singleton).

```typescript
interface SystemConfig {
  id: string;                          // Always "config" (singleton)

  // Email Configuration
  email: {
    provider: 'resend' | 'sendgrid' | 'smtp';
    apiKey?: string;                   // Encrypted
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  };

  // OAuth Provider Credentials
  oauth: {
    google?: {
      clientId: string;
      clientSecret: string;            // Encrypted
    };
    facebook?: {
      appId: string;
      appSecret: string;               // Encrypted
    };
    twitter?: {
      clientId: string;
      clientSecret: string;            // Encrypted
    };
  };

  // Default Rate Limits (can be overridden per tenant)
  rateLimits: {
    api: { requests: number; windowMs: number };
    pulsepoint: { requests: number; windowMs: number };
    facebook: { posts: number; windowMs: number };
  };

  // Global Feature Flags
  features: {
    maintenanceMode: boolean;
    newRegistrations: boolean;
    stripeBilling: boolean;
    betaFeatures: boolean;
  };

  // Platform Settings
  platform: {
    name: string;
    supportEmail: string;
    termsUrl: string;
    privacyUrl: string;
  };

  updatedAt: string;                   // ISO timestamp
  updatedBy?: string;                  // User ID
}
```

**PocketBase Schema:**
```json
{
  "id": "system_config",
  "name": "System Config",
  "type": "base",
  "schema": [
    { "name": "email", "type": "json", "required": true },
    { "name": "oauth", "type": "json", "required": false },
    { "name": "rateLimits", "type": "json", "required": true },
    { "name": "features", "type": "json", "required": true },
    { "name": "platform", "type": "json", "required": true },
    { "name": "updatedBy", "type": "text", "required": false }
  ]
}
```

---

### 2.2 tenants

Tenant registry and configuration.

```typescript
interface Tenant {
  id: string;                          // PocketBase auto-generated

  // Identity
  slug: string;                        // URL-safe identifier (unique)
  name: string;                        // Official name
  displayName?: string;                // Display name (if different)
  description?: string;                // Brief description

  // Branding
  logoUrl?: string;                    // Logo image URL
  faviconUrl?: string;                 // Favicon URL
  primaryColor?: string;               // Hex color code
  secondaryColor?: string;
  accentColor?: string;

  // Custom Domain
  customDomain?: string;               // e.g., "alerts.county.gov"
  domainVerified: boolean;             // DNS verification status

  // Status & Lifecycle
  status: 'pending' | 'active' | 'suspended' | 'deactivated' | 'pending_deletion';
  deactivatedAt?: string;              // When deactivated
  deactivatedReason?: string;          // Why deactivated
  deletionScheduledAt?: string;        // When hard delete is scheduled

  // Subscription
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  trialEndsAt?: string;                // Trial expiration
  billingCustomerId?: string;          // Stripe customer ID
  billingSubscriptionId?: string;      // Stripe subscription ID

  // External Integrations
  pulsepointAgencyId?: string;         // PulsePoint agency identifier
  pulsepointConfig?: {
    apiKey?: string;                   // Encrypted
    refreshInterval: number;           // Seconds
    enabledCallTypes: string[];        // Filter call types
    filterMedical: boolean;
  };
  weatherZones?: string[];             // NWS zone codes

  // Feature Flags (tenant-specific)
  features: {
    pulsepoint: boolean;
    facebook: boolean;
    twitter: boolean;
    instagram: boolean;
    discord: boolean;
    weatherAlerts: boolean;
    forum: boolean;
    userSubmissions: boolean;
    apiAccess: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
  };

  // Limits (based on tier, can be customized)
  limits: {
    maxUsers: number;
    maxIncidentsPerMonth: number;
    maxMediaStorageMb: number;
    maxApiRequestsPerMinute: number;
    pulsepointRefreshSeconds: number;
    facebookPostsPerHour: number;
  };

  // Statistics (denormalized for performance)
  stats: {
    userCount: number;
    incidentCount: number;
    lastIncidentAt?: string;
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

**PocketBase Schema:**
```json
{
  "id": "tenants",
  "name": "Tenants",
  "type": "base",
  "schema": [
    { "name": "slug", "type": "text", "required": true,
      "options": { "min": 3, "max": 50, "pattern": "^[a-z0-9-]+$" }},
    { "name": "name", "type": "text", "required": true },
    { "name": "displayName", "type": "text", "required": false },
    { "name": "description", "type": "text", "required": false },
    { "name": "logoUrl", "type": "url", "required": false },
    { "name": "faviconUrl", "type": "url", "required": false },
    { "name": "primaryColor", "type": "text", "required": false },
    { "name": "secondaryColor", "type": "text", "required": false },
    { "name": "accentColor", "type": "text", "required": false },
    { "name": "customDomain", "type": "text", "required": false },
    { "name": "domainVerified", "type": "bool", "required": true },
    { "name": "status", "type": "select", "required": true,
      "options": { "values": ["pending", "active", "suspended", "deactivated", "pending_deletion"] }},
    { "name": "deactivatedAt", "type": "datetime", "required": false },
    { "name": "deactivatedReason", "type": "text", "required": false },
    { "name": "deletionScheduledAt", "type": "datetime", "required": false },
    { "name": "tier", "type": "select", "required": true,
      "options": { "values": ["free", "starter", "professional", "enterprise"] }},
    { "name": "trialEndsAt", "type": "datetime", "required": false },
    { "name": "billingCustomerId", "type": "text", "required": false },
    { "name": "billingSubscriptionId", "type": "text", "required": false },
    { "name": "pulsepointAgencyId", "type": "text", "required": false },
    { "name": "pulsepointConfig", "type": "json", "required": false },
    { "name": "weatherZones", "type": "json", "required": false },
    { "name": "features", "type": "json", "required": true },
    { "name": "limits", "type": "json", "required": true },
    { "name": "stats", "type": "json", "required": false }
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

---

### 2.3 platform_audit_logs

Audit trail for platform-level operations.

```typescript
interface PlatformAuditLog {
  id: string;
  actorId: string;                     // User who performed action
  actorType: 'user' | 'system' | 'api';
  action: string;                      // e.g., "tenant:created", "config:updated"
  targetType?: string;                 // e.g., "tenant", "config"
  targetId?: string;                   // ID of affected resource
  details?: Record<string, unknown>;   // Additional context
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
```

---

## 3. Tenant-Scoped Collections

All collections in this section include a required `tenantId` field.

### 3.1 users

User accounts with tenant association.

```typescript
interface User {
  id: string;                          // PocketBase auto-generated

  // Tenant Association
  tenantId: string;                    // FK to tenants (required)

  // Identity
  email: string;                       // Unique per tenant
  name?: string;
  username?: string;                   // Unique per tenant
  avatarUrl?: string;
  bio?: string;

  // Authentication
  passwordHash?: string;               // For email/password auth
  emailVerified: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;

  // Roles
  role: 'user' | 'platform_admin';     // Platform-level role
  tenantRole: 'member' | 'moderator' | 'admin' | 'owner';

  // Status
  isActive: boolean;
  isBanned: boolean;
  bannedAt?: string;
  bannedReason?: string;
  bannedBy?: string;                   // User ID who banned

  // Subscription (user-level, within tenant)
  subscriptionTier?: 'free' | 'supporter' | 'patron';
  subscriptionExpiresAt?: string;

  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      incidentTypes: string[];         // Filter by type
    };
    privacy: {
      showProfile: boolean;
      showActivity: boolean;
    };
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

**PocketBase Schema:**
```json
{
  "id": "users",
  "name": "Users",
  "type": "auth",
  "schema": [
    { "name": "tenantId", "type": "relation", "required": true,
      "collectionId": "tenants", "onDelete": "cascade" },
    { "name": "name", "type": "text", "required": false },
    { "name": "username", "type": "text", "required": false },
    { "name": "avatarUrl", "type": "url", "required": false },
    { "name": "bio", "type": "text", "required": false },
    { "name": "role", "type": "select", "required": true,
      "options": { "values": ["user", "platform_admin"] }},
    { "name": "tenantRole", "type": "select", "required": true,
      "options": { "values": ["member", "moderator", "admin", "owner"] }},
    { "name": "isActive", "type": "bool", "required": true },
    { "name": "isBanned", "type": "bool", "required": true },
    { "name": "bannedAt", "type": "datetime", "required": false },
    { "name": "bannedReason", "type": "text", "required": false },
    { "name": "bannedBy", "type": "relation", "required": false,
      "collectionId": "users", "onDelete": "set null" },
    { "name": "subscriptionTier", "type": "select", "required": false,
      "options": { "values": ["free", "supporter", "patron"] }},
    { "name": "subscriptionExpiresAt", "type": "datetime", "required": false },
    { "name": "preferences", "type": "json", "required": false },
    { "name": "lastLoginAt", "type": "datetime", "required": false },
    { "name": "lastLoginIp", "type": "text", "required": false }
  ],
  "indexes": [
    { "type": "index", "fields": ["tenantId"] },
    { "type": "unique", "fields": ["tenantId", "email"] },
    { "type": "unique", "fields": ["tenantId", "username"] },
    { "type": "index", "fields": ["tenantId", "tenantRole"] },
    { "type": "index", "fields": ["role"] }
  ]
}
```

---

### 3.2 incidents

Emergency incidents from PulsePoint or user submissions.

```typescript
interface Incident {
  id: string;
  tenantId: string;                    // FK to tenants

  // Source & Identity
  source: 'pulsepoint' | 'user_submitted' | 'merged' | 'manual';
  externalId?: string;                 // PulsePoint incident ID

  // Location
  fullAddress: string;
  normalizedAddress?: string;          // Standardized format
  latitude?: number;
  longitude?: number;
  county?: string;
  city?: string;
  zipCode?: string;

  // Incident Details
  callType: string;                    // e.g., "SF", "ME", "TC"
  callTypeCategory: 'fire' | 'medical' | 'rescue' | 'traffic' | 'hazmat' | 'other';
  callTypeDescription?: string;        // Human-readable
  description?: string;                // Additional details
  priority?: 'low' | 'normal' | 'high' | 'critical';

  // Units
  units: string[];                     // Unit identifiers
  unitStatuses?: {
    unitId: string;
    status: 'dispatched' | 'enroute' | 'onscene' | 'cleared';
    department?: string;
    timestamp: string;
  }[];

  // Status
  status: 'active' | 'closed' | 'archived';
  callReceivedTime: string;
  callClosedTime?: string;

  // User Submission Fields
  submittedBy?: string;                // FK to users
  moderationStatus?: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;                // FK to users
  moderatedAt?: string;
  rejectionReason?: string;

  // Facebook Sync
  isSyncedToFacebook: boolean;
  facebookPostId?: string;
  needsFacebookUpdate: boolean;
  lastSyncAttempt?: string;
  syncError?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

**PocketBase Schema:**
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
    { "name": "fullAddress", "type": "text", "required": true },
    { "name": "normalizedAddress", "type": "text", "required": false },
    { "name": "latitude", "type": "number", "required": false },
    { "name": "longitude", "type": "number", "required": false },
    { "name": "county", "type": "text", "required": false },
    { "name": "city", "type": "text", "required": false },
    { "name": "zipCode", "type": "text", "required": false },
    { "name": "callType", "type": "text", "required": true },
    { "name": "callTypeCategory", "type": "select", "required": false,
      "options": { "values": ["fire", "medical", "rescue", "traffic", "hazmat", "other"] }},
    { "name": "callTypeDescription", "type": "text", "required": false },
    { "name": "description", "type": "text", "required": false },
    { "name": "priority", "type": "select", "required": false,
      "options": { "values": ["low", "normal", "high", "critical"] }},
    { "name": "units", "type": "json", "required": false },
    { "name": "unitStatuses", "type": "json", "required": false },
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
    { "name": "needsFacebookUpdate", "type": "bool", "required": false },
    { "name": "lastSyncAttempt", "type": "datetime", "required": false },
    { "name": "syncError", "type": "text", "required": false }
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

---

### 3.3 incident_updates

User-submitted updates for existing incidents.

```typescript
interface IncidentUpdate {
  id: string;
  tenantId: string;                    // FK to tenants
  incidentId: string;                  // FK to incidents

  // Content
  updateText: string;                  // Max 500 chars

  // Submission
  submittedBy: string;                 // FK to users

  // Moderation
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;                // FK to users
  moderatedAt?: string;
  rejectionReason?: string;

  // Facebook Sync
  isSyncedToFacebook: boolean;
  lastSyncAttempt?: string;
  syncError?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.4 posts

Community posts and announcements.

```typescript
interface Post {
  id: string;
  tenantId: string;                    // FK to tenants
  authorId: string;                    // FK to users

  // Content
  title: string;
  content: string;                     // Markdown supported
  type: 'incident_update' | 'community_alert' | 'general' | 'announcement';
  incidentId?: string;                 // FK to incidents (if related)

  // Status
  status: 'draft' | 'pending_moderation' | 'approved' | 'rejected' | 'published';
  publishedAt?: string;

  // Moderation
  moderatedBy?: string;                // FK to users
  moderatedAt?: string;
  moderationNotes?: string;

  // Facebook Sync
  isSyncedToFacebook: boolean;
  facebookPostId?: string;
  lastSyncAttempt?: string;
  syncError?: string;

  // Engagement
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.5 media

Photo and video uploads.

```typescript
interface Media {
  id: string;
  tenantId: string;                    // FK to tenants
  uploadedBy: string;                  // FK to users

  // File Info
  storageId: string;                   // PocketBase storage reference
  fileName: string;
  fileType: string;                    // MIME type
  fileSize: number;                    // Bytes
  mediaType: 'image' | 'video';

  // Dimensions
  width?: number;
  height?: number;
  duration?: number;                   // Video duration in seconds
  thumbnailStorageId?: string;

  // Association
  postId?: string;                     // FK to posts
  incidentId?: string;                 // FK to incidents
  forumMessageId?: string;             // FK to forum_messages

  // Moderation
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;                // FK to users
  moderatedAt?: string;
  moderationNotes?: string;

  // Facebook Sync
  isSyncedToFacebook: boolean;
  facebookMediaId?: string;

  // Metadata
  createdAt: string;
}
```

---

### 3.6 forum_threads

Discussion forum threads.

```typescript
interface ForumThread {
  id: string;
  tenantId: string;                    // FK to tenants
  authorId: string;                    // FK to users

  // Content
  title: string;
  category: 'general' | 'incidents' | 'weather' | 'community' | 'support';
  tags: string[];

  // Status
  isPinned: boolean;
  isLocked: boolean;

  // Activity
  viewCount: number;
  replyCount: number;
  lastActivityAt: string;
  lastActivityBy?: string;             // FK to users

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.7 forum_messages

Forum thread replies.

```typescript
interface ForumMessage {
  id: string;
  tenantId: string;                    // FK to tenants
  threadId: string;                    // FK to forum_threads
  authorId: string;                    // FK to users

  // Content
  content: string;                     // Markdown supported

  // Edit History
  isEdited: boolean;
  editedAt?: string;

  // Soft Delete
  isDeleted: boolean;
  deletedBy?: string;                  // FK to users
  deletedAt?: string;
  moderationNotes?: string;

  // Metadata
  createdAt: string;
}
```

---

### 3.8 weather_alerts

NWS weather alerts for tenant's zones.

```typescript
interface WeatherAlert {
  id: string;
  tenantId: string;                    // FK to tenants

  // NWS Data
  nwsId: string;                       // NWS alert identifier
  event: string;                       // e.g., "Tornado Warning"
  headline: string;
  description: string;
  instruction: string;

  // Severity
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Unknown';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  category: string;                    // Met, Geo, Safety, etc.

  // Timing
  onset: string;
  expires: string;
  ends?: string;

  // Geographic
  affectedZones: string[];             // NWS zone URLs

  // Status
  status: 'active' | 'expired' | 'cancelled';

  // Facebook Sync
  isSyncedToFacebook: boolean;
  facebookPostId?: string;
  lastFacebookPostTime?: string;
  lastSyncAttempt?: string;
  syncError?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.9 social_accounts

OAuth connections for social media posting.

```typescript
interface SocialAccount {
  id: string;
  tenantId: string;                    // FK to tenants

  // Provider Info
  provider: 'facebook' | 'twitter' | 'instagram' | 'discord';
  providerUserId: string;              // User/Page ID from provider
  providerUsername?: string;

  // Tokens (encrypted)
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;

  // Status
  isActive: boolean;
  lastUsedAt?: string;
  errorCount: number;
  lastError?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.10 moderation_queue

Content moderation workflow.

```typescript
interface ModerationQueueItem {
  id: string;
  tenantId: string;                    // FK to tenants

  // Item Reference
  itemType: 'incident' | 'incident_update' | 'post' | 'media' | 'forum_message';
  itemId: string;                      // ID of the content item
  submittedBy: string;                 // FK to users

  // Workflow
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in_review' | 'completed';
  assignedTo?: string;                 // FK to users (moderator)
  assignedAt?: string;

  // Resolution
  decision?: 'approved' | 'rejected';
  decisionBy?: string;                 // FK to users
  decisionAt?: string;
  decisionReason?: string;

  // Metadata
  createdAt: string;
  completedAt?: string;
}
```

---

### 3.11 rate_counters

Per-tenant rate limiting state.

```typescript
interface RateCounter {
  id: string;
  tenantId: string;                    // FK to tenants

  // Rate Limit Identity
  resource: string;                    // e.g., "api", "pulsepoint", "facebook"

  // Token Bucket
  tokens: number;                      // Current tokens available
  lastRefill: string;                  // Last token refill time

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.12 tenant_audit_logs

Tenant-specific audit trail.

```typescript
interface TenantAuditLog {
  id: string;
  tenantId: string;                    // FK to tenants

  // Actor
  actorId: string;                     // User ID or "system"
  actorType: 'user' | 'system' | 'api';

  // Action
  action: string;                      // e.g., "incident:created", "user:banned"
  targetType?: string;                 // e.g., "incident", "user"
  targetId?: string;

  // Details
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;

  // Metadata
  timestamp: string;
}
```

---

## 4. Data Relationships

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TENANTS                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Primary Key: id                                                      │    │
│  │ Unique: slug, customDomain                                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┬─────────────────────┐
         │                       │                       │                     │
         ▼                       ▼                       ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │   INCIDENTS     │    │ SOCIAL_ACCOUNTS │    │ RATE_COUNTERS   │
│  FK: tenantId   │    │  FK: tenantId   │    │  FK: tenantId   │    │  FK: tenantId   │
│                 │    │  FK: submittedBy│    │                 │    │                 │
│  Unique per     │    │  FK: moderatedBy│    │  Unique per     │    │  Unique per     │
│  tenant: email, │    │                 │    │  tenant+provider│    │  tenant+resource│
│  username       │    │  Unique per     │    │  +userId        │    │                 │
└────────┬────────┘    │  tenant:        │    └─────────────────┘    └─────────────────┘
         │             │  externalId     │
         │             └────────┬────────┘
         │                      │
         │         ┌────────────┼────────────┐
         │         │            │            │
         │         ▼            ▼            ▼
         │  ┌────────────┐ ┌────────────┐ ┌────────────┐
         │  │ INCIDENT   │ │   MEDIA    │ │ WEATHER    │
         │  │ _UPDATES   │ │            │ │ _ALERTS    │
         │  │ FK: tenant │ │ FK: tenant │ │ FK: tenant │
         │  │ FK: incident│ │ FK: incident│ │            │
         │  │ FK: user   │ │ FK: user   │ │            │
         │  └────────────┘ └────────────┘ └────────────┘
         │
         │         ┌────────────────────────┐
         │         │                        │
         ▼         ▼                        ▼
┌─────────────────────┐          ┌─────────────────────┐
│      POSTS          │          │   FORUM_THREADS     │
│  FK: tenantId       │          │   FK: tenantId      │
│  FK: authorId       │          │   FK: authorId      │
│  FK: incidentId?    │          │                     │
└─────────────────────┘          └──────────┬──────────┘
                                            │
                                            ▼
                                 ┌─────────────────────┐
                                 │  FORUM_MESSAGES     │
                                 │  FK: tenantId       │
                                 │  FK: threadId       │
                                 │  FK: authorId       │
                                 └─────────────────────┘
```

### 4.2 Cascade Delete Rules

When a tenant is deleted, all related data is removed:

| Parent | Child | On Delete |
|--------|-------|-----------|
| tenants | users | CASCADE |
| tenants | incidents | CASCADE |
| tenants | posts | CASCADE |
| tenants | media | CASCADE |
| tenants | forum_threads | CASCADE |
| tenants | forum_messages | CASCADE |
| tenants | weather_alerts | CASCADE |
| tenants | social_accounts | CASCADE |
| tenants | rate_counters | CASCADE |
| tenants | moderation_queue | CASCADE |
| tenants | tenant_audit_logs | CASCADE |
| users | posts | SET NULL |
| users | incidents (submittedBy) | SET NULL |
| users | forum_threads | SET NULL |
| users | forum_messages | SET NULL |
| incidents | incident_updates | CASCADE |
| incidents | media | CASCADE |
| forum_threads | forum_messages | CASCADE |

---

## 5. Index Strategy

### 5.1 Primary Access Patterns

| Query Pattern | Index |
|--------------|-------|
| Get tenant by slug | `tenants(slug)` UNIQUE |
| Get tenant by custom domain | `tenants(customDomain)` UNIQUE |
| List active incidents for tenant | `incidents(tenantId, status, callReceivedTime)` |
| Get user by email in tenant | `users(tenantId, email)` UNIQUE |
| List moderation queue for tenant | `moderation_queue(tenantId, status, createdAt)` |
| Check rate limit | `rate_counters(tenantId, resource)` UNIQUE |

### 5.2 Composite Indexes

```sql
-- High-frequency queries
CREATE INDEX idx_incidents_tenant_active ON incidents(tenantId, status, callReceivedTime DESC)
  WHERE status = 'active';

CREATE INDEX idx_incidents_tenant_sync ON incidents(tenantId, isSyncedToFacebook, needsFacebookUpdate)
  WHERE isSyncedToFacebook = false OR needsFacebookUpdate = true;

CREATE INDEX idx_users_tenant_active ON users(tenantId, isActive, tenantRole)
  WHERE isActive = true;

CREATE INDEX idx_moderation_pending ON moderation_queue(tenantId, status, priority, createdAt)
  WHERE status = 'pending';

CREATE INDEX idx_forum_threads_active ON forum_threads(tenantId, category, lastActivityAt DESC)
  WHERE isLocked = false;
```

---

## 6. Migration from ICAW

### 6.1 Schema Mapping

| ICAW (Convex) | Vanguard (PocketBase) | Notes |
|---------------|----------------------|-------|
| `users.clerkId` | `users.id` | PocketBase auth handles this |
| `users.role` | `users.tenantRole` | Split into role + tenantRole |
| `incidents.*` | `incidents.*` | Add tenantId, source |
| `userIncidents` | `incidents` | Unified with source='user_submitted' |
| `incidentUpdates` | `incident_updates` | Add tenantId |
| `posts.*` | `posts.*` | Add tenantId |
| `media.*` | `media.*` | Add tenantId |
| `forumThreads` | `forum_threads` | Add tenantId |
| `forumMessages` | `forum_messages` | Add tenantId |
| `weatherAlerts` | `weather_alerts` | Add tenantId |
| `moderationQueue` | `moderation_queue` | Add tenantId |
| `facebookSyncLogs` | `tenant_audit_logs` | Merged into audit |
| `systemConfig` | `system_config` | Restructured |

### 6.2 Migration Script

See `scripts/migrate-from-icaw.ts` in the main architecture document.

---

## 7. PocketBase Schema Export

The complete PocketBase schema can be imported via the admin UI. See `pb_schema.json` in the project root.

### 7.1 Schema Validation

```typescript
// scripts/validate-schema.ts
import schema from '../pb_schema.json';

function validateSchema() {
  const requiredCollections = [
    'system_config',
    'tenants',
    'users',
    'incidents',
    'incident_updates',
    'posts',
    'media',
    'forum_threads',
    'forum_messages',
    'weather_alerts',
    'social_accounts',
    'moderation_queue',
    'rate_counters',
    'platform_audit_logs',
    'tenant_audit_logs',
  ];

  const collectionNames = schema.collections.map(c => c.id);

  for (const required of requiredCollections) {
    if (!collectionNames.includes(required)) {
      throw new Error(`Missing required collection: ${required}`);
    }
  }

  console.log('Schema validation passed!');
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial schema definition |

---

*This document defines the complete data model for the Vanguard multi-tenant platform.*
