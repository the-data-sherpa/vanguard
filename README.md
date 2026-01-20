# Vanguard

Multi-tenant emergency incident management platform. Evolved from ICAW (Iredell Calls & Weather Alerts) into a SaaS platform enabling counties, municipalities, and emergency services organizations to deploy isolated incident management systems.

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Convex account (free tier available)

### Local Development Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd vanguard
   npm install
   ```

2. **Set up Convex**

   ```bash
   npx convex dev
   ```

   This will prompt you to create a Convex project if you haven't already.

3. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Accessing the App

- **Home**: http://localhost:3000
- **Tenant Dashboard**: http://localhost:3000/tenant/{slug}
- **Convex Dashboard**: https://dashboard.convex.dev

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start Convex development server |
| `npx convex deploy` | Deploy Convex functions to production |

## Project Structure

```
vanguard/
├── app/                    # Next.js App Router pages
│   ├── tenant/[slug]/      # Tenant-scoped pages
│   └── layout.tsx          # Root layout with ConvexProvider
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── dashboard/          # Dashboard widgets
│   ├── incidents/          # Incident-related components
│   └── weather/            # Weather alert components
├── convex/                 # Convex backend
│   ├── schema.ts           # Database schema
│   ├── tenants.ts          # Tenant queries/mutations
│   ├── incidents.ts        # Incident operations
│   ├── weather.ts          # Weather operations
│   ├── sync.ts             # External API sync
│   └── crons.ts            # Scheduled jobs
├── lib/                    # Utilities and helpers
├── docs/                   # Architecture documentation
└── public/                 # Static assets
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Backend | Convex (real-time BaaS) |
| Database | Convex (managed) |
| Auth | Convex Auth (pending configuration) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix |

## Multi-Tenancy

Vanguard uses URL-based tenant isolation:

- Tenant pages: `/tenant/{slug}/*`
- All data scoped by `tenantId` at the database layer
- Real-time subscriptions automatically filtered by tenant

## Documentation

- [Development Plan](docs/DEVELOPMENT_PLAN.md)
- [Architecture Overview](docs/architecture/MULTI_TENANCY_ARCHITECTURE.md)
- [Data Model](docs/architecture/TENANT_DATA_MODEL.md)
- [Security](docs/architecture/TENANT_SECURITY.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)

## Environment Variables

Create a `.env.local` file:

```bash
# Convex (auto-configured by `npx convex dev`)
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

See [.env.example](.env.example) for all available configuration options.

## License

Private - All rights reserved.
