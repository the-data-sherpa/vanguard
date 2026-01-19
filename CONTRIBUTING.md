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
  _id: Id<"tenants">;
  slug: string;
  name: string;
}

export async function getTenant(slug: string): Promise<Tenant | null> {
  // ...
}

// Avoid
export async function getTenant(slug) {
  // ...
}
```

### Modular Architecture

| Directory | Purpose |
|-----------|---------|
| `/app` | Next.js App Router pages and layouts |
| `/components` | Reusable UI components (shadcn/ui + custom) |
| `/components/ui` | shadcn/ui primitives |
| `/convex` | Convex backend (queries, mutations, actions) |
| `/hooks` | Custom React hooks |
| `/lib` | Utility functions, helpers |
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

### Convex Backend

- **Queries** for reading data (automatically real-time)
- **Mutations** for writing data (transactional)
- **Actions** for external API calls (PulsePoint, NWS)
- Always scope queries by `tenantId` using indexes
- Use `requireTenantAccess()` for authorization on mutations

```typescript
// convex/incidents.ts
export const listActive = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("incidents")
      .withIndex("by_tenant_status", (q) =>
        q.eq("tenantId", tenantId).eq("status", "active")
      )
      .collect();
  },
});
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
- **Backend**: Convex (real-time BaaS)
- **Database**: Convex (managed)
- **Auth**: Clerk + Convex Auth
- **Linting**: ESLint 9 (flat config)
