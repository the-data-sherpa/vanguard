# Production Checklist

> Items to address before deploying to production.
>
> Last updated: January 2026

---

## Security

### Convex Authentication
- [ ] **Configure Convex Auth provider** (Clerk, Auth0, or custom)
- [ ] **Build login/signup pages** with proper validation
- [ ] **Implement server-side authorization** on all mutations
  - `requireTenantAccess()` helper for tenant-scoped operations
  - Role validation for admin-only operations
- [ ] **Add input validation** on all user-facing mutations
  - NWS zone format validation implemented
  - Add validation for other external identifiers

### General Security
- [ ] Review all Convex mutations for proper authentication checks
- [ ] Add rate limiting via Convex action throttling
- [ ] Audit cross-tenant data isolation (tenantId scoping)
- [ ] Input validation with Convex validators on all mutations
- [ ] Ensure no sensitive data in client-visible query results

---

## Infrastructure

### Database (Convex Managed)
- [ ] Verify index definitions in `convex/schema.ts`
- [ ] Review query patterns for performance
- [ ] Set up Convex backup exports (if needed beyond built-in)

### Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Add application logging (Convex logs + external)
- [ ] Set up uptime monitoring
- [ ] Add performance monitoring (Convex dashboard + Vercel Analytics)
- [ ] Configure Convex action alerts for sync failures

---

## Code Quality

- [ ] Add unit tests for Convex functions (Vitest)
- [ ] Add E2E tests for critical flows (Playwright)
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Code coverage target: 80%+

---

## Documentation

- [ ] API documentation for Convex functions
- [ ] User guide
- [ ] Admin documentation
- [ ] Privacy policy
- [ ] Terms of service

---

## Convex-Specific Items

### Schema
- [ ] Verify all indexes are defined for common query patterns
- [ ] Review cascade delete behavior for tenant data

### Cron Jobs
- [ ] Verify cron schedules in `convex/crons.ts`
- [ ] Monitor cron execution in Convex dashboard
- [ ] Set up alerts for failed cron runs

### External Integrations
- [ ] PulsePoint sync - verify rate limiting
- [ ] NWS weather sync - verify zone validation
- [ ] Test error handling for external API failures

### Environment
- [ ] `CONVEX_DEPLOYMENT` properly set
- [ ] `NEXT_PUBLIC_CONVEX_URL` configured
- [ ] Any API keys stored in Convex environment variables

---

## Pre-Launch Verification

- [ ] Test tenant creation flow
- [ ] Test incident sync from PulsePoint
- [ ] Test weather alert sync from NWS
- [ ] Verify real-time updates work across multiple clients
- [ ] Load test with expected traffic patterns
- [ ] Security audit of tenant isolation
