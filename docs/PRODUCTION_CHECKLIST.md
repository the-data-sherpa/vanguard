# Production Checklist

> Items to address before deploying to production.
>
> Last updated: January 2026

---

## Security

### PocketBase Authentication
- [ ] **Configure proper API rules per collection** instead of using admin auth for everything
  - `system_config` - server-only, use API key header check
  - `rate_counters` - server-only, use API key header check
  - `incidents` - tenant-scoped rules (`tenantId = @request.headers.x_tenant_id`)
  - `weather_alerts` - tenant-scoped rules
  - `audit_logs` - server-only write, admin-only read
- [ ] **Create a service account** instead of using admin credentials
- [ ] **Remove admin credentials from env** once API rules are configured
- [ ] **Implement proper user auth flows** for client-side operations

### General Security
- [ ] Review all API routes for proper authentication
- [ ] Add CSRF protection
- [ ] Add Content Security Policy headers
- [ ] Input validation with Zod on all endpoints
- [ ] Rate limiting on public endpoints
- [ ] Audit cross-tenant data isolation

---

## Infrastructure

### Database
- [ ] Set up PocketBase backups
- [ ] Configure PocketBase for production (encryption key, etc.)
- [ ] Consider PostgreSQL migration if PocketBase scalability becomes an issue

### Caching
- [ ] Move rate limiting from PocketBase to Redis for production
- [ ] Implement query caching for frequently accessed data

### Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Add application logging (structured logs)
- [ ] Set up uptime monitoring
- [ ] Add performance monitoring (API response times)

---

## Code Quality

- [ ] Add unit tests for services
- [ ] Add E2E tests for critical flows
- [ ] Set up CI/CD pipeline
- [ ] Code coverage target: 80%+

---

## Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide
- [ ] Admin documentation
- [ ] Privacy policy
- [ ] Terms of service

---

## Notes

### 2026-01-17: PocketBase Admin Auth Workaround
Currently using `POCKETBASE_ADMIN_EMAIL` and `POCKETBASE_ADMIN_PASSWORD` for all server-side PocketBase operations. This is a temporary solution because collection API rules require superuser access by default.

**Files affected:**
- `lib/pocketbase.ts` - authenticates as admin on init
- `services/config.ts` - uses shared client
- `services/rateLimiter.ts` - uses shared client

**To fix properly:**
1. Go to PocketBase Admin UI (http://localhost:8090/_/)
2. For each collection, configure API rules appropriately
3. Remove admin auth from `lib/pocketbase.ts`
4. Use API key header or service token instead
