import { v } from "convex/values";
import { query, mutation, action, internalMutation, MutationCtx, ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCallTypeDescription } from "./callTypes";

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
      console.log(`[Facebook] Token expired for tenant ${tenant.slug || tenantId}`);
      return null;
    }

    return {
      pageId: tenant.facebookPageId,
      pageToken: tenant.facebookPageToken,
    };
  },
});

// ===================
// Actions
// ===================

/**
 * Send a test post to Facebook
 * Allows users to verify their connection is working
 */
export const sendTestPost = action({
  args: {
    tenantId: v.id("tenants"),
    callType: v.optional(v.string()),
  },
  handler: async (ctx, { tenantId, callType }): Promise<{
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
  }> => {
    // Get page credentials
    const credentials = await ctx.runMutation(internal.facebook.getPageToken, {
      tenantId,
    });

    if (!credentials || !credentials.pageToken || !credentials.pageId) {
      return {
        success: false,
        error: "Facebook not connected or token expired",
      };
    }

    // Get tenant info for the post
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      return {
        success: false,
        error: "Tenant not found",
      };
    }

    // Build test post message
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const callTypeDesc = callType ? getCallTypeDescription(callType) : "Structure Fire";
    const callTypeCode = callType || "SF";

    const message = `🧪 TEST POST - PLEASE IGNORE

🚨 ACTIVE INCIDENT

📋 Type: ${callTypeDesc}

📍 123 Test Street, Anytown, NC

🚒 Units:
• E1 - En Route
• T1 - Dispatched
• M1 - On Scene

⏰ Dispatch Time: ${timeStr}

---
This is a test post from ${tenant.displayName || tenant.name} to verify the Facebook integration is working correctly.

Posted: ${dateStr} at ${timeStr}

#TestPost #Vanguard`;

    try {
      // Post to Facebook using v24.0 API
      const url = `https://graph.facebook.com/v24.0/${credentials.pageId}/feed`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          access_token: credentials.pageToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Facebook] Test post failed:", errorText);
        return {
          success: false,
          error: `Facebook API error: ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[Facebook] Test post created: ${result.id}`);

      return {
        success: true,
        postId: result.id,
        postUrl: `https://facebook.com/${result.id}`,
      };
    } catch (error) {
      console.error("[Facebook] Test post error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
