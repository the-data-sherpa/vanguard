# Convex Backend for Vanguard

This directory contains a complete Convex backend scaffold for Vanguard. It demonstrates how to migrate from PocketBase to Convex for real-time, scalable multi-tenant incident management.

## Why Convex?

1. **Real-time by default** - All queries automatically update when data changes
2. **Built-in cron jobs** - No need for external services like Inngest
3. **TypeScript end-to-end** - Full type safety from database to UI
4. **Automatic scaling** - Handles concurrent tenants without configuration
5. **Simpler architecture** - One service instead of PocketBase + Redis + Inngest

## Quick Start

### 1. Install Convex

```bash
npm install convex
```

### 2. Initialize Convex

```bash
npx convex dev
```

This will:
- Create a Convex project
- Generate TypeScript types in `convex/_generated/`
- Start the development server
- Watch for changes

### 3. Add Environment Variable

Add to `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### 4. Wrap Your App with ConvexProvider

In `app/layout.tsx`:

```tsx
import { ConvexClientProvider } from "@/components/convex-example";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

### 5. Use Real-time Queries

```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function Dashboard({ tenantId }) {
  // This automatically updates when incidents change!
  const incidents = useQuery(api.incidents.listActive, { tenantId });

  return <IncidentList incidents={incidents} />;
}
```

## File Structure

```
convex/
├── schema.ts          # Database schema with indexes
├── tenants.ts         # Tenant queries & mutations
├── incidents.ts       # Incident queries & mutations
├── weather.ts         # Weather alert queries & mutations
├── sync.ts            # External API sync actions (PulsePoint, NWS)
├── crons.ts           # Scheduled background jobs
├── maintenance.ts     # Cleanup and archival jobs
└── README.md          # This file
```

## Schema Overview

### Tenants
- Multi-tenant configuration
- PulsePoint and weather zone settings
- Feature flags and limits
- Sync timestamps

### Incidents
- Real-time incident tracking
- Indexed by tenant, status, time, external ID
- Support for PulsePoint, user-submitted, and manual incidents
- Unit tracking with status history

### Weather Alerts
- NWS alert integration
- Severity/urgency/certainty tracking
- Auto-expiration

## Key Patterns

### Multi-Tenancy

All queries filter by `tenantId`:

```ts
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", q =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .collect();
  },
});
```

### Real-time Updates

No extra code needed! Just use `useQuery`:

```tsx
// This component re-renders automatically when incidents change
function IncidentCount({ tenantId }) {
  const incidents = useQuery(api.incidents.listActive, { tenantId });
  return <span>{incidents?.length ?? 0} active</span>;
}
```

### External API Calls

Use `action` for HTTP requests:

```ts
export const syncPulsePoint = action({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const response = await fetch("https://api.pulsepoint.org/...");
    const data = await response.json();

    // Call mutations to save data
    await ctx.runMutation(internal.incidents.batchUpsert, {
      tenantId,
      incidents: data,
    });
  },
});
```

### Scheduled Jobs

Define in `crons.ts`:

```ts
const crons = cronJobs();

crons.interval(
  "sync-incidents",
  { minutes: 1 },
  internal.sync.syncAllTenantIncidents
);
```

## Migration from PocketBase

### 1. Data Export

Export PocketBase data to JSON:

```bash
# In PocketBase admin, export collections to JSON
```

### 2. Import Script

Create a one-time migration script:

```ts
// scripts/migrate-to-convex.ts
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.CONVEX_URL!);

async function migrate() {
  const pbData = JSON.parse(fs.readFileSync("export.json", "utf-8"));

  for (const tenant of pbData.tenants) {
    await client.mutation(api.tenants.create, {
      slug: tenant.slug,
      name: tenant.name,
      tier: tenant.tier,
    });
  }
  // ... migrate other collections
}
```

### 3. Update Services

Replace PocketBase calls:

```ts
// Before (PocketBase)
const incidents = await pb.collection("incidents")
  .getList(1, 50, { filter: `tenantId="${tenantId}"` });

// After (Convex)
const incidents = useQuery(api.incidents.list, { tenantId, limit: 50 });
```

## Comparison: PocketBase vs Convex

| Feature | PocketBase | Convex |
|---------|------------|--------|
| Real-time | Manual WebSocket setup | Automatic |
| Background jobs | External service needed | Built-in crons |
| Type safety | Generated, separate step | End-to-end automatic |
| Scaling | Single instance | Automatic |
| Multi-tenancy | RLS rules | Code-based filtering |
| External APIs | In API routes | Actions with retries |

## Cost Estimate

| Tenants | Convex Plan | Est. Monthly |
|---------|-------------|--------------|
| 1-50 | Free | $0 |
| 50-200 | Pro | $25 |
| 200-1000 | Pro + usage | $50-150 |
| 1000+ | Enterprise | Custom |

## Next Steps

1. Run `npx convex dev` to start development
2. Test with the example dashboard component
3. Migrate one tenant as a pilot
4. Gradually migrate all tenants
5. Remove PocketBase dependency

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex + Next.js Guide](https://docs.convex.dev/quickstart/nextjs)
- [Real-time Best Practices](https://docs.convex.dev/production/best-practices)
