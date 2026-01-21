import { v } from "convex/values";
import { query, mutation, action, internalMutation, MutationCtx, ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helper
// ===================

async function requireTenantOwner(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throw new Error("User email not available");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  if (user.isBanned) {
    throw new Error("User is banned");
  }

  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  if (user.tenantRole !== "owner") {
    throw new Error("Access denied: requires owner role");
  }

  return { userId: user._id, tenantRole: user.tenantRole };
}

// ===================
// Mutations
// ===================

/**
 * Save Facebook page connection after OAuth callback
 * Called internally by the OAuth callback route
 */
export const saveConnection = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    pageId: v.string(),
    pageName: v.string(),
    pageToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
    connectedBy: v.string(),  // Clerk user ID
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ctx.db.patch(args.tenantId, {
      facebookPageId: args.pageId,
      facebookPageName: args.pageName,
      facebookPageToken: args.pageToken,
      facebookTokenExpiresAt: args.tokenExpiresAt,
      facebookConnectedBy: args.connectedBy,
      facebookConnectedAt: Date.now(),
    });

    console.log(`[Facebook] Connected page "${args.pageName}" to tenant ${tenant.slug}`);

    return { success: true };
  },
});

/**
 * Disconnect Facebook page from tenant
 */
export const disconnect = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    await requireTenantOwner(ctx, tenantId);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const oldPageName = tenant.facebookPageName;

    await ctx.db.patch(tenantId, {
      facebookPageId: undefined,
      facebookPageName: undefined,
      facebookPageToken: undefined,
      facebookTokenExpiresAt: undefined,
      facebookConnectedBy: undefined,
      facebookConnectedAt: undefined,
    });

    console.log(`[Facebook] Disconnected page "${oldPageName}" from tenant ${tenant.slug}`);

    return { success: true };
  },
});

/**
 * Update Facebook page token (for token refresh)
 */
export const updateToken = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    pageToken: v.string(),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tenantId, {
      facebookPageToken: args.pageToken,
      facebookTokenExpiresAt: args.tokenExpiresAt,
    });

    return { success: true };
  },
});

// ===================
// Queries
// ===================

/**
 * Get Facebook connection status for a tenant
 */
export const getConnectionStatus = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      return null;
    }

    const isExpired = tenant.facebookTokenExpiresAt
      ? tenant.facebookTokenExpiresAt < Date.now()
      : false;

    return {
      isConnected: !!tenant.facebookPageId,
      pageId: tenant.facebookPageId,
      pageName: tenant.facebookPageName,
      connectedAt: tenant.facebookConnectedAt,
      isExpired,
    };
  },
});

/**
 * Get page token for internal use (sync jobs)
 */
export const getPageToken = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant || !tenant.facebookPageToken) {
      return null;
    }

    // Check if token is expired
    if (tenant.facebookTokenExpiresAt && tenant.facebookTokenExpiresAt < Date.now()) {
      return null;
    }

    return {
      pageId: tenant.facebookPageId,
      pageToken: tenant.facebookPageToken,
    };
  },
});
