/**
 * Vanguard Type Definitions
 * Auto-generated from pb_schema.json
 */

// ===================
// Base Types
// ===================

export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

// ===================
// System Config
// ===================

export interface SystemConfig extends BaseRecord {
  resendDomain?: string;
  rateLimits?: RateLimitConfig;
  oauthCredentials?: OAuthCredentials;
  globalFeatures?: GlobalFeatures;
}

export interface RateLimitConfig {
  [resource: string]: {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
  };
}

export interface OAuthCredentials {
  facebook?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
  discord?: { clientId: string; clientSecret: string };
  google?: { clientId: string; clientSecret: string };
}

export interface GlobalFeatures {
  [feature: string]: boolean;
}

// ===================
// Tenant
// ===================

export type TenantStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'deactivated'
  | 'pending_deletion';

export type TenantTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Tenant extends BaseRecord {
  slug: string;
  name: string;
  displayName?: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  status: TenantStatus;
  tier: TenantTier;
  pulsepointAgencyId?: string;
  pulsepointConfig?: PulsepointConfig;
  weatherZones?: string[];
  features?: TenantFeatures;
  limits?: TenantLimits;
  trialEndsAt?: string;
  deactivatedAt?: string;
  deactivatedReason?: string;
  deletionScheduledAt?: string;
  billingCustomerId?: string;
  billingSubscriptionId?: string;
}

export interface PulsepointConfig {
  enabled: boolean;
  agencyIds: string[];
  syncInterval: number;
  callTypes?: string[];
}

export interface TenantFeatures {
  facebook?: boolean;
  twitter?: boolean;
  instagram?: boolean;
  discord?: boolean;
  weatherAlerts?: boolean;
  userSubmissions?: boolean;
  forum?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  advancedAnalytics?: boolean;
}

export interface TenantLimits {
  maxUsers?: number;
  maxIncidentsPerDay?: number;
  maxApiRequestsPerHour?: number;
  maxStorageMb?: number;
  maxSocialAccounts?: number;
}

// ===================
// User
// ===================

export type UserRole = 'user' | 'platform_admin';

export type TenantRole = 'member' | 'moderator' | 'admin' | 'owner';

export interface User extends BaseRecord {
  tenantId?: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  tenantRole?: TenantRole;
  isActive?: boolean;
  isBanned?: boolean;
  bannedAt?: string;
  bannedReason?: string;
  preferences?: UserPreferences;
  lastLoginAt?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  timezone?: string;
}

// ===================
// Account (NextAuth OAuth)
// ===================

export interface Account extends BaseRecord {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
}

// ===================
// Session (NextAuth)
// ===================

export interface Session extends BaseRecord {
  sessionToken: string;
  userId: string;
  expires: string;
}

// ===================
// Social Account (Tenant-level)
// ===================

export type SocialProvider = 'facebook' | 'twitter' | 'instagram' | 'discord';

export interface SocialAccount extends BaseRecord {
  tenantId: string;
  provider: SocialProvider;
  providerUserId: string;
  providerUsername?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  isActive?: boolean;
  lastUsedAt?: string;
  errorCount?: number;
  lastError?: string;
}

// ===================
// Audit Log
// ===================

export type ActorType = 'user' | 'system' | 'api';
export type AuditResult = 'success' | 'failure';

export interface AuditLog extends BaseRecord {
  tenantId?: string;
  actorId: string;
  actorType?: ActorType;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  result?: AuditResult;
}

// ===================
// Rate Counter
// ===================

export interface RateCounter extends BaseRecord {
  tenantId: string;
  resource: string;
  tokens: number;
  lastRefill: string;
}

// ===================
// Incident
// ===================

export type IncidentSource = 'pulsepoint' | 'user_submitted' | 'merged' | 'manual';
export type IncidentStatus = 'active' | 'closed' | 'archived';
export type CallTypeCategory = 'fire' | 'medical' | 'rescue' | 'traffic' | 'hazmat' | 'other';
export type ModerationStatus = 'auto_approved' | 'pending' | 'approved' | 'rejected';

export interface Incident extends BaseRecord {
  tenantId: string;
  source: IncidentSource;
  externalId?: string;
  callType: string;
  callTypeCategory?: CallTypeCategory;
  fullAddress: string;
  normalizedAddress?: string;
  latitude?: number;
  longitude?: number;
  units?: string[];
  unitStatuses?: Record<string, UnitStatus>;
  description?: string;
  status: IncidentStatus;
  callReceivedTime: string;
  callClosedTime?: string;
  submittedBy?: string;
  moderationStatus?: ModerationStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  rejectionReason?: string;
  isSyncedToFacebook?: boolean;
  facebookPostId?: string;
  needsFacebookUpdate?: boolean;
  lastSyncAttempt?: string;
  syncError?: string;
}

export interface UnitStatus {
  unit: string;
  status: string;
  timestamp: string;
}

// ===================
// Incident Update
// ===================

export type UpdateStatus = 'pending' | 'approved' | 'rejected';

export interface IncidentUpdate extends BaseRecord {
  tenantId: string;
  incidentId: string;
  submittedBy: string;
  updateText: string;
  status: UpdateStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  rejectionReason?: string;
  isSyncedToFacebook?: boolean;
}

// ===================
// Weather Alert
// ===================

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
export type AlertUrgency = 'Immediate' | 'Expected' | 'Future' | 'Unknown';
export type AlertCertainty = 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
export type AlertStatus = 'active' | 'expired' | 'cancelled';

export interface WeatherAlert extends BaseRecord {
  tenantId: string;
  nwsId: string;
  event: string;
  headline: string;
  description?: string;
  instruction?: string;
  severity: AlertSeverity;
  urgency?: AlertUrgency;
  certainty?: AlertCertainty;
  category?: string;
  onset?: string;
  expires: string;
  ends?: string;
  affectedZones?: string[];
  status: AlertStatus;
  isSyncedToFacebook?: boolean;
  facebookPostId?: string;
  lastFacebookPostTime?: string;
}

// ===================
// Tenant Context (Middleware)
// ===================

export interface TenantContext {
  id: string;
  slug: string;
  status: TenantStatus;
  tier: TenantTier;
  features: TenantFeatures;
}
