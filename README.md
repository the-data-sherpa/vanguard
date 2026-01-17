# Vanguard

Multi-tenant emergency incident management platform. Evolved from ICAW (Iredell Calls & Weather Alerts) into a SaaS platform enabling counties, municipalities, and emergency services organizations to deploy isolated incident management systems.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Local Development Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd vanguard
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set at minimum:
   ```
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   ```

3. **Start the database services**

   ```bash
   npm run db:start
   ```

   This starts PocketBase (port 8090) and Redis (port 6379).

4. **Initialize the database schema**

   ```bash
   npm run db:setup
   ```

5. **Create a test tenant**

   ```bash
   npm run db:init
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Accessing the App

- **Home**: http://localhost:3000
- **Tenant Dashboard**: http://localhost:3000/tenant/{slug}
- **PocketBase Admin**: http://localhost:8090/_/

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:start` | Start Docker services (PocketBase, Redis) |
| `npm run db:stop` | Stop Docker services |
| `npm run db:logs` | View PocketBase logs |
| `npm run db:setup` | Initialize database schema |
| `npm run db:init` | Create initial tenant data |

## Project Structure

```
vanguard/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (App Router)
│   ├── tenant/[slug]/     # Tenant-scoped pages
│   └── platform/          # Platform admin pages
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   ├── incidents/        # Incident-related components
│   └── weather/          # Weather alert components
├── services/             # Business logic layer
├── lib/                  # Utilities and helpers
├── pages/api/            # API routes (Pages Router, for NextAuth)
├── docs/                 # Architecture documentation
└── scripts/              # Development scripts
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | PocketBase |
| Auth | NextAuth.js v4 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix |
| Email | Resend |

## Multi-Tenancy

Vanguard uses URL-based tenant isolation:

- Tenant pages: `/tenant/{slug}/*`
- Tenant APIs: `/api/tenant/{slug}/*`

The middleware (`middleware.ts`) extracts the tenant slug, validates the tenant, and injects context headers for downstream use.

## Documentation

- [Architecture Overview](docs/architecture/MULTI_TENANCY_ARCHITECTURE.md)
- [Data Model](docs/architecture/TENANT_DATA_MODEL.md)
- [Security](docs/architecture/TENANT_SECURITY.md)
- [Roadmap](docs/ROADMAP.md)

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

### Required for Development

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | Secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Base URL (default: http://localhost:3000) |
| `POCKETBASE_URL` | PocketBase URL (default: http://localhost:8090) |

### Optional

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | For email magic link authentication |
| `FACEBOOK_APP_ID` | For Facebook OAuth |
| `NWS_USER_AGENT` | For National Weather Service API |

## License

Private - All rights reserved.
