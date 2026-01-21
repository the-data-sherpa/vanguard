import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed a test tenant and assign the current user as owner.
 * Run this from the Convex dashboard or via CLI.
 *
 * Usage from CLI:
 *   npx convex run seed:createTestTenant '{"slug": "demo", "name": "Demo Fire Department"}'
 */
export const createTestTenant = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { slug, name, displayName }) => {
    // Check if tenant already exists
    const existing = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    if (existing) {
      return { success: false, error: `Tenant with slug "${slug}" already exists`, tenantId: existing._id };
    }

    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      slug,
      name,
      displayName: displayName || name,
      status: "active",
      tier: "professional", // Give test tenant good tier for testing features
      features: {
        weatherAlerts: true,
        userSubmissions: true,
        facebook: true,
        twitter: true,
        discord: true,
        forum: true,
        apiAccess: true,
        advancedAnalytics: true,
        customBranding: true,
      },
    });

    return { success: true, tenantId, slug };
  },
});

/**
 * Assign a user to a tenant as owner.
 * Use this after creating a tenant to link your user account.
 *
 * Usage from CLI:
 *   npx convex run seed:assignUserToTenant '{"email": "you@example.com", "tenantSlug": "demo"}'
 */
export const assignUserToTenant = mutation({
  args: {
    email: v.string(),
    tenantSlug: v.string(),
    role: v.optional(v.union(v.literal("owner"), v.literal("user"))),
  },
  handler: async (ctx, { email, tenantSlug, role = "owner" }) => {
    // Find the tenant
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", tenantSlug))
      .unique();

    if (!tenant) {
      return { success: false, error: `Tenant "${tenantSlug}" not found` };
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      return { success: false, error: `User with email "${email}" not found. Make sure you've signed in at least once.` };
    }

    // Update user with tenant assignment
    await ctx.db.patch(user._id, {
      tenantId: tenant._id,
      tenantRole: role,
      isActive: true,
    });

    return { success: true, userId: user._id, tenantId: tenant._id, role };
  },
});

/**
 * Quick setup: Create tenant and assign current authenticated user as owner.
 * This combines both operations in one call.
 *
 * Usage from CLI (must be authenticated):
 *   npx convex run seed:quickSetup '{"slug": "demo", "name": "Demo Fire Department"}'
 */
export const quickSetup = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { slug, name, displayName }) => {
    // Get current user from auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return { success: false, error: "Not authenticated. Sign in first, then run this mutation." };
    }

    // Find the user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      return { success: false, error: "User record not found. Sign in to the app first to create your user record." };
    }

    // Check if tenant already exists
    let tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();

    let created = false;
    if (!tenant) {
      // Create the tenant
      const tenantId = await ctx.db.insert("tenants", {
        slug,
        name,
        displayName: displayName || name,
        status: "active",
        tier: "professional",
        features: {
          weatherAlerts: true,
          userSubmissions: true,
          facebook: true,
          twitter: true,
          discord: true,
          forum: true,
          apiAccess: true,
          advancedAnalytics: true,
          customBranding: true,
        },
      });
      tenant = await ctx.db.get(tenantId);
      created = true;
    }

    // Assign user to tenant as owner
    await ctx.db.patch(user._id, {
      tenantId: tenant!._id,
      tenantRole: "owner",
      isActive: true,
    });

    return {
      success: true,
      tenantCreated: created,
      tenantId: tenant!._id,
      slug,
      userId: user._id,
      email: identity.email,
    };
  },
});

/**
 * List all users (for debugging)
 */
export const listUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      id: u._id,
      email: u.email,
      name: u.name,
      tenantId: u.tenantId,
      tenantRole: u.tenantRole,
      clerkId: u.clerkId,
    }));
  },
});

/**
 * List all tenants (for debugging)
 */
export const listTenants = mutation({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("tenants").collect();
    return tenants.map((t) => ({
      id: t._id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      tier: t.tier,
    }));
  },
});

/**
 * Create or update a user directly (bypassing Clerk webhook).
 * Use this when the Clerk webhook isn't set up.
 *
 * Usage from CLI:
 *   npx convex run seed:seedUser '{"email": "you@example.com", "name": "Your Name"}'
 */
export const seedUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, clerkId }) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        name: name || existing.name,
        clerkId: clerkId || existing.clerkId,
        verified: true,
        isActive: true,
        lastLoginAt: Date.now(),
      });
      return { success: true, userId: existing._id, action: "updated" };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email,
      emailVisibility: false,
      verified: true,
      name,
      clerkId,
      role: "user",
      isActive: true,
      isBanned: false,
      lastLoginAt: Date.now(),
    });

    return { success: true, userId, action: "created" };
  },
});

/**
 * Full setup: Create user, tenant, and assign user as owner.
 * One command to set up everything for testing.
 *
 * Usage from CLI:
 *   npx convex run seed:fullSetup '{"email": "you@example.com", "name": "Your Name", "tenantSlug": "demo", "tenantName": "Demo Fire Dept"}'
 */
export const fullSetup = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    tenantSlug: v.string(),
    tenantName: v.string(),
  },
  handler: async (ctx, { email, name, clerkId, tenantSlug, tenantName }) => {
    // 1. Create or update user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        emailVisibility: false,
        verified: true,
        name,
        clerkId,
        role: "user",
        isActive: true,
        isBanned: false,
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    } else {
      await ctx.db.patch(user._id, {
        name: name || user.name,
        clerkId: clerkId || user.clerkId,
        verified: true,
        isActive: true,
        lastLoginAt: Date.now(),
      });
    }

    // 2. Create or get tenant
    let tenant = await ctx.db
      .query("tenants")
      .withIndex("by_slug", (q) => q.eq("slug", tenantSlug))
      .unique();

    let tenantCreated = false;
    if (!tenant) {
      const tenantId = await ctx.db.insert("tenants", {
        slug: tenantSlug,
        name: tenantName,
        displayName: tenantName,
        status: "active",
        tier: "professional",
        features: {
          weatherAlerts: true,
          userSubmissions: true,
          facebook: true,
          twitter: true,
          discord: true,
          forum: true,
          apiAccess: true,
          advancedAnalytics: true,
          customBranding: true,
        },
      });
      tenant = await ctx.db.get(tenantId);
      tenantCreated = true;
    }

    // 3. Assign user to tenant as owner
    await ctx.db.patch(user!._id, {
      tenantId: tenant!._id,
      tenantRole: "owner",
    });

    return {
      success: true,
      user: { id: user!._id, email },
      tenant: { id: tenant!._id, slug: tenantSlug, created: tenantCreated },
      message: `User "${email}" is now owner of tenant "${tenantSlug}"`,
    };
  },
});
