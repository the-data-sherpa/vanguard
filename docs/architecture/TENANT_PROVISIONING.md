# Tenant Provisioning Guide

> Complete guide to creating, configuring, and onboarding tenants
>
> Version: 1.0.0
> Last Updated: January 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Provisioning Workflow](#2-provisioning-workflow)
3. [Self-Service Signup](#3-self-service-signup)
4. [Manual Provisioning](#4-manual-provisioning)
5. [Tenant Configuration](#5-tenant-configuration)
6. [Integration Setup](#6-integration-setup)
7. [Onboarding Checklist](#7-onboarding-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Overview

### 1.1 Provisioning Methods

| Method | Use Case | Time to Activate |
|--------|----------|------------------|
| **Self-Service** | Standard customers, trials | Instant |
| **Manual** | Enterprise, custom setups | 1-2 business days |
| **API** | Partner integrations | Instant |

### 1.2 Provisioning Components

```
Tenant Provisioning
├── Tenant Record Creation
├── Owner User Account
├── Default Configuration
├── Feature Flags Setup
├── Integration Credentials
├── Billing Setup (if applicable)
└── Welcome Email
```

---

## 2. Provisioning Workflow

### 2.1 Self-Service Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SELF-SERVICE PROVISIONING FLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

  User visits /signup
         │
         ▼
  ┌──────────────────┐
  │  Enter Details   │
  │  - Organization  │
  │  - Admin Email   │
  │  - Slug (auto)   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐      ┌──────────────────┐
  │ Validate Input   │─NO──►│ Show Errors      │
  │ - Slug available │      │ - Fix & retry    │
  │ - Email valid    │      └──────────────────┘
  │ - Terms accepted │
  └────────┬─────────┘
           │ YES
           ▼
  ┌──────────────────┐
  │ Create Tenant    │
  │ - status: pending│
  │ - tier: free     │
  │ - trial: 14 days │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Create Owner     │
  │ - tenantRole:    │
  │   owner          │
  │ - Send verify    │
  │   email          │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ User Verifies    │
  │ Email            │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Tenant Activated │
  │ - status: active │
  │ - Trial started  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Redirect to      │
  │ /tenant/[slug]   │
  │ /setup wizard    │
  └──────────────────┘
```

### 2.2 Manual Provisioning Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MANUAL PROVISIONING FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  Platform Admin receives request
         │
         ▼
  ┌──────────────────┐
  │ Gather Info      │
  │ - Organization   │
  │ - Contact email  │
  │ - Tier/plan      │
  │ - PulsePoint ID  │
  │ - Custom config  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Admin creates    │
  │ tenant via       │
  │ /platform/tenants│
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Configure        │
  │ - Features       │
  │ - Integrations   │
  │ - Custom limits  │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Create Owner     │
  │ Account          │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Send Welcome     │
  │ Email with       │
  │ Instructions     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Tenant Active    │
  │ Ready for use    │
  └──────────────────┘
```

---

## 3. Self-Service Signup

### 3.1 Signup Form Fields

```typescript
interface SignupFormData {
  // Required
  organizationName: string;          // "Iredell County EMS"
  adminEmail: string;                // "admin@iredell.gov"
  adminName: string;                 // "John Smith"
  termsAccepted: boolean;            // Must be true

  // Optional
  slug?: string;                     // Auto-generated if not provided
  description?: string;              // Organization description
  website?: string;                  // Organization website

  // Referral (for tracking)
  referralCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}
```

### 3.2 Slug Generation

```typescript
// services/tenant.ts

export function generateSlug(organizationName: string): string {
  // Convert to lowercase
  let slug = organizationName.toLowerCase();

  // Replace spaces and special chars with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Truncate to max length
  slug = slug.substring(0, 50);

  return slug;
}

export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await slugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Examples:
// "Iredell County EMS" -> "iredell-county-ems"
// "Wake County Fire & Rescue" -> "wake-county-fire-rescue"
// "123 Test Org" -> "123-test-org"
```

### 3.3 Signup API

```typescript
// pages/api/signup/route.ts

export async function POST(request: Request) {
  const body = await request.json();

  // Validate input
  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: validation.error.issues }
    }, { status: 400 });
  }

  const { organizationName, adminEmail, adminName, slug: requestedSlug } = validation.data;

  // Check email not already registered
  const existingUser = await pb.collection('users').getFirstListItem(
    `email = "${adminEmail}"`
  ).catch(() => null);

  if (existingUser) {
    return Response.json({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
    }, { status: 409 });
  }

  // Generate/validate slug
  const baseSlug = requestedSlug || generateSlug(organizationName);
  const slug = await ensureUniqueSlug(baseSlug);

  // Create tenant
  const tenant = await pb.collection('tenants').create({
    slug,
    name: organizationName,
    displayName: organizationName,
    status: 'pending', // Pending until email verified
    tier: 'free',
    trialEndsAt: addDays(new Date(), 14).toISOString(),
    features: getDefaultFeatures('free'),
    limits: getDefaultLimits('free'),
    domainVerified: false,
  });

  // Create owner user
  const user = await pb.collection('users').create({
    tenantId: tenant.id,
    email: adminEmail,
    name: adminName,
    role: 'user',
    tenantRole: 'owner',
    isActive: true,
    isBanned: false,
    emailVerified: false,
    preferences: getDefaultPreferences(),
  });

  // Send verification email
  await sendVerificationEmail(user.id, adminEmail, {
    organizationName,
    slug,
  });

  // Log audit
  await audit.log('tenant:created', {
    tenantId: tenant.id,
    slug,
    source: 'self_service',
  });

  return Response.json({
    success: true,
    data: {
      tenantId: tenant.id,
      slug,
      message: 'Please check your email to verify your account',
    }
  }, { status: 201 });
}
```

### 3.4 Email Verification

```typescript
// services/verification.ts

export async function verifyEmail(token: string): Promise<VerificationResult> {
  // Decode and validate token
  const payload = await verifyToken(token);
  if (!payload) {
    return { success: false, error: 'Invalid or expired token' };
  }

  const { userId, tenantId } = payload;

  // Update user
  await pb.collection('users').update(userId, {
    emailVerified: true,
  });

  // Activate tenant
  await pb.collection('tenants').update(tenantId, {
    status: 'active',
  });

  // Send welcome email
  const tenant = await pb.collection('tenants').getOne(tenantId);
  const user = await pb.collection('users').getOne(userId);

  await sendWelcomeEmail(user.email, {
    name: user.name,
    organizationName: tenant.name,
    slug: tenant.slug,
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tenant/${tenant.slug}/login`,
  });

  // Log audit
  await audit.log('tenant:activated', { tenantId, userId });

  return {
    success: true,
    tenantSlug: tenant.slug,
  };
}
```

---

## 4. Manual Provisioning

### 4.1 Platform Admin UI

The platform admin can create tenants via `/platform/tenants`:

```typescript
// app/platform/tenants/create/page.tsx

interface CreateTenantForm {
  // Basic Info
  name: string;
  slug: string;
  displayName?: string;
  description?: string;

  // Owner
  ownerEmail: string;
  ownerName: string;

  // Configuration
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  skipTrial: boolean;

  // Integrations
  pulsepointAgencyId?: string;
  weatherZones?: string[];

  // Features (override defaults)
  features?: Partial<TenantFeatures>;

  // Limits (override defaults)
  limits?: Partial<TenantLimits>;
}
```

### 4.2 Admin Creation API

```typescript
// pages/api/platform/tenants/route.ts

export async function POST(request: Request) {
  // Require platform_admin role
  const session = await requireRole('platform_admin', request);

  const body = await request.json();
  const validation = adminCreateTenantSchema.safeParse(body);

  if (!validation.success) {
    return Response.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', details: validation.error.issues }
    }, { status: 400 });
  }

  const data = validation.data;

  // Validate slug uniqueness
  if (await slugExists(data.slug)) {
    return Response.json({
      success: false,
      error: { code: 'SLUG_EXISTS', message: 'Slug already in use' }
    }, { status: 409 });
  }

  // Create tenant with full configuration
  const tenant = await pb.collection('tenants').create({
    slug: data.slug,
    name: data.name,
    displayName: data.displayName || data.name,
    description: data.description,
    status: data.skipTrial ? 'active' : 'pending',
    tier: data.tier,
    trialEndsAt: data.skipTrial ? null : addDays(new Date(), 14).toISOString(),
    pulsepointAgencyId: data.pulsepointAgencyId,
    weatherZones: data.weatherZones || [],
    features: {
      ...getDefaultFeatures(data.tier),
      ...data.features,
    },
    limits: {
      ...getDefaultLimits(data.tier),
      ...data.limits,
    },
    domainVerified: false,
  });

  // Create owner user
  const user = await pb.collection('users').create({
    tenantId: tenant.id,
    email: data.ownerEmail,
    name: data.ownerName,
    role: 'user',
    tenantRole: 'owner',
    isActive: true,
    isBanned: false,
    emailVerified: false,
    preferences: getDefaultPreferences(),
  });

  // Send invitation email
  await sendInvitationEmail(data.ownerEmail, {
    invitedBy: session.email,
    organizationName: data.name,
    slug: data.slug,
    tier: data.tier,
    setPasswordUrl: generateSetPasswordUrl(user.id),
  });

  // Log audit
  await audit.log('tenant:created', {
    tenantId: tenant.id,
    slug: data.slug,
    tier: data.tier,
    createdBy: session.userId,
    source: 'admin',
  });

  return Response.json({
    success: true,
    data: {
      tenant,
      owner: { id: user.id, email: user.email },
    }
  }, { status: 201 });
}
```

### 4.3 Bulk Import

For migrating multiple organizations:

```typescript
// scripts/bulk-import-tenants.ts

interface TenantImportRow {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  tier: string;
  pulsepointAgencyId?: string;
  weatherZones?: string;
}

async function bulkImportTenants(csvPath: string) {
  const rows = await parseCSV<TenantImportRow>(csvPath);

  const results = {
    success: [] as string[],
    failed: [] as { slug: string; error: string }[],
  };

  for (const row of rows) {
    try {
      // Validate
      if (await slugExists(row.slug)) {
        throw new Error('Slug already exists');
      }

      // Create tenant
      const tenant = await pb.collection('tenants').create({
        slug: row.slug,
        name: row.name,
        status: 'active',
        tier: row.tier as TenantTier,
        pulsepointAgencyId: row.pulsepointAgencyId,
        weatherZones: row.weatherZones?.split(',').map(z => z.trim()) || [],
        features: getDefaultFeatures(row.tier as TenantTier),
        limits: getDefaultLimits(row.tier as TenantTier),
        domainVerified: false,
      });

      // Create owner
      await pb.collection('users').create({
        tenantId: tenant.id,
        email: row.ownerEmail,
        name: row.ownerName,
        role: 'user',
        tenantRole: 'owner',
        isActive: true,
        isBanned: false,
        emailVerified: false,
      });

      results.success.push(row.slug);
    } catch (error) {
      results.failed.push({
        slug: row.slug,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log('Import complete:', results);
  return results;
}
```

---

## 5. Tenant Configuration

### 5.1 Default Features by Tier

```typescript
// lib/tenant-defaults.ts

export function getDefaultFeatures(tier: TenantTier): TenantFeatures {
  const defaults: Record<TenantTier, TenantFeatures> = {
    free: {
      pulsepoint: true,
      facebook: false,
      twitter: false,
      instagram: false,
      discord: false,
      weatherAlerts: true,
      forum: true,
      userSubmissions: true,
      apiAccess: false,
      customDomain: false,
      whiteLabel: false,
    },
    starter: {
      pulsepoint: true,
      facebook: true,
      twitter: false,
      instagram: false,
      discord: false,
      weatherAlerts: true,
      forum: true,
      userSubmissions: true,
      apiAccess: false,
      customDomain: false,
      whiteLabel: false,
    },
    professional: {
      pulsepoint: true,
      facebook: true,
      twitter: true,
      instagram: true,
      discord: true,
      weatherAlerts: true,
      forum: true,
      userSubmissions: true,
      apiAccess: true,
      customDomain: true,
      whiteLabel: false,
    },
    enterprise: {
      pulsepoint: true,
      facebook: true,
      twitter: true,
      instagram: true,
      discord: true,
      weatherAlerts: true,
      forum: true,
      userSubmissions: true,
      apiAccess: true,
      customDomain: true,
      whiteLabel: true,
    },
  };

  return defaults[tier];
}
```

### 5.2 Default Limits by Tier

```typescript
export function getDefaultLimits(tier: TenantTier): TenantLimits {
  const defaults: Record<TenantTier, TenantLimits> = {
    free: {
      maxUsers: 5,
      maxIncidentsPerMonth: 100,
      maxMediaStorageMb: 100,
      maxApiRequestsPerMinute: 60,
      pulsepointRefreshSeconds: 120,
      facebookPostsPerHour: 5,
    },
    starter: {
      maxUsers: 25,
      maxIncidentsPerMonth: 1000,
      maxMediaStorageMb: 1000,
      maxApiRequestsPerMinute: 300,
      pulsepointRefreshSeconds: 60,
      facebookPostsPerHour: 20,
    },
    professional: {
      maxUsers: 100,
      maxIncidentsPerMonth: 10000,
      maxMediaStorageMb: 10000,
      maxApiRequestsPerMinute: 1000,
      pulsepointRefreshSeconds: 30,
      facebookPostsPerHour: 50,
    },
    enterprise: {
      maxUsers: -1, // Unlimited
      maxIncidentsPerMonth: -1,
      maxMediaStorageMb: 100000,
      maxApiRequestsPerMinute: -1,
      pulsepointRefreshSeconds: 15,
      facebookPostsPerHour: 200,
    },
  };

  return defaults[tier];
}
```

### 5.3 Post-Creation Setup Wizard

```typescript
// app/tenant/[slug]/setup/page.tsx

interface SetupWizardSteps {
  steps: [
    {
      id: 'branding',
      title: 'Customize Branding',
      description: 'Upload logo and set colors',
      fields: ['logoUrl', 'primaryColor', 'displayName'],
    },
    {
      id: 'pulsepoint',
      title: 'PulsePoint Integration',
      description: 'Connect to your emergency services feed',
      fields: ['pulsepointAgencyId'],
      optional: false,
    },
    {
      id: 'weather',
      title: 'Weather Alerts',
      description: 'Configure NWS weather zones',
      fields: ['weatherZones'],
      optional: true,
    },
    {
      id: 'social',
      title: 'Social Media',
      description: 'Connect Facebook for auto-posting',
      fields: ['facebook'],
      optional: true,
    },
    {
      id: 'team',
      title: 'Invite Team',
      description: 'Add moderators and admins',
      fields: ['inviteEmails'],
      optional: true,
    },
  ];
}
```

---

## 6. Integration Setup

### 6.1 PulsePoint Configuration

```typescript
// services/tenant-setup.ts

export async function configurePulsePoint(
  tenantId: string,
  config: PulsePointSetupConfig
): Promise<void> {
  // Validate agency ID
  const isValid = await validatePulsePointAgency(config.agencyId);
  if (!isValid) {
    throw new Error('Invalid PulsePoint agency ID');
  }

  // Test connection
  const testResult = await testPulsePointConnection(config.agencyId, config.apiKey);
  if (!testResult.success) {
    throw new Error(`PulsePoint connection failed: ${testResult.error}`);
  }

  // Update tenant
  await pb.collection('tenants').update(tenantId, {
    pulsepointAgencyId: config.agencyId,
    pulsepointConfig: {
      apiKey: encrypt(config.apiKey),
      refreshInterval: config.refreshInterval || 60,
      enabledCallTypes: config.callTypes || [],
      filterMedical: config.filterMedical ?? true,
    },
    'features.pulsepoint': true,
  });

  // Start initial sync
  await triggerPulsePointSync(tenantId);

  await audit.log('integration:pulsepoint:configured', { tenantId });
}
```

### 6.2 Facebook Setup

```typescript
// services/tenant-setup.ts

export async function configureFacebook(
  tenantId: string,
  authCode: string
): Promise<void> {
  // Exchange code for tokens
  const tokens = await exchangeFacebookCode(authCode);

  // Get page info
  const pageInfo = await getFacebookPageInfo(tokens.accessToken);

  // Store encrypted tokens
  await pb.collection('social_accounts').create({
    tenantId,
    provider: 'facebook',
    providerUserId: pageInfo.id,
    providerUsername: pageInfo.name,
    accessToken: encrypt(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    expiresAt: tokens.expiresAt,
    scope: tokens.scope,
    isActive: true,
    errorCount: 0,
  });

  // Enable feature
  await pb.collection('tenants').update(tenantId, {
    'features.facebook': true,
  });

  await audit.log('integration:facebook:connected', {
    tenantId,
    pageId: pageInfo.id,
    pageName: pageInfo.name,
  });
}
```

### 6.3 Weather Zones Setup

```typescript
// services/tenant-setup.ts

export async function configureWeatherZones(
  tenantId: string,
  zones: string[]
): Promise<void> {
  // Validate zone codes
  const validZones = await validateNWSZones(zones);
  const invalidZones = zones.filter(z => !validZones.includes(z));

  if (invalidZones.length > 0) {
    throw new Error(`Invalid NWS zones: ${invalidZones.join(', ')}`);
  }

  // Update tenant
  await pb.collection('tenants').update(tenantId, {
    weatherZones: validZones,
    'features.weatherAlerts': true,
  });

  // Fetch initial alerts
  await fetchWeatherAlerts(tenantId);

  await audit.log('integration:weather:configured', {
    tenantId,
    zones: validZones,
  });
}

// Zone lookup helper
export async function lookupNWSZones(county: string, state: string): Promise<string[]> {
  const response = await fetch(
    `https://api.weather.gov/zones?area=${state}&type=county`
  );
  const data = await response.json();

  return data.features
    .filter((f: any) => f.properties.name.toLowerCase().includes(county.toLowerCase()))
    .map((f: any) => f.properties.id);
}
```

---

## 7. Onboarding Checklist

### 7.1 Automated Checklist Tracking

```typescript
// lib/onboarding.ts

interface OnboardingChecklist {
  tenantId: string;
  steps: {
    emailVerified: boolean;
    brandingConfigured: boolean;
    pulsepointConnected: boolean;
    firstIncidentSynced: boolean;
    weatherConfigured: boolean;
    socialConnected: boolean;
    teamInvited: boolean;
    firstPostCreated: boolean;
  };
  completedAt?: string;
  lastUpdated: string;
}

export async function getOnboardingProgress(tenantId: string): Promise<OnboardingChecklist> {
  const tenant = await pb.collection('tenants').getOne(tenantId);
  const owner = await pb.collection('users').getFirstListItem(
    `tenantId = "${tenantId}" && tenantRole = "owner"`
  );

  const incidentCount = await pb.collection('incidents').getList(1, 1, {
    filter: `tenantId = "${tenantId}"`,
  });

  const socialAccounts = await pb.collection('social_accounts').getList(1, 1, {
    filter: `tenantId = "${tenantId}" && isActive = true`,
  });

  const teamMembers = await pb.collection('users').getList(1, 1, {
    filter: `tenantId = "${tenantId}" && tenantRole != "owner"`,
  });

  const posts = await pb.collection('posts').getList(1, 1, {
    filter: `tenantId = "${tenantId}"`,
  });

  return {
    tenantId,
    steps: {
      emailVerified: owner.emailVerified,
      brandingConfigured: !!(tenant.logoUrl || tenant.primaryColor),
      pulsepointConnected: !!tenant.pulsepointAgencyId,
      firstIncidentSynced: incidentCount.totalItems > 0,
      weatherConfigured: (tenant.weatherZones?.length || 0) > 0,
      socialConnected: socialAccounts.totalItems > 0,
      teamInvited: teamMembers.totalItems > 0,
      firstPostCreated: posts.totalItems > 0,
    },
    lastUpdated: new Date().toISOString(),
  };
}
```

### 7.2 Onboarding Emails

```typescript
// Email sequence after signup

const ONBOARDING_EMAILS = [
  {
    delay: 0, // Immediate
    template: 'welcome',
    subject: 'Welcome to Vanguard - Let\'s get started!',
    conditions: [], // Always send
  },
  {
    delay: 24 * 60 * 60 * 1000, // 24 hours
    template: 'setup-reminder',
    subject: 'Complete your Vanguard setup',
    conditions: ['!pulsepointConnected'],
  },
  {
    delay: 3 * 24 * 60 * 60 * 1000, // 3 days
    template: 'feature-highlight',
    subject: 'Did you know? Auto-post to Facebook',
    conditions: ['!socialConnected'],
  },
  {
    delay: 7 * 24 * 60 * 60 * 1000, // 7 days
    template: 'trial-midpoint',
    subject: 'Your trial is halfway done - here\'s what you\'re missing',
    conditions: ['tier=free', '!trialEnded'],
  },
  {
    delay: 12 * 24 * 60 * 60 * 1000, // 12 days
    template: 'trial-ending',
    subject: 'Your trial ends in 2 days',
    conditions: ['tier=free', '!trialEnded'],
  },
];
```

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Slug Already Exists

```typescript
// Error: Slug already in use
// Solution: Auto-append number or prompt for different slug

try {
  await createTenant({ slug: 'iredell' });
} catch (error) {
  if (error.code === 'SLUG_EXISTS') {
    const suggestions = await generateSlugSuggestions('iredell');
    // Returns: ['iredell-ems', 'iredell-county', 'iredell-alerts']
  }
}
```

#### Email Already Registered

```typescript
// Error: Email already registered
// Solution: Check if user is in different tenant, offer merge or new account

const existingUser = await findUserByEmail(email);
if (existingUser) {
  if (existingUser.tenantId) {
    // User already belongs to a tenant
    throw new Error('This email is already associated with another organization');
  } else {
    // Platform user, can be added to tenant
    await addUserToTenant(existingUser.id, tenantId);
  }
}
```

#### PulsePoint Connection Failed

```typescript
// Troubleshooting steps
const diagnostics = {
  agencyIdValid: await validateAgencyId(agencyId),
  apiKeyValid: await testApiKey(apiKey),
  networkReachable: await pingPulsePoint(),
  rateLimitOk: await checkRateLimit(tenantId),
};

if (!diagnostics.agencyIdValid) {
  return 'Invalid agency ID. Please check your PulsePoint configuration.';
}
if (!diagnostics.apiKeyValid) {
  return 'API key is invalid or expired. Please regenerate.';
}
// etc.
```

### 8.2 Support Escalation

```typescript
// When to escalate to platform admin

const ESCALATION_TRIGGERS = [
  'Multiple failed provisioning attempts',
  'PulsePoint agency not found in database',
  'Custom domain DNS issues',
  'Billing integration failures',
  'Enterprise tier requests',
];
```

---

## Appendix A: API Reference

### Create Tenant (Self-Service)

```http
POST /api/signup
Content-Type: application/json

{
  "organizationName": "Iredell County EMS",
  "adminEmail": "admin@iredell.gov",
  "adminName": "John Smith",
  "termsAccepted": true
}
```

### Create Tenant (Admin)

```http
POST /api/platform/tenants
Authorization: Bearer <platform_admin_token>
Content-Type: application/json

{
  "name": "Iredell County EMS",
  "slug": "iredell",
  "ownerEmail": "admin@iredell.gov",
  "ownerName": "John Smith",
  "tier": "professional",
  "skipTrial": true,
  "pulsepointAgencyId": "EMS1681",
  "weatherZones": ["NCZ036"]
}
```

### Verify Email

```http
POST /api/auth/verify
Content-Type: application/json

{
  "token": "<verification_token>"
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial provisioning guide |

---

*This document provides the complete guide for tenant provisioning in the Vanguard platform.*
