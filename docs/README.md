# Vanguard Documentation

> Multi-Tenant Emergency Incident Management Platform

---

## Documentation Index

### Project Overview

| Document | Description |
|----------|-------------|
| [ROADMAP.md](./ROADMAP.md) | Implementation roadmap with phases, tasks, and checklists |

### Architecture Documentation

| Document | Description |
|----------|-------------|
| [MULTI_TENANCY_ARCHITECTURE.md](./architecture/MULTI_TENANCY_ARCHITECTURE.md) | Master architecture document - isolation strategy, data model, security, scalability |
| [TENANT_DATA_MODEL.md](./architecture/TENANT_DATA_MODEL.md) | Complete PocketBase schema definitions with TypeScript interfaces |
| [TENANT_PROVISIONING.md](./architecture/TENANT_PROVISIONING.md) | Self-service and manual tenant onboarding workflows |
| [TENANT_SECURITY.md](./architecture/TENANT_SECURITY.md) | Security architecture - auth, authorization, data protection, audit |

---

## Quick Links

### Getting Started

1. **Local Development**
   ```bash
   # Start PocketBase
   docker compose up -d

   # Install dependencies
   npm install

   # Run dev server
   npm run dev
   ```

2. **Create First Admin**
   - Access PocketBase admin: http://localhost:8090/_/
   - Create user in `users` collection with `role: "platform_admin"`

3. **Create First Tenant**
   ```bash
   curl -X POST http://localhost:3000/api/tenant/create \
     -H "Content-Type: application/json" \
     -d '{"slug": "demo", "name": "Demo County"}'
   ```

### Key Concepts

- **Tenant**: An isolated organization (county, municipality) with its own data
- **Platform Admin**: Super-admin who manages all tenants
- **Tenant Admin**: Admin within a specific tenant
- **Tenant Isolation**: All data is scoped by `tenantId` - no cross-tenant access

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes, PocketBase |
| Auth | NextAuth.js with PocketBase adapter |
| Database | PocketBase (SQLite-based) |
| Email | Resend |
| Hosting | Vercel (frontend), Self-hosted PocketBase |

---

## Project Structure

```
vanguard/
├── app/                    # Next.js App Router
│   ├── tenant/[slug]/     # Tenant-scoped pages
│   └── platform/          # Platform admin pages
├── pages/api/             # API routes
├── services/              # Business logic
├── components/            # React components
├── docs/                  # Documentation
│   ├── architecture/      # Architecture docs
│   └── ROADMAP.md        # Implementation roadmap
└── pb_schema.json         # PocketBase schema
```

---

## Current Status

**Phase 0: Foundation** - In Progress

See [ROADMAP.md](./ROADMAP.md) for detailed implementation status.

### Completed

- [x] Services layer (config, tenant, rate limiting, auth, audit)
- [x] NextAuth integration with PocketBase adapter
- [x] Tenant CRUD API
- [x] Basic schema (tenants, users, social_accounts)

### In Progress

- [ ] Middleware for tenant context injection
- [ ] Extended schema (accounts, sessions)
- [ ] Platform admin UI

### Next Up

- [ ] Incident management (Phase 1)
- [ ] ICAW feature migration (Phase 2)

---

## Contributing

1. Check the [ROADMAP.md](./ROADMAP.md) for current phase and tasks
2. Review architecture docs before making changes
3. Follow existing code patterns in `services/`
4. Add tests for new functionality
5. Update documentation as needed

---

## Source Project

This platform is based on [ICAW (Iredell Calls & Weather Alerts)](~/Projects/icaw), transformed into a multi-tenant SaaS solution.

---

*Last Updated: January 2025*
