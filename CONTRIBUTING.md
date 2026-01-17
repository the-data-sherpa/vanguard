# Contributing to Vanguard

## Coding Standards

### TypeScript

- **Strict mode enabled** - `strict: true` in tsconfig.json
- **No implicit `any`** - Always provide explicit types
- **Explicit return types** - Define return types on functions, especially exported ones
- **Interfaces over inline types** - Create reusable interfaces in `/types`
- **Generics** - Use generics for reusable utilities and components

```typescript
// Good
interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export async function getTenant(id: string): Promise<Tenant | null> {
  // ...
}

// Avoid
export async function getTenant(id) {
  // ...
}
```

### Modular Architecture

| Directory | Purpose |
|-----------|---------|
| `/app` | Next.js App Router pages and layouts |
| `/components` | Reusable UI components (shadcn/ui + custom) |
| `/components/ui` | shadcn/ui primitives |
| `/hooks` | Custom React hooks |
| `/lib` | Utility functions, helpers |
| `/services` | Business logic, API integrations, data access |
| `/types` | Shared TypeScript interfaces and types |

### DRY (Don't Repeat Yourself)

- Extract common patterns into reusable functions
- Create custom hooks for shared stateful logic
- Use composition over duplication
- If you write similar code 3+ times, refactor it

### Component Guidelines

- **Single responsibility** - One component, one job
- **Props interface** - Define explicit props types
- **Composition** - Prefer composition over prop drilling
- **Colocation** - Keep related files together

```typescript
// components/tenant/TenantCard.tsx
interface TenantCardProps {
  tenant: Tenant;
  onSelect?: (tenant: Tenant) => void;
}

export function TenantCard({ tenant, onSelect }: TenantCardProps) {
  // ...
}
```

### Services Layer

- Services handle all business logic and data access
- Keep API routes thin - delegate to services
- Services should be testable in isolation
- Use dependency injection where practical

```typescript
// services/tenant.ts
export async function createTenant(slug: string, name: string): Promise<Tenant> {
  // All tenant creation logic here
}

// pages/api/tenant/[action].ts
// Thin handler that calls the service
const tenant = await createTenant(slug, name);
```

### Error Handling

- Use try/catch at service boundaries
- Return `null` or throw typed errors, not silent failures
- Log errors with context
- Provide user-friendly error messages in UI

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `TenantCard.tsx` |
| Files (utilities) | camelCase | `formatDate.ts` |
| Functions | camelCase | `getTenantBySlug()` |
| Interfaces/Types | PascalCase | `TenantStatus` |
| Constants | SCREAMING_SNAKE | `MAX_TENANTS` |
| CSS classes | kebab-case (Tailwind) | `bg-primary` |

### Git Commits

- Write clear, descriptive commit messages
- Use conventional commits format when applicable:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `docs:` documentation
  - `chore:` maintenance

## Tech Stack Reference

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: PocketBase
- **Auth**: NextAuth.js v4
- **Linting**: ESLint 9 (flat config)
