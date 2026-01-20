# Tenant Provisioning Guide

> Guide to creating and configuring tenants
>
> Version: 2.0.0
> Last Updated: January 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Provisioning Methods](#2-provisioning-methods)
3. [Tenant Configuration](#3-tenant-configuration)
4. [Integration Setup](#4-integration-setup)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Overview

### 1.1 Provisioning Methods

| Method | Use Case | Implementation Status |
|--------|----------|----------------------|
| **Manual (Database)** | Initial setup, testing | Available |
| **Admin UI** | Platform admin creates tenants | Planned (Phase 4) |
| **Self-Service** | User signup flow | Planned (Phase 1) |

### 1.2 Provisioning Components

```
Tenant Provisioning
├── Tenant Record Creation
├── Default Configuration
├── Feature Flags Setup
├── Integration Configuration (PulsePoint, Weather)
└── Owner User Account (when auth is implemented)
```

---

## 2. Provisioning Methods

### 2.1 Manual Database Creation

Currently, tenants are created directly in Convex. This can be done via the Convex dashboard or a seed script.

```typescript
// Example: Create tenant via Convex mutation
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createTenant = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
    pulsepointAgencyId: v.optional(v.string()),
    weatherZones: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error("Tenant slug already exists");
    }

    // Create tenant
    const tenantId = await ctx.db.insert("tenants", {
      slug: args.slug,
      name: args.name,
      displayName: args.displayName || args.name,
      status: "active",
      tier: "free",
      pulsepointAgencyId: args.pulsepointAgencyId,
      weatherZones: args.weatherZones || [],
      features: {
        pulsepoint: !!args.pulsepointAgencyId,
        weather: (args.weatherZones?.length || 0) > 0,
        userSubmissions: false,
      },
      limits: {
        maxUsers: 5,
        maxIncidentsPerMonth: 1000,
      },
    });

    return tenantId;
  },
});
```

### 2.2 Convex Dashboard

1. Open the Convex dashboard for your project
2. Navigate to the "Data" tab
3. Select the "tenants" table
4. Click "Add Document"
5. Fill in required fields

### 2.3 Seed Script

For development/testing, use a seed script:

```typescript
// convex/seed.ts
import { mutation } from "./_generated/server";

export const seedTestTenant = mutation({
  handler: async (ctx) => {
    // Check if test tenant exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", "test"))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create test tenant
    return await ctx.db.insert("tenants", {
      slug: "test",
      name: "Test County",
      displayName: "Test County Emergency Services",
      status: "active",
      tier: "professional",
      pulsepointAgencyId: "EMS1234",
      weatherZones: ["NCZ001", "NCZ002"],
      features: {
        pulsepoint: true,
        weather: true,
        userSubmissions: false,
      },
      limits: {
        maxUsers: 100,
        maxIncidentsPerMonth: 10000,
      },
    });
  },
});
```

---

## 3. Tenant Configuration

### 3.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | URL-safe identifier, lowercase alphanumeric with hyphens |
| `name` | string | Official organization name |
| `status` | enum | "pending", "active", "suspended", "deactivated" |
| `tier` | enum | "free", "starter", "professional", "enterprise" |

### 3.2 Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `displayName` | string | Display name (if different from name) |
| `pulsepointAgencyId` | string | PulsePoint agency identifier |
| `weatherZones` | string[] | NWS zone codes (e.g., "NCZ036") |
| `unitLegend` | object[] | Unit display name mappings |

### 3.3 Default Features by Tier

```typescript
const TIER_FEATURES = {
  free: {
    pulsepoint: true,
    weather: true,
    userSubmissions: false,
  },
  starter: {
    pulsepoint: true,
    weather: true,
    userSubmissions: true,
  },
  professional: {
    pulsepoint: true,
    weather: true,
    userSubmissions: true,
  },
  enterprise: {
    pulsepoint: true,
    weather: true,
    userSubmissions: true,
  },
};
```

### 3.4 Default Limits by Tier

```typescript
const TIER_LIMITS = {
  free: {
    maxUsers: 5,
    maxIncidentsPerMonth: 100,
  },
  starter: {
    maxUsers: 25,
    maxIncidentsPerMonth: 1000,
  },
  professional: {
    maxUsers: 100,
    maxIncidentsPerMonth: 10000,
  },
  enterprise: {
    maxUsers: -1, // Unlimited
    maxIncidentsPerMonth: -1,
  },
};
```

---

## 4. Integration Setup

### 4.1 PulsePoint Configuration

To enable PulsePoint sync for a tenant:

1. Obtain the PulsePoint agency ID
2. Update the tenant record:

```typescript
export const updatePulsepointConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    agencyId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId, "admin");

    await ctx.db.patch(args.tenantId, {
      pulsepointAgencyId: args.agencyId,
    });
  },
});
```

3. The cron job will automatically start syncing incidents

### 4.2 Weather Zones Configuration

To enable weather alerts:

1. Look up NWS zone codes for the area
   - Format: `[STATE][C/Z][NUMBER]` (e.g., NCZ036)
   - C = County, Z = Zone

2. Update the tenant with validated zones:

```typescript
const NWS_ZONE_PATTERN = /^[A-Z]{2}[CZ]\d{3}$/;

export const updateWeatherZones = mutation({
  args: {
    tenantId: v.id("tenants"),
    zones: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId, "admin");

    // Validate zone format
    const invalidZones = args.zones.filter(
      (z) => !NWS_ZONE_PATTERN.test(z)
    );
    if (invalidZones.length > 0) {
      throw new Error(
        `Invalid NWS zone format: ${invalidZones.join(", ")}. ` +
        `Expected format: [STATE][C/Z][NUMBER] (e.g., NCZ036)`
      );
    }

    await ctx.db.patch(args.tenantId, {
      weatherZones: args.zones,
    });
  },
});
```

### 4.3 Unit Legend Configuration

To customize unit display names:

```typescript
export const updateUnitLegend = mutation({
  args: {
    tenantId: v.id("tenants"),
    legend: v.array(v.object({
      pattern: v.string(),
      label: v.string(),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId, "admin");

    await ctx.db.patch(args.tenantId, {
      unitLegend: args.legend,
    });
  },
});
```

Example legend:

```json
[
  { "pattern": "E\\d+", "label": "Engine", "description": "Fire Engine" },
  { "pattern": "L\\d+", "label": "Ladder", "description": "Ladder Truck" },
  { "pattern": "M\\d+", "label": "Medic", "description": "EMS Unit" },
  { "pattern": "BC\\d+", "label": "Battalion Chief" }
]
```

---

## 5. Troubleshooting

### 5.1 Common Issues

#### Slug Already Exists

```
Error: Tenant slug already exists
```

**Solution**: Choose a different slug. Slugs must be unique across all tenants.

#### Invalid NWS Zone Format

```
Error: Invalid NWS zone format: ABC123
```

**Solution**: Use correct format `[STATE][C/Z][NUMBER]`:
- `NCZ036` - North Carolina Zone 036
- `TXC123` - Texas County 123

#### PulsePoint Not Syncing

1. Verify `pulsepointAgencyId` is set correctly
2. Check Convex logs for sync errors
3. Verify the agency ID is valid

#### Weather Not Syncing

1. Verify `weatherZones` array is not empty
2. Verify zone codes are valid
3. Check Convex logs for sync errors

### 5.2 Verification Queries

Check tenant configuration:

```typescript
// Get tenant by slug
const tenant = await ctx.db
  .query("tenants")
  .withIndex("by_slug", (q) => q.eq("slug", "iredell"))
  .first();

// Check if PulsePoint is configured
console.log("PulsePoint:", tenant?.pulsepointAgencyId || "Not configured");

// Check weather zones
console.log("Weather zones:", tenant?.weatherZones?.join(", ") || "None");
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial guide (PocketBase) |
| 2.0.0 | January 2026 | Rewritten for Convex |

---

*This document provides the provisioning guide for the Vanguard platform.*
