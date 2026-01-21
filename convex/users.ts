import { v } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helpers
// ===================

// Role hierarchy for tenant access (platform_admin has no special tenant privileges)
// Simplified to 2 roles: owner (full settings access) and user (can view + add updates)
const roleHierarchy: Record<string, number> = {
  user: 1,
  owner: 2,
};

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity;
}

async function getCurrentUserInternal(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Look up user by email
  const email = identity.email;
  if (!email) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

async function requireTenantOwner(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const user = await getCurrentUserInternal(ctx);
  if (!user) {
    throw new Error("Authentication required");
  }

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  // Verify user belongs to the requested tenant
  // Note: Platform admins do NOT have automatic tenant access - they must be explicitly added
  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  // Check owner role
  if (user.tenantRole !== "owner") {
    throw new Error("Access denied: requires owner role");
  }

  return { userId: user._id, tenantRole: user.tenantRole };
}

// ===================
// Internal Mutations (Webhook handlers)
// ===================

export const syncUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by email (might be invited)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingByEmail) {
      // Update existing user with clerkId
      await ctx.db.patch(existingByEmail._id, {
        clerkId: args.clerkId,
        name: args.name || existingByEmail.name,
        username: args.username || existingByEmail.username,
        avatar: args.avatar || existingByEmail.avatar,
        verified: true,
        isActive: true,
        lastLoginAt: Date.now(),
      });
      return existingByEmail._id;
    }

    // Check if user already exists by clerkId
    const existingByClerk = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingByClerk) {
      await ctx.db.patch(existingByClerk._id, {
        email: args.email,
        name: args.name || existingByClerk.name,
        username: args.username || existingByClerk.username,
        avatar: args.avatar || existingByClerk.avatar,
        verified: true,
        isActive: true,
        lastLoginAt: Date.now(),
      });
      return existingByClerk._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      emailVisibility: false,
      verified: true,
      name: args.name,
      username: args.username,
      avatar: args.avatar,
      role: "user",
      isActive: true,
      isBanned: false,
      lastLoginAt: Date.now(),
    });
  },
});

export const updateUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      // User might not exist yet, create them
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        emailVisibility: false,
        verified: true,
        name: args.name,
        username: args.username,
        avatar: args.avatar,
        role: "user",
        isActive: true,
        isBanned: false,
        lastLoginAt: Date.now(),
      });
    }

    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name ?? user.name,
      username: args.username ?? user.username,
      avatar: args.avatar ?? user.avatar,
      lastLoginAt: Date.now(),
    });

    return user._id;
  },
});

export const deleteUserFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user) {
      // Soft delete by deactivating
      await ctx.db.patch(user._id, {
        isActive: false,
        clerkId: undefined,
      });
    }
  },
});

// ===================
// Queries
// ===================

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUserInternal(ctx);
  },
});

/**
 * Check if the current user has any tenant
 * Used to determine if user needs onboarding
 */
export const hasAnyTenant = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserInternal(ctx);
    if (!user) {
      return { hasTenant: false, isAuthenticated: false };
    }
    return {
      hasTenant: !!user.tenantId,
      isAuthenticated: true,
      tenantId: user.tenantId,
    };
  },
});

/**
 * Get the current user's tenant with details
 * Used for routing after login
 */
export const getCurrentUserTenant = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserInternal(ctx);
    if (!user || !user.tenantId) {
      return null;
    }

    const tenant = await ctx.db.get(user.tenantId);
    if (!tenant) {
      return null;
    }

    return {
      tenant,
      role: user.tenantRole || "user",
    };
  },
});

/**
 * Get the current user's pending approval status
 * Used by the pending-approval page
 */
export const getPendingApprovalStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserInternal(ctx);
    if (!user) {
      return { isAuthenticated: false };
    }

    if (!user.tenantId) {
      return { isAuthenticated: true, hasTenant: false };
    }

    const tenant = await ctx.db.get(user.tenantId);
    if (!tenant) {
      return { isAuthenticated: true, hasTenant: false };
    }

    return {
      isAuthenticated: true,
      hasTenant: true,
      tenant: {
        _id: tenant._id,
        name: tenant.name,
        displayName: tenant.displayName,
        slug: tenant.slug,
        status: tenant.status,
        rejectionReason: tenant.rejectionReason,
        _creationTime: tenant._creationTime,
        approvedAt: tenant.approvedAt,
      },
    };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const listTenantUsers = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const currentUser = await getCurrentUserInternal(ctx);
    if (!currentUser) {
      throw new Error("Authentication required");
    }

    // Check user has access to this tenant
    // Note: Platform admins do NOT have automatic tenant access
    if (currentUser.tenantId !== tenantId) {
      throw new Error("Access denied");
    }

    return await ctx.db
      .query("users")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

// ===================
// Mutations
// ===================

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    emailVisibility: v.optional(v.boolean()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
        emailNotifications: v.optional(v.boolean()),
        pushNotifications: v.optional(v.boolean()),
        timezone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserInternal(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.emailVisibility !== undefined) updates.emailVisibility = args.emailVisibility;
    if (args.preferences !== undefined) {
      updates.preferences = {
        ...user.preferences,
        ...args.preferences,
      };
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }

    return await ctx.db.get(user._id);
  },
});

export const inviteUser = mutation({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    // Simplified to just "user" role - only owners can invite users
  },
  handler: async (ctx, { tenantId, email }) => {
    await requireTenantOwner(ctx, tenantId);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingUser) {
      if (existingUser.tenantId === tenantId) {
        throw new Error("User is already a member of this tenant");
      }
      if (existingUser.tenantId) {
        throw new Error("User is already a member of another tenant");
      }

      // Add existing user to tenant as "user" role
      await ctx.db.patch(existingUser._id, {
        tenantId,
        tenantRole: "user",
        isActive: true,
      });
      return existingUser._id;
    }

    // Create pending user with "user" role
    return await ctx.db.insert("users", {
      email,
      emailVisibility: false,
      verified: false,
      role: "user",
      tenantId,
      tenantRole: "user",
      isActive: false,
      isBanned: false,
    });
  },
});

export const updateUserRole = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("user")),
  },
  handler: async (ctx, { tenantId, userId, role }) => {
    const { userId: currentUserId } = await requireTenantOwner(ctx, tenantId);

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.tenantId !== tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Cannot modify yourself
    if (userId === currentUserId) {
      throw new Error("Cannot modify your own role");
    }

    // Warn if demoting an owner
    if (targetUser.tenantRole === "owner" && role === "user") {
      // This is allowed - owner can demote other owners
    }

    await ctx.db.patch(userId, { tenantRole: role });
  },
});

export const removeUserFromTenant = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
  },
  handler: async (ctx, { tenantId, userId }) => {
    const { userId: currentUserId } = await requireTenantOwner(ctx, tenantId);

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.tenantId !== tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Cannot remove yourself
    if (userId === currentUserId) {
      throw new Error("Cannot remove yourself");
    }

    // Remove from tenant (keep user record)
    await ctx.db.patch(userId, {
      tenantId: undefined,
      tenantRole: undefined,
    });
  },
});

export const toggleUserBan = mutation({
  args: {
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    banned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, userId, banned, reason }) => {
    const { userId: currentUserId } = await requireTenantOwner(ctx, tenantId);

    const targetUser = await ctx.db.get(userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (targetUser.tenantId !== tenantId) {
      throw new Error("User does not belong to this tenant");
    }

    // Cannot ban yourself
    if (userId === currentUserId) {
      throw new Error("Cannot ban yourself");
    }

    await ctx.db.patch(userId, {
      isBanned: banned,
      bannedAt: banned ? Date.now() : undefined,
      bannedReason: banned ? reason : undefined,
    });
  },
});
