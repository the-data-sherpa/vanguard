/**
 * Database Setup Script
 * Creates all required PocketBase collections
 *
 * Usage: npx tsx scripts/setup-db.ts
 */

import 'dotenv/config';
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

async function setup() {
  const pb = new PocketBase(POCKETBASE_URL);

  console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);

  // Check if admin exists, if not create one
  try {
    const admins = await pb.admins.getList(1, 1);
    if (admins.totalItems === 0) {
      console.log('Creating admin account...');
      await pb.admins.create({
        email: 'admin@vanguard.local',
        password: 'admin123456',
        passwordConfirm: 'admin123456',
      });
      console.log('Admin created: admin@vanguard.local / admin123456');
    }
  } catch (e) {
    // Admin might already exist or we need to authenticate
  }

  // Authenticate as admin
  try {
    await pb.admins.authWithPassword('admin@vanguard.local', 'admin123456');
    console.log('Authenticated as admin');
  } catch (e) {
    console.error('Failed to authenticate. Please create an admin account at', `${POCKETBASE_URL}/_/`);
    console.error('Then update this script with your credentials.');
    process.exit(1);
  }

  // Define collections
  const collections = [
    {
      name: 'system_config',
      type: 'base',
      schema: [
        { name: 'resendDomain', type: 'text', required: false },
        { name: 'rateLimits', type: 'json', required: false },
        { name: 'oauthCredentials', type: 'json', required: false },
        { name: 'globalFeatures', type: 'json', required: false },
      ],
    },
    {
      name: 'tenants',
      type: 'base',
      schema: [
        { name: 'slug', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'displayName', type: 'text', required: false },
        { name: 'description', type: 'text', required: false },
        { name: 'logoUrl', type: 'url', required: false },
        { name: 'primaryColor', type: 'text', required: false },
        { name: 'status', type: 'select', required: true, options: { values: ['pending', 'active', 'suspended', 'deactivated', 'pending_deletion'] } },
        { name: 'tier', type: 'select', required: true, options: { values: ['free', 'starter', 'professional', 'enterprise'] } },
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
    },
    {
      name: 'rate_counters',
      type: 'base',
      schema: [
        { name: 'tenantId', type: 'text', required: true },
        { name: 'resource', type: 'text', required: true },
        { name: 'tokens', type: 'number', required: true },
        { name: 'lastRefill', type: 'date', required: true },
      ],
    },
    {
      name: 'incidents',
      type: 'base',
      schema: [
        { name: 'tenantId', type: 'text', required: true },
        { name: 'source', type: 'select', required: true, options: { values: ['pulsepoint', 'user_submitted', 'merged', 'manual'] } },
        { name: 'externalId', type: 'text', required: false },
        { name: 'callType', type: 'text', required: true },
        { name: 'callTypeCategory', type: 'select', required: false, options: { values: ['fire', 'medical', 'rescue', 'traffic', 'hazmat', 'other'] } },
        { name: 'fullAddress', type: 'text', required: true },
        { name: 'normalizedAddress', type: 'text', required: false },
        { name: 'latitude', type: 'number', required: false },
        { name: 'longitude', type: 'number', required: false },
        { name: 'units', type: 'json', required: false },
        { name: 'unitStatuses', type: 'json', required: false },
        { name: 'description', type: 'text', required: false },
        { name: 'status', type: 'select', required: true, options: { values: ['active', 'closed', 'archived'] } },
        { name: 'callReceivedTime', type: 'date', required: true },
        { name: 'callClosedTime', type: 'date', required: false },
        { name: 'submittedBy', type: 'text', required: false },
        { name: 'moderationStatus', type: 'select', required: false, options: { values: ['auto_approved', 'pending', 'approved', 'rejected'] } },
        { name: 'moderatedBy', type: 'text', required: false },
        { name: 'moderatedAt', type: 'date', required: false },
        { name: 'rejectionReason', type: 'text', required: false },
        { name: 'isSyncedToFacebook', type: 'bool', required: false },
        { name: 'facebookPostId', type: 'text', required: false },
        { name: 'needsFacebookUpdate', type: 'bool', required: false },
        { name: 'lastSyncAttempt', type: 'date', required: false },
        { name: 'syncError', type: 'text', required: false },
      ],
    },
    {
      name: 'weather_alerts',
      type: 'base',
      schema: [
        { name: 'tenantId', type: 'text', required: true },
        { name: 'nwsId', type: 'text', required: true },
        { name: 'event', type: 'text', required: true },
        { name: 'headline', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        { name: 'instruction', type: 'text', required: false },
        { name: 'severity', type: 'select', required: true, options: { values: ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'] } },
        { name: 'urgency', type: 'select', required: false, options: { values: ['Immediate', 'Expected', 'Future', 'Unknown'] } },
        { name: 'certainty', type: 'select', required: false, options: { values: ['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown'] } },
        { name: 'category', type: 'text', required: false },
        { name: 'onset', type: 'date', required: false },
        { name: 'expires', type: 'date', required: true },
        { name: 'ends', type: 'date', required: false },
        { name: 'affectedZones', type: 'json', required: false },
        { name: 'status', type: 'select', required: true, options: { values: ['active', 'expired', 'cancelled'] } },
        { name: 'isSyncedToFacebook', type: 'bool', required: false },
        { name: 'facebookPostId', type: 'text', required: false },
        { name: 'lastFacebookPostTime', type: 'date', required: false },
      ],
    },
    {
      name: 'social_accounts',
      type: 'base',
      schema: [
        { name: 'tenantId', type: 'text', required: true },
        { name: 'provider', type: 'select', required: true, options: { values: ['facebook', 'twitter', 'instagram', 'discord'] } },
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
      schema: [
        { name: 'tenantId', type: 'text', required: false },
        { name: 'actorId', type: 'text', required: true },
        { name: 'actorType', type: 'select', required: false, options: { values: ['user', 'system', 'api'] } },
        { name: 'action', type: 'text', required: true },
        { name: 'targetType', type: 'text', required: false },
        { name: 'targetId', type: 'text', required: false },
        { name: 'details', type: 'json', required: false },
        { name: 'ipAddress', type: 'text', required: false },
        { name: 'userAgent', type: 'text', required: false },
        { name: 'result', type: 'select', required: false, options: { values: ['success', 'failure'] } },
      ],
    },
  ];

  // Create collections
  for (const collection of collections) {
    try {
      // Check if collection exists
      const existing = await pb.collections.getList(1, 1, { filter: `name="${collection.name}"` });
      if (existing.totalItems > 0) {
        console.log(`Collection "${collection.name}" already exists, skipping...`);
        continue;
      }

      await pb.collections.create(collection);
      console.log(`Created collection: ${collection.name}`);
    } catch (e: any) {
      if (e.message?.includes('already exists')) {
        console.log(`Collection "${collection.name}" already exists, skipping...`);
      } else {
        console.error(`Failed to create collection "${collection.name}":`, e.message);
      }
    }
  }

  // Create a test tenant
  try {
    const existingTenants = await pb.collection('tenants').getList(1, 1, { filter: 'slug="test"' });
    if (existingTenants.totalItems === 0) {
      const tenant = await pb.collection('tenants').create({
        slug: 'test',
        name: 'Test Fire Department',
        status: 'active',
        tier: 'free',
        pulsepointAgencyId: 'EMS1681', // Example agency ID
        features: {
          facebook: false,
          twitter: false,
          instagram: false,
          discord: false,
          weatherAlerts: true,
          userSubmissions: true,
        },
        weatherZones: ['TXC029'], // Example: Dallas County, TX
      });
      console.log(`Created test tenant: ${tenant.id} (slug: test)`);
    } else {
      console.log('Test tenant already exists');
    }
  } catch (e: any) {
    console.error('Failed to create test tenant:', e.message);
  }

  console.log('\nSetup complete!');
  console.log(`\nNext steps:`);
  console.log(`1. Visit http://localhost:3000/tenant/test to see the dashboard`);
  console.log(`2. Trigger a sync: POST /api/tenant/test/incidents/sync`);
}

setup().catch(console.error);
