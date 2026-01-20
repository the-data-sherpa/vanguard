# Vanguard Documentation

> Multi-Tenant Emergency Incident Management Platform

---

## Overview

Vanguard is a SaaS platform that enables counties, municipalities, and emergency services organizations to deploy their own real-time emergency incident tracking system. Each tenant gets an isolated environment with:

- Real-time incident feeds from PulsePoint
- Weather alerts from the National Weather Service
- Dashboard with live statistics
- Configurable settings and integrations

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js (App Router) | 16.1.x |
| UI Components | shadcn/ui + Radix | Latest |
| Styling | Tailwind CSS | 4.1.x |
| Backend | Convex | 1.31.x |
| Database | Convex (managed) | - |
| Authentication | Convex Auth | - |
| Language | TypeScript | 5.7.x |
| Runtime | React | 19.2.x |

---

## Project Structure

```
vanguard/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── tenant/[slug]/            # Tenant-specific routes
│   │   ├── page.tsx              # Dashboard
│   │   ├── incidents/            # Incidents list
│   │   ├── weather/              # Weather alerts
│   │   └── settings/             # Tenant settings
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── dashboard/                # Dashboard widgets
│   ├── incidents/                # Incident display
│   ├── weather/                  # Weather alerts
│   └── ui/                       # shadcn/ui primitives
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── tenants.ts                # Tenant queries/mutations
│   ├── incidents.ts              # Incident operations
│   ├── weather.ts                # Weather operations
│   ├── sync.ts                   # External API sync
│   ├── scheduler.ts              # Cron job orchestration
│   ├── maintenance.ts            # Cleanup tasks
│   └── crons.ts                  # Scheduled jobs
├── lib/                          # Shared utilities
├── docs/                         # Documentation
│   ├── README.md                 # This file
│   ├── DEVELOPMENT_PLAN.md       # Building block roadmap
│   ├── PRODUCTION_CHECKLIST.md   # Launch checklist
│   └── architecture/             # Architecture docs
└── public/                       # Static assets
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Convex account (free tier available)

### Local Development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd vanguard
   npm install
   ```

2. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will prompt you to create a Convex project if you haven't already.

3. **Start the dev server**
   ```bash
   npm run dev
   ```

4. **Open the app**
   - Landing page: http://localhost:3000
   - Tenant dashboard: http://localhost:3000/tenant/[slug]

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run convex:dev` | Start Convex development server |
| `npm run convex:deploy` | Deploy Convex functions to production |

---

## Architecture

### Multi-Tenancy

- **Slug-based routing**: Each tenant accessed via `/tenant/[slug]`
- **Data isolation**: All database queries scoped by `tenantId`
- **Role hierarchy**: member → moderator → admin → owner
- **Feature flags**: Per-tenant feature toggles

### Real-Time Data

Convex provides automatic real-time subscriptions:
- Dashboard stats update instantly when incidents change
- Incident lists refresh automatically
- Weather alerts appear as soon as they're synced
- No polling required

### External Integrations

| Service | Purpose | Sync Interval |
|---------|---------|---------------|
| PulsePoint | Incident data | Every 2 minutes |
| NWS API | Weather alerts | Every 2 minutes |

### Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Master sync | Every 2 min | Sync incidents + weather |
| Maintenance | Every 15 min | Close stale incidents |
| Daily cleanup | 6:00 AM UTC | Archive old data |

---

## Database Schema

Key tables in `convex/schema.ts`:

| Table | Purpose |
|-------|---------|
| `tenants` | Tenant configuration, features, limits |
| `incidents` | Emergency incidents with status tracking |
| `incidentGroups` | Merged incident groupings |
| `weatherAlerts` | NWS weather alerts |
| `users` | User accounts with tenant roles |
| `auditLogs` | Compliance audit trail |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | Building block roadmap and feature status |
| [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) | Pre-launch checklist |
| [architecture/](./architecture/) | Detailed architecture documentation |

---

## Environment Variables

Create a `.env.local` file with:

```bash
# Convex (auto-configured by `npx convex dev`)
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# Optional: External APIs
PULSEPOINT_API_KEY=
NWS_USER_AGENT=

# Optional: Auth provider (when configured)
# AUTH_SECRET=
```

---

## Contributing

1. Create a feature branch from `dev`
2. Make changes with clear commit messages
3. Run `npm run lint` and `npm run build`
4. Submit a pull request to `dev`

---

## License

Proprietary - All rights reserved
