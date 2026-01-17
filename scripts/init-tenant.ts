/**
 * Initialize First Tenant Script
 * Creates the necessary collections and a test tenant for development
 *
 * Usage: npm run db:init
 */

import 'dotenv/config';
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

const pb = new PocketBase(POCKETBASE_URL);

// Collection definitions
const collections = [
  {
    name: 'system_config',
    type: 'base',
    fields: [
      { name: 'resendDomain', type: 'text', required: false },
      { name: 'rateLimits', type: 'json', required: false },
      { name: 'oauthCredentials', type: 'json', required: false },
      { name: 'globalFeatures', type: 'json', required: false },
    ],
  },
  {
    name: 'tenants',
    type: 'base',
    fields: [
      { name: 'slug', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'displayName', type: 'text', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'logoUrl', type: 'url', required: false },
      { name: 'primaryColor', type: 'text', required: false },
      { name: 'status', type: 'select', required: true, values: ['pending', 'active', 'suspended', 'deactivated', 'pending_deletion'] },
      { name: 'tier', type: 'select', required: true, values: ['free', 'starter', 'professional', 'enterprise'] },
      { name: 'pulsepointAgencyId', type: 'text', required: false },
      { name: 'pulsepointConfig', type: 'json', required: false },
      { name: 'weatherZones', type: 'json', required: false },
      { name: 'features', type: 'json', required: false },
      { name: 'limits', type: 'json', required: false },
      { name: 'trialEndsAt', type: 'date', required: false },
      { name: 'deactivatedAt', type: 'date', required: false },
      { name: 'deactivatedReason', type: 'text', required: false },
      { name: 'deletionScheduledAt', type: 'date', required: false },
      { name: 'billingCustomerId', type: 'text', required: false },
      { name: 'billingSubscriptionId', type: 'text', required: false },
    ],
    // Allow public read access for tenant validation in middleware
    listRule: '',
    viewRule: '',
    createRule: null, // Admin only
    updateRule: null, // Admin only
    deleteRule: null, // Admin only
  },
  {
    name: 'rate_counters',
    type: 'base',
    fields: [
      { name: 'tenantId', type: 'text', required: true },
      { name: 'resource', type: 'text', required: true },
      { name: 'tokens', type: 'number', required: true },
      { name: 'lastRefill', type: 'date', required: true },
    ],
  },
  {
    name: 'incidents',
    type: 'base',
    fields: [
      { name: 'tenantId', type: 'text', required: true },
      { name: 'source', type: 'select', required: true, values: ['pulsepoint', 'user_submitted', 'merged', 'manual'] },
      { name: 'externalId', type: 'text', required: false },
      { name: 'callType', type: 'text', required: true },
      { name: 'callTypeCategory', type: 'select', required: false, values: ['fire', 'medical', 'rescue', 'traffic', 'hazmat', 'other'] },
      { name: 'fullAddress', type: 'text', required: true },
      { name: 'normalizedAddress', type: 'text', required: false },
      { name: 'latitude', type: 'number', required: false },
      { name: 'longitude', type: 'number', required: false },
      { name: 'units', type: 'json', required: false },
      { name: 'unitStatuses', type: 'json', required: false },
      { name: 'description', type: 'text', required: false },
      { name: 'status', type: 'select', required: true, values: ['active', 'closed', 'archived'] },
      { name: 'callReceivedTime', type: 'date', required: true },
      { name: 'callClosedTime', type: 'date', required: false },
      { name: 'submittedBy', type: 'text', required: false },
      { name: 'moderationStatus', type: 'select', required: false, values: ['auto_approved', 'pending', 'approved', 'rejected'] },
      { name: 'moderatedBy', type: 'text', required: false },
      { name: 'moderatedAt', type: 'date', required: false },
      { name: 'rejectionReason', type: 'text', required: false },
      { name: 'isSyncedToFacebook', type: 'bool', required: false },
      { name: 'facebookPostId', type: 'text', required: false },
      { name: 'needsFacebookUpdate', type: 'bool', required: false },
      { name: 'lastSyncAttempt', type: 'date', required: false },
      { name: 'syncError', type: 'text', required: false },
    ],
    // Public read access for dashboard display
    listRule: '',
    viewRule: '',
    createRule: null, // Admin/system only
    updateRule: null, // Admin/system only
    deleteRule: null, // Admin/system only
  },
  {
    name: 'weather_alerts',
    type: 'base',
    fields: [
      { name: 'tenantId', type: 'text', required: true },
      { name: 'nwsId', type: 'text', required: true },
      { name: 'event', type: 'text', required: true },
      { name: 'headline', type: 'text', required: true },
      { name: 'description', type: 'text', required: false },
      { name: 'instruction', type: 'text', required: false },
      { name: 'severity', type: 'select', required: true, values: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'] },
      { name: 'urgency', type: 'select', required: false, values: ['Immediate', 'Expected', 'Future', 'Unknown'] },
      { name: 'certainty', type: 'select', required: false, values: ['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown'] },
      { name: 'category', type: 'text', required: false },
      { name: 'onset', type: 'date', required: false },
      { name: 'expires', type: 'date', required: true },
      { name: 'ends', type: 'date', required: false },
      { name: 'affectedZones', type: 'json', required: false },
      { name: 'status', type: 'select', required: true, values: ['active', 'expired', 'cancelled'] },
      { name: 'isSyncedToFacebook', type: 'bool', required: false },
      { name: 'facebookPostId', type: 'text', required: false },
      { name: 'lastFacebookPostTime', type: 'date', required: false },
    ],
    // Public read access for dashboard display
    listRule: '',
    viewRule: '',
    createRule: null, // Admin/system only
    updateRule: null, // Admin/system only
    deleteRule: null, // Admin/system only
  },
  {
    name: 'social_accounts',
    type: 'base',
    fields: [
      { name: 'tenantId', type: 'text', required: true },
      { name: 'provider', type: 'select', required: true, values: ['facebook', 'twitter', 'instagram', 'discord'] },
      { name: 'providerUserId', type: 'text', required: true },
      { name: 'providerUsername', type: 'text', required: false },
      { name: 'accessToken', type: 'text', required: true },
      { name: 'refreshToken', type: 'text', required: false },
      { name: 'expiresAt', type: 'date', required: false },
      { name: 'scope', type: 'text', required: false },
      { name: 'isActive', type: 'bool', required: false },
      { name: 'lastUsedAt', type: 'date', required: false },
      { name: 'errorCount', type: 'number', required: false },
      { name: 'lastError', type: 'text', required: false },
    ],
  },
  {
    name: 'audit_logs',
    type: 'base',
    fields: [
      { name: 'tenantId', type: 'text', required: false },
      { name: 'actorId', type: 'text', required: true },
      { name: 'actorType', type: 'select', required: false, values: ['user', 'system', 'api'] },
      { name: 'action', type: 'text', required: true },
      { name: 'targetType', type: 'text', required: false },
      { name: 'targetId', type: 'text', required: false },
      { name: 'details', type: 'json', required: false },
      { name: 'ipAddress', type: 'text', required: false },
      { name: 'userAgent', type: 'text', required: false },
      { name: 'result', type: 'select', required: false, values: ['success', 'failure'] },
    ],
  },
];

async function checkPocketBaseConnection(): Promise<boolean> {
  try {
    const health = await fetch(`${POCKETBASE_URL}/api/health`);
    return health.ok;
  } catch {
    return false;
  }
}

async function authenticateAdmin(): Promise<boolean> {
  const email = process.env.PB_ADMIN_EMAIL || 'admin@vanguard.local';
  const password = process.env.PB_ADMIN_PASSWORD || 'admin123456';

  try {
    await pb.admins.authWithPassword(email, password);
    return true;
  } catch {
    return false;
  }
}

async function createCollections(): Promise<void> {
  for (const collection of collections) {
    try {
      // Check if exists
      let existing: any = null;
      try {
        existing = await pb.collections.getOne(collection.name);
      } catch {
        // Doesn't exist
      }

      if (existing) {
        // Check if fields need to be updated (existing only has 'id' field)
        const existingFieldNames = new Set((existing.fields || []).map((f: any) => f.name));
        const collectionFields = (collection as any).fields || [];
        const definedFieldNames = collectionFields.map((f: any) => f.name);
        const missingFields = definedFieldNames.filter((name: string) => !existingFieldNames.has(name));

        // Check if API rules need update
        const needsRuleUpdate =
          ('listRule' in collection && existing.listRule !== (collection as any).listRule) ||
          ('viewRule' in collection && existing.viewRule !== (collection as any).viewRule) ||
          ('createRule' in collection && existing.createRule !== (collection as any).createRule) ||
          ('updateRule' in collection && existing.updateRule !== (collection as any).updateRule) ||
          ('deleteRule' in collection && existing.deleteRule !== (collection as any).deleteRule);

        if (missingFields.length > 0 || needsRuleUpdate) {
          const updates: any = {};

          // Always include all fields (existing + new) when updating
          if (missingFields.length > 0) {
            // Merge existing custom fields with new fields
            const existingCustomFields = (existing.fields || []).filter((f: any) => f.name !== 'id' && !f.system);
            updates.fields = [...existingCustomFields, ...collectionFields];
          }

          // Update API rules
          if ('listRule' in collection) updates.listRule = (collection as any).listRule;
          if ('viewRule' in collection) updates.viewRule = (collection as any).viewRule;
          if ('createRule' in collection) updates.createRule = (collection as any).createRule;
          if ('updateRule' in collection) updates.updateRule = (collection as any).updateRule;
          if ('deleteRule' in collection) updates.deleteRule = (collection as any).deleteRule;

          await pb.collections.update(existing.id, updates);
          const updateTypes = [];
          if (missingFields.length > 0) updateTypes.push(`${missingFields.length} fields`);
          if (needsRuleUpdate) updateTypes.push('API rules');
          console.log(`  [updated] ${collection.name} (${updateTypes.join(', ')})`);
        } else {
          console.log(`  [exists] ${collection.name}`);
        }
        continue;
      }

      await pb.collections.create(collection);
      console.log(`  [created] ${collection.name}`);
    } catch (e: any) {
      console.error(`  [error] ${collection.name}: ${e.message}`);
      if (e.data) console.error(`    Details:`, JSON.stringify(e.data, null, 2));
    }
  }
}

async function createTestTenant(): Promise<string | null> {
  const slug = 'test';

  try {
    // Check if exists
    const existing = await pb.collection('tenants').getFirstListItem(`slug="${slug}"`);
    console.log(`  Tenant "${slug}" already exists (id: ${existing.id})`);
    return existing.id;
  } catch {
    // Doesn't exist, create it
  }

  try {
    const tenant = await pb.collection('tenants').create({
      slug: 'test',
      name: 'Test Fire Department',
      displayName: 'Test FD',
      status: 'active',
      tier: 'professional',
      pulsepointAgencyId: 'EMS1681',
      pulsepointConfig: {
        enabled: true,
        agencyIds: ['EMS1681'],
        syncInterval: 120,
      },
      weatherZones: ['CAZ017'], // Sacramento County
      features: {
        facebook: false,
        twitter: false,
        instagram: false,
        discord: false,
        weatherAlerts: true,
        userSubmissions: true,
        forum: false,
        customBranding: false,
        apiAccess: true,
        advancedAnalytics: false,
      },
      limits: {
        maxUsers: 10,
        maxIncidentsPerDay: 1000,
        maxApiRequestsPerHour: 1000,
      },
    });

    console.log(`  Created tenant "${slug}" (id: ${tenant.id})`);
    return tenant.id;
  } catch (e: any) {
    console.error(`  Failed to create tenant: ${e.message}`);
    return null;
  }
}

async function createSystemConfig(): Promise<void> {
  try {
    // Check if exists
    const existing = await pb.collection('system_config').getList(1, 1);
    if (existing.totalItems > 0) {
      console.log('  System config already exists');
      return;
    }
  } catch {
    // Collection might not exist yet
  }

  try {
    await pb.collection('system_config').create({
      rateLimits: {
        pulsepoint: { limit: 1, intervalSec: 120 },
        weather: { limit: 1, intervalSec: 300 },
      },
      globalFeatures: {
        maintenance: false,
        newRegistrations: true,
      },
    });
    console.log('  Created system config');
  } catch (e: any) {
    console.error(`  Failed to create system config: ${e.message}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Vanguard Database Initialization');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Check PocketBase connection
  console.log('Step 1: Checking PocketBase connection...');
  const isConnected = await checkPocketBaseConnection();
  if (!isConnected) {
    console.error(`\n  ERROR: Cannot connect to PocketBase at ${POCKETBASE_URL}`);
    console.log('\n  Make sure PocketBase is running:');
    console.log('    npm run db:start');
    process.exit(1);
  }
  console.log(`  Connected to ${POCKETBASE_URL}`);
  console.log();

  // Step 2: Authenticate as admin
  console.log('Step 2: Authenticating as admin...');
  const isAuthenticated = await authenticateAdmin();
  if (!isAuthenticated) {
    console.log('\n  Admin authentication failed.');
    console.log('\n  Please create an admin account first:');
    console.log(`    1. Go to ${POCKETBASE_URL}/_/`);
    console.log('    2. Create admin with:');
    console.log('       Email: admin@vanguard.local');
    console.log('       Password: admin123456');
    console.log('    3. Run this script again');
    console.log('\n  Or set custom credentials in .env:');
    console.log('    PB_ADMIN_EMAIL=your-email');
    console.log('    PB_ADMIN_PASSWORD=your-password');
    process.exit(1);
  }
  console.log('  Authenticated successfully');
  console.log();

  // Step 3: Create collections
  console.log('Step 3: Creating collections...');
  await createCollections();
  console.log();

  // Step 4: Create system config
  console.log('Step 4: Creating system config...');
  await createSystemConfig();
  console.log();

  // Step 5: Create test tenant
  console.log('Step 5: Creating test tenant...');
  const tenantId = await createTestTenant();
  console.log();

  // Done!
  console.log('='.repeat(60));
  console.log('Initialization complete!');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log('  1. Start the dev server: npm run dev');
  console.log('  2. Visit: http://localhost:3000/tenant/test');
  console.log('  3. Test PulsePoint: npm run test:pulsepoint');
  console.log();
  console.log('Test tenant configuration:');
  console.log('  Slug: test');
  console.log('  PulsePoint Agency: EMS1681 (Sacramento Metro Fire)');
  console.log('  Weather Zone: CAZ017 (Sacramento County)');
  console.log();
}

main().catch((e) => {
  console.error('Initialization failed:', e.message);
  process.exit(1);
});
