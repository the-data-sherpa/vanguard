# Tenant Security Architecture

> Security measures for tenant isolation and data protection
>
> Version: 1.0.0
> Last Updated: January 2025

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Tenant Isolation](#2-tenant-isolation)
3. [Authentication Security](#3-authentication-security)
4. [Authorization & Access Control](#4-authorization--access-control)
5. [Data Protection](#5-data-protection)
6. [API Security](#6-api-security)
7. [Audit & Compliance](#7-audit--compliance)
8. [Incident Response](#8-incident-response)
9. [Security Checklist](#9-security-checklist)

---

## 1. Security Principles

### 1.1 Core Security Tenets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY PRINCIPLES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DEFENSE IN DEPTH                                                         │
│     Multiple layers of security controls                                     │
│     No single point of failure                                               │
│                                                                              │
│  2. LEAST PRIVILEGE                                                          │
│     Minimum necessary permissions                                            │
│     Role-based access control                                                │
│                                                                              │
│  3. ZERO TRUST                                                               │
│     Verify every request                                                     │
│     Never assume trust based on network location                             │
│                                                                              │
│  4. FAIL SECURE                                                              │
│     Deny access on error                                                     │
│     Log security failures                                                    │
│                                                                              │
│  5. SEPARATION OF CONCERNS                                                   │
│     Tenant data isolation                                                    │
│     Platform vs tenant boundaries                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Cross-tenant data access | Critical | Row-level isolation, query enforcement |
| Authentication bypass | Critical | Multi-factor auth, session validation |
| Privilege escalation | High | Role validation, permission checks |
| Data exfiltration | High | Encryption, access logging |
| Injection attacks | High | Input validation, parameterized queries |
| Session hijacking | Medium | Secure cookies, token rotation |
| Denial of service | Medium | Rate limiting, resource quotas |
| Social engineering | Medium | User education, verification flows |

---

## 2. Tenant Isolation

### 2.1 Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ISOLATION LAYERS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Layer 1: URL/Route Level
┌─────────────────────────────────────────────────────────────────────────────┐
│  Request: GET /tenant/iredell/incidents                                      │
│                    └─────────────────┘                                       │
│                    Tenant slug extracted from URL                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 2: Middleware Validation
┌─────────────────────────────────────────────────────────────────────────────┐
│  - Validate tenant exists                                                    │
│  - Check tenant status (active, not suspended)                               │
│  - Inject tenantId into request context                                      │
│  - Verify user belongs to tenant                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 3: Service Layer Enforcement
┌─────────────────────────────────────────────────────────────────────────────┐
│  - All service methods require tenantId                                      │
│  - Query builders automatically scope to tenant                              │
│  - Cross-tenant operations explicitly blocked                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
Layer 4: Database Query Scoping
┌─────────────────────────────────────────────────────────────────────────────┐
│  SELECT * FROM incidents WHERE tenantId = ? AND status = 'active'           │
│                                └─────┘                                       │
│                                Always included                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Middleware Implementation

```typescript
// app/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip non-tenant routes
  if (!path.startsWith('/tenant/') && !path.startsWith('/api/tenant/')) {
    return NextResponse.next();
  }

  // Extract tenant slug
  const slugMatch = path.match(/^\/(?:api\/)?tenant\/([^\/]+)/);
  if (!slugMatch) {
    return new NextResponse('Invalid tenant path', { status: 400 });
  }

  const slug = slugMatch[1];

  // Validate tenant exists and is active
  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return new NextResponse('Tenant not found', { status: 404 });
  }

  if (tenant.status !== 'active') {
    return new NextResponse(
      JSON.stringify({
        error: 'TENANT_INACTIVE',
        message: getTenantStatusMessage(tenant.status),
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // For authenticated routes, verify user belongs to tenant
  const token = await getToken({ req: request });
  if (token) {
    if (token.tenantId && token.tenantId !== tenant.id) {
      // User trying to access different tenant
      return new NextResponse('Access denied: wrong tenant', { status: 403 });
    }
  }

  // Inject tenant context
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenant.id);
  headers.set('x-tenant-slug', tenant.slug);
  headers.set('x-tenant-tier', tenant.tier);
  headers.set('x-tenant-features', JSON.stringify(tenant.features));

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ['/tenant/:path*', '/api/tenant/:path*'],
};
```

### 2.3 Service Layer Enforcement

```typescript
// lib/tenant-context.ts

export class TenantContext {
  constructor(
    public readonly tenantId: string,
    public readonly tenantSlug: string,
    public readonly features: TenantFeatures
  ) {
    if (!tenantId) {
      throw new SecurityError('Tenant context required');
    }
  }

  static fromRequest(request: Request): TenantContext {
    const tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    const features = JSON.parse(request.headers.get('x-tenant-features') || '{}');

    if (!tenantId) {
      throw new SecurityError('Missing tenant context');
    }

    return new TenantContext(tenantId, tenantSlug, features);
  }
}

// Base service with tenant enforcement
export abstract class TenantScopedService {
  protected readonly tenantId: string;

  constructor(tenantId: string) {
    if (!tenantId) {
      throw new SecurityError('tenantId is required for all operations');
    }
    this.tenantId = tenantId;
  }

  protected buildFilter(additionalFilters: string = ''): string {
    // ALWAYS include tenantId in filter
    const baseFilter = `tenantId = "${this.tenantId}"`;
    return additionalFilters ? `${baseFilter} && ${additionalFilters}` : baseFilter;
  }
}

// Example: Incident service
export class IncidentService extends TenantScopedService {
  async getIncidents(options: GetIncidentsOptions = {}): Promise<Incident[]> {
    const filter = this.buildFilter(
      options.status ? `status = "${options.status}"` : ''
    );

    return pb.collection('incidents').getList(1, options.limit || 50, {
      filter,
      sort: '-callReceivedTime',
    });
  }

  async createIncident(data: CreateIncidentInput): Promise<Incident> {
    // Enforce tenantId on create
    return pb.collection('incidents').create({
      ...data,
      tenantId: this.tenantId, // Always use service's tenantId
    });
  }

  async updateIncident(id: string, data: UpdateIncidentInput): Promise<Incident> {
    // First verify the incident belongs to this tenant
    const incident = await this.getIncidentById(id);
    if (!incident) {
      throw new NotFoundError('Incident not found');
    }

    // Update (tenantId cannot be changed)
    const { tenantId: _, ...updateData } = data;
    return pb.collection('incidents').update(id, updateData);
  }

  private async getIncidentById(id: string): Promise<Incident | null> {
    try {
      const incident = await pb.collection('incidents').getOne(id);
      // Verify tenant ownership
      if (incident.tenantId !== this.tenantId) {
        return null; // Don't reveal existence to other tenants
      }
      return incident;
    } catch {
      return null;
    }
  }
}
```

### 2.4 Cross-Tenant Access Prevention

```typescript
// lib/security.ts

export class CrossTenantAccessError extends Error {
  constructor(message: string = 'Cross-tenant access denied') {
    super(message);
    this.name = 'CrossTenantAccessError';
  }
}

// Utility to verify ownership
export async function verifyTenantOwnership(
  collection: string,
  recordId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const record = await pb.collection(collection).getOne(recordId);
    return record.tenantId === tenantId;
  } catch {
    return false;
  }
}

// Decorator for tenant-scoped methods
export function requireTenantOwnership(collection: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: TenantScopedService, id: string, ...args: any[]) {
      const owns = await verifyTenantOwnership(collection, id, this.tenantId);
      if (!owns) {
        throw new CrossTenantAccessError();
      }
      return originalMethod.apply(this, [id, ...args]);
    };

    return descriptor;
  };
}

// Usage
class MediaService extends TenantScopedService {
  @requireTenantOwnership('media')
  async deleteMedia(id: string): Promise<void> {
    await pb.collection('media').delete(id);
  }
}
```

---

## 3. Authentication Security

### 3.1 Session Management

```typescript
// lib/auth/session.ts

export const SESSION_CONFIG = {
  // Session duration
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60,   // Refresh every hour

  // Cookie settings
  cookie: {
    name: 'vanguard.session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },

  // JWT settings
  jwt: {
    maxAge: 24 * 60 * 60,
  },
};

// Session token structure
interface SessionToken {
  sub: string;          // User ID
  email: string;
  name?: string;
  tenantId?: string;    // Associated tenant
  tenantSlug?: string;
  role: UserRole;
  tenantRole?: TenantRole;
  iat: number;          // Issued at
  exp: number;          // Expiration
  jti: string;          // Unique token ID
}
```

### 3.2 Token Validation

```typescript
// lib/auth/validate.ts

export async function validateSession(request: Request): Promise<Session | null> {
  const token = await getToken({ req: request });
  if (!token) return null;

  // Check token expiration
  if (token.exp && Date.now() >= token.exp * 1000) {
    return null;
  }

  // Check if user still exists and is active
  const user = await pb.collection('users').getOne(token.sub).catch(() => null);
  if (!user || !user.isActive || user.isBanned) {
    return null;
  }

  // Check if tenant is still active (if user has tenant)
  if (token.tenantId) {
    const tenant = await pb.collection('tenants').getOne(token.tenantId).catch(() => null);
    if (!tenant || tenant.status !== 'active') {
      return null;
    }
  }

  return {
    userId: token.sub,
    email: token.email,
    name: token.name,
    tenantId: token.tenantId,
    tenantSlug: token.tenantSlug,
    role: token.role,
    tenantRole: token.tenantRole,
  };
}
```

### 3.3 Password Security

```typescript
// lib/auth/password.ts

import { hash, verify } from 'argon2';

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  maxLength: 128,
};

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);

  return hash(password, {
    type: 2,        // argon2id
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return verify(hashedPassword, password);
}

export function validatePasswordStrength(password: string): void {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain a number');
  }

  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain a special character');
  }

  if (errors.length > 0) {
    throw new ValidationError('Password does not meet requirements', errors);
  }
}
```

### 3.4 Rate Limiting for Auth

```typescript
// lib/auth/rate-limit.ts

export const AUTH_RATE_LIMITS = {
  login: {
    window: 15 * 60 * 1000,  // 15 minutes
    max: 5,                   // 5 attempts
    blockDuration: 30 * 60 * 1000, // 30 minute block
  },
  passwordReset: {
    window: 60 * 60 * 1000,  // 1 hour
    max: 3,                   // 3 requests
    blockDuration: 60 * 60 * 1000, // 1 hour block
  },
  emailVerification: {
    window: 60 * 60 * 1000,  // 1 hour
    max: 5,                   // 5 requests
  },
};

export async function checkAuthRateLimit(
  type: keyof typeof AUTH_RATE_LIMITS,
  identifier: string // IP or email
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = AUTH_RATE_LIMITS[type];
  const key = `auth:${type}:${identifier}`;

  const attempts = await redis.get(key);
  const blocked = await redis.get(`${key}:blocked`);

  if (blocked) {
    const ttl = await redis.ttl(`${key}:blocked`);
    return { allowed: false, retryAfter: ttl };
  }

  if (attempts && parseInt(attempts) >= config.max) {
    // Block the identifier
    await redis.setex(`${key}:blocked`, config.blockDuration / 1000, '1');
    return { allowed: false, retryAfter: config.blockDuration / 1000 };
  }

  // Increment attempts
  await redis.incr(key);
  await redis.expire(key, config.window / 1000);

  return { allowed: true };
}
```

---

## 4. Authorization & Access Control

### 4.1 Permission System

```typescript
// lib/auth/permissions.ts

export const PERMISSIONS = {
  // Incident permissions
  'incidents:read': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'incidents:create': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'incidents:update': ['moderator', 'admin', 'owner'],
  'incidents:delete': ['admin', 'owner'],
  'incidents:moderate': ['moderator', 'admin', 'owner'],

  // Post permissions
  'posts:read': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'posts:create': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'posts:update:own': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'posts:update:any': ['moderator', 'admin', 'owner'],
  'posts:delete:own': ['user', 'contributor', 'moderator', 'admin', 'owner'],
  'posts:delete:any': ['moderator', 'admin', 'owner'],

  // User management
  'users:read': ['moderator', 'admin', 'owner'],
  'users:invite': ['admin', 'owner'],
  'users:update:role': ['admin', 'owner'],
  'users:ban': ['moderator', 'admin', 'owner'],
  'users:delete': ['owner'],

  // Tenant settings
  'tenant:read': ['member', 'moderator', 'admin', 'owner'],
  'tenant:update:branding': ['admin', 'owner'],
  'tenant:update:integrations': ['admin', 'owner'],
  'tenant:update:billing': ['owner'],
  'tenant:delete': ['owner'],

  // Platform (only platform_admin)
  'platform:tenants:read': [],
  'platform:tenants:create': [],
  'platform:tenants:update': [],
  'platform:tenants:delete': [],
  'platform:config': [],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(
  session: Session,
  permission: Permission
): boolean {
  // Platform admins have all permissions
  if (session.role === 'platform_admin') {
    return true;
  }

  // Check if permission is platform-only
  if (permission.startsWith('platform:')) {
    return false;
  }

  // Check tenant role
  const allowedRoles = PERMISSIONS[permission];
  if (session.tenantRole && allowedRoles.includes(session.tenantRole)) {
    return true;
  }

  return false;
}

// Middleware helper
export function requirePermission(permission: Permission) {
  return async (request: Request): Promise<Session> => {
    const session = await validateSession(request);
    if (!session) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!hasPermission(session, permission)) {
      await audit.log('permission:denied', {
        userId: session.userId,
        tenantId: session.tenantId,
        permission,
        ip: getClientIP(request),
      });
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }

    return session;
  };
}
```

### 4.2 Resource-Level Authorization

```typescript
// lib/auth/resource-auth.ts

export async function canAccessResource(
  session: Session,
  resource: { collection: string; id: string; tenantId?: string; authorId?: string }
): Promise<boolean> {
  // Platform admins can access everything
  if (session.role === 'platform_admin') {
    return true;
  }

  // Check tenant membership
  if (resource.tenantId && resource.tenantId !== session.tenantId) {
    return false;
  }

  // Check ownership for user-created resources
  if (resource.authorId && resource.authorId === session.userId) {
    return true;
  }

  // Check role-based access
  const permission = `${resource.collection}:read` as Permission;
  return hasPermission(session, permission);
}

export async function canModifyResource(
  session: Session,
  resource: { collection: string; id: string; tenantId?: string; authorId?: string },
  action: 'update' | 'delete'
): Promise<boolean> {
  // Platform admins can modify everything
  if (session.role === 'platform_admin') {
    return true;
  }

  // Check tenant membership
  if (resource.tenantId && resource.tenantId !== session.tenantId) {
    return false;
  }

  // Check if user owns the resource
  const isOwner = resource.authorId === session.userId;

  // Try own permission first
  const ownPermission = `${resource.collection}:${action}:own` as Permission;
  if (isOwner && hasPermission(session, ownPermission)) {
    return true;
  }

  // Try any permission
  const anyPermission = `${resource.collection}:${action}:any` as Permission;
  return hasPermission(session, anyPermission);
}
```

---

## 5. Data Protection

### 5.1 Encryption at Rest

```typescript
// lib/crypto.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Sensitive fields to encrypt
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  social_accounts: ['accessToken', 'refreshToken'],
  tenants: ['pulsepointConfig.apiKey'],
  system_config: ['oauth.google.clientSecret', 'oauth.facebook.appSecret'],
};
```

### 5.2 Data Sanitization

```typescript
// lib/sanitize.ts

import DOMPurify from 'isomorphic-dompurify';

// Remove PII from logs
export function sanitizeForLogging(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'ssn',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Sanitize user input
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Sanitize for database storage
export function sanitizeForDB(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}
```

### 5.3 PII Handling

```typescript
// lib/pii.ts

// Fields containing PII
export const PII_FIELDS = {
  users: ['email', 'name', 'avatarUrl', 'bio', 'lastLoginIp'],
  incidents: ['fullAddress'],
  audit_logs: ['ipAddress', 'userAgent'],
};

// Mask PII for display
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

export function maskIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6
    return ip.split(':').slice(0, 4).join(':') + ':****:****:****:****';
  }
  // IPv4
  return ip.split('.').slice(0, 2).join('.') + '.***.**';
}

// Export user data (GDPR compliance)
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const user = await pb.collection('users').getOne(userId);

  // Get all user's data
  const posts = await pb.collection('posts').getList(1, 1000, {
    filter: `authorId = "${userId}"`,
  });

  const forumMessages = await pb.collection('forum_messages').getList(1, 1000, {
    filter: `authorId = "${userId}"`,
  });

  const media = await pb.collection('media').getList(1, 1000, {
    filter: `uploadedBy = "${userId}"`,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created,
    },
    posts: posts.items,
    forumMessages: forumMessages.items,
    media: media.items.map(m => ({ id: m.id, fileName: m.fileName, createdAt: m.created })),
    exportedAt: new Date().toISOString(),
  };
}
```

---

## 6. API Security

### 6.1 Input Validation

```typescript
// lib/validation.ts

import { z } from 'zod';

// Common schemas
export const emailSchema = z.string().email().max(254);
export const slugSchema = z.string().min(3).max(50).regex(/^[a-z0-9-]+$/);
export const uuidSchema = z.string().uuid();

// Incident creation schema
export const createIncidentSchema = z.object({
  fullAddress: z.string().min(1).max(500),
  callType: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// API route validation wrapper
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: Request): Promise<T> => {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      throw new ValidationError('Invalid request body', result.error.issues);
    }

    return result.data;
  };
}

// SQL injection prevention (for raw queries)
export function escapeSQL(input: string): string {
  return input.replace(/'/g, "''").replace(/;/g, '');
}
```

### 6.2 Rate Limiting

```typescript
// lib/rate-limit.ts

export interface RateLimitConfig {
  window: number;     // Time window in ms
  max: number;        // Max requests in window
  keyPrefix: string;  // Redis key prefix
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: {
    window: 60 * 1000,  // 1 minute
    max: 100,           // 100 requests
    keyPrefix: 'rl:api',
  },
  pulsepoint: {
    window: 60 * 1000,  // 1 minute
    max: 2,             // 2 requests
    keyPrefix: 'rl:pp',
  },
  facebook: {
    window: 60 * 60 * 1000,  // 1 hour
    max: 50,                  // 50 posts
    keyPrefix: 'rl:fb',
  },
};

export async function rateLimit(
  config: RateLimitConfig,
  identifier: string // tenantId or IP
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();

  // Get current count
  const data = await redis.get(key);
  let count = 0;
  let windowStart = now;

  if (data) {
    const parsed = JSON.parse(data);
    if (now - parsed.windowStart < config.window) {
      count = parsed.count;
      windowStart = parsed.windowStart;
    }
  }

  // Check if over limit
  if (count >= config.max) {
    const resetAt = windowStart + config.window;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment count
  count++;
  await redis.setex(
    key,
    Math.ceil(config.window / 1000),
    JSON.stringify({ count, windowStart })
  );

  return {
    allowed: true,
    remaining: config.max - count,
    resetAt: windowStart + config.window,
  };
}
```

### 6.3 CORS & Headers

```typescript
// lib/security-headers.ts

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.pulsepoint.org https://graph.facebook.com",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const CORS_CONFIG = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://vanguard.app'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
```

---

## 7. Audit & Compliance

### 7.1 Audit Logging

```typescript
// lib/audit.ts

export interface AuditEntry {
  id: string;
  timestamp: string;
  tenantId?: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api';
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure';
  errorMessage?: string;
}

class AuditLogger {
  async log(
    action: string,
    context: {
      tenantId?: string;
      actorId?: string;
      actorType?: 'user' | 'system' | 'api';
      targetType?: string;
      targetId?: string;
      details?: Record<string, unknown>;
      request?: Request;
      result?: 'success' | 'failure';
      error?: Error;
    }
  ): Promise<void> {
    const entry: Partial<AuditEntry> = {
      timestamp: new Date().toISOString(),
      action,
      tenantId: context.tenantId,
      actorId: context.actorId || 'system',
      actorType: context.actorType || 'system',
      targetType: context.targetType,
      targetId: context.targetId,
      details: sanitizeForLogging(context.details || {}),
      result: context.result || (context.error ? 'failure' : 'success'),
      errorMessage: context.error?.message,
    };

    if (context.request) {
      entry.ipAddress = getClientIP(context.request);
      entry.userAgent = context.request.headers.get('user-agent') || undefined;
    }

    // Store in appropriate collection
    const collection = context.tenantId ? 'tenant_audit_logs' : 'platform_audit_logs';
    await pb.collection(collection).create(entry);

    // Log critical actions to external service
    if (CRITICAL_ACTIONS.includes(action)) {
      await this.alertCriticalAction(entry);
    }
  }

  private async alertCriticalAction(entry: Partial<AuditEntry>): Promise<void> {
    // Send to monitoring service
    console.warn('[CRITICAL AUDIT]', entry);
    // TODO: Send to Sentry, PagerDuty, etc.
  }
}

export const audit = new AuditLogger();

// Critical actions that require alerts
const CRITICAL_ACTIONS = [
  'tenant:deleted',
  'user:deleted',
  'user:banned',
  'permission:denied',
  'auth:failed:multiple',
  'data:exported',
  'config:changed',
];
```

### 7.2 Compliance Requirements

```typescript
// lib/compliance.ts

// Data retention policies
export const RETENTION_POLICIES = {
  audit_logs: {
    tenant: 365 * 2,    // 2 years
    platform: -1,       // Never delete
  },
  incidents: {
    active: -1,         // Keep while active
    archived: 365,      // 1 year after archive
  },
  media: {
    approved: 365 * 2,  // 2 years
    rejected: 30,       // 30 days
  },
  sessions: {
    active: 1,          // 1 day
    revoked: 7,         // 7 days
  },
};

// GDPR compliance helpers
export async function handleDataSubjectRequest(
  type: 'access' | 'deletion' | 'portability',
  userId: string
): Promise<void> {
  switch (type) {
    case 'access':
      // Export all user data
      const data = await exportUserData(userId);
      // Send to user
      break;

    case 'deletion':
      // Anonymize user data
      await anonymizeUser(userId);
      // Delete where possible
      break;

    case 'portability':
      // Export in machine-readable format
      const exportData = await exportUserData(userId);
      // Provide as JSON download
      break;
  }

  await audit.log(`gdpr:${type}`, {
    targetId: userId,
    targetType: 'user',
  });
}
```

---

## 8. Incident Response

### 8.1 Security Incident Handling

```typescript
// lib/security-incident.ts

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  affectedTenants?: string[];
  affectedUsers?: string[];
  detectedAt: string;
  resolvedAt?: string;
  timeline: {
    timestamp: string;
    action: string;
    actor: string;
  }[];
}

export async function reportSecurityIncident(
  type: string,
  details: {
    severity: IncidentSeverity;
    description: string;
    affectedTenants?: string[];
    affectedUsers?: string[];
  }
): Promise<string> {
  const incident: SecurityIncident = {
    id: generateId(),
    type,
    ...details,
    detectedAt: new Date().toISOString(),
    timeline: [
      {
        timestamp: new Date().toISOString(),
        action: 'Incident reported',
        actor: 'system',
      },
    ],
  };

  // Store incident
  await redis.set(`security:incident:${incident.id}`, JSON.stringify(incident));

  // Alert based on severity
  if (details.severity === IncidentSeverity.CRITICAL) {
    await alertPlatformAdmins(incident);
    await lockdownAffectedTenants(details.affectedTenants || []);
  }

  await audit.log('security:incident:reported', {
    details: { incidentId: incident.id, type, severity: details.severity },
  });

  return incident.id;
}
```

### 8.2 Automatic Threat Detection

```typescript
// lib/threat-detection.ts

export const THREAT_PATTERNS = {
  bruteForce: {
    threshold: 10,
    window: 5 * 60 * 1000, // 5 minutes
    action: 'block_ip',
  },
  unusualAccess: {
    patterns: [
      /SELECT.*FROM.*WHERE.*OR.*1=1/, // SQL injection
      /<script>/i,                     // XSS
      /\.\.\/\.\.\//,                  // Path traversal
    ],
    action: 'log_and_block',
  },
  suspiciousActivity: {
    // Multiple tenants accessed by same IP
    threshold: 5,
    window: 60 * 1000,
    action: 'alert',
  },
};

export async function detectThreats(request: Request): Promise<void> {
  const ip = getClientIP(request);
  const body = await request.text();

  // Check for injection patterns
  for (const pattern of THREAT_PATTERNS.unusualAccess.patterns) {
    if (pattern.test(body)) {
      await reportSecurityIncident('injection_attempt', {
        severity: IncidentSeverity.HIGH,
        description: `Injection attempt detected from ${maskIP(ip)}`,
      });
      throw new SecurityError('Request blocked');
    }
  }

  // Check for brute force
  const loginAttempts = await redis.get(`login:attempts:${ip}`);
  if (loginAttempts && parseInt(loginAttempts) > THREAT_PATTERNS.bruteForce.threshold) {
    await blockIP(ip, 30 * 60); // 30 minute block
    throw new SecurityError('Too many attempts');
  }
}
```

---

## 9. Security Checklist

### 9.1 Pre-Deployment Checklist

```markdown
## Security Pre-Deployment Checklist

### Authentication
- [ ] Password hashing uses Argon2id
- [ ] Session tokens are cryptographically random
- [ ] Sessions expire after 24 hours
- [ ] Cookies are HttpOnly, Secure, SameSite
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts

### Authorization
- [ ] All API routes check authentication
- [ ] All tenant routes verify tenant membership
- [ ] Permission checks on every mutation
- [ ] Role-based access control enforced
- [ ] Cross-tenant access prevented

### Data Protection
- [ ] Sensitive fields encrypted at rest
- [ ] TLS 1.3 for all connections
- [ ] No secrets in code or logs
- [ ] PII masked in logs
- [ ] Data retention policies implemented

### API Security
- [ ] Input validation on all endpoints
- [ ] Rate limiting per tenant
- [ ] CORS configured properly
- [ ] Security headers set
- [ ] No sensitive data in URLs

### Infrastructure
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Backup encryption enabled
- [ ] Monitoring and alerting active
- [ ] Incident response plan ready

### Compliance
- [ ] Audit logging enabled
- [ ] GDPR data export available
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Data processing agreements ready
```

### 9.2 Regular Security Tasks

| Task | Frequency | Owner |
|------|-----------|-------|
| Review audit logs | Daily | Platform Admin |
| Rotate API keys | Monthly | Platform Admin |
| Dependency updates | Weekly | DevOps |
| Penetration testing | Quarterly | Security Team |
| Access review | Monthly | Platform Admin |
| Backup verification | Weekly | DevOps |
| Incident drills | Quarterly | All |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | January 2025 | Initial security architecture |

---

*This document defines the security architecture for the Vanguard multi-tenant platform. All implementations must adhere to these security requirements.*
