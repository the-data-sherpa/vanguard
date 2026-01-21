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
 * Save Facebook page connection after OAuth callback (legacy single-page)
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
 * Save multiple Facebook pages after OAuth callback
 * Called internally by the OAuth callback route
 */
export const savePages = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    pages: v.array(v.object({
      pageId: v.string(),
      pageName: v.string(),
      pageToken: v.string(),
      tokenExpiresAt: v.optional(v.number()),
    })),
    connectedBy: v.string(),  // Clerk user ID
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const now = Date.now();
    const existingPages = tenant.facebookPages || [];

    // Create new page entries
    const newPages = args.pages.map((page) => ({
      pageId: page.pageId,
      pageName: page.pageName,
      pageToken: page.pageToken,
      tokenExpiresAt: page.tokenExpiresAt,
      connectedBy: args.connectedBy,
      connectedAt: now,
    }));

    // Merge with existing pages (update if pageId exists, add if new)
    const mergedPages = [...existingPages];
    for (const newPage of newPages) {
      const existingIndex = mergedPages.findIndex((p) => p.pageId === newPage.pageId);
      if (existingIndex >= 0) {
        // Update existing page
        mergedPages[existingIndex] = newPage;
      } else {
        // Add new page
        mergedPages.push(newPage);
      }
    }

    // Set the first new page as active if no active page is set
    const activePageId = tenant.activeFacebookPageId || args.pages[0]?.pageId;

    await ctx.db.patch(args.tenantId, {
      facebookPages: mergedPages,
      activeFacebookPageId: activePageId,
      // Also update legacy fields with active page for backward compatibility
      facebookPageId: activePageId,
      facebookPageName: mergedPages.find((p) => p.pageId === activePageId)?.pageName,
      facebookPageToken: mergedPages.find((p) => p.pageId === activePageId)?.pageToken,
      facebookTokenExpiresAt: mergedPages.find((p) => p.pageId === activePageId)?.tokenExpiresAt,
      facebookConnectedBy: args.connectedBy,
      facebookConnectedAt: now,
    });

    const pageNames = args.pages.map((p) => p.pageName).join(", ");
    console.log(`[Facebook] Connected ${args.pages.length} pages to tenant ${tenant.slug}: ${pageNames}`);

    return { success: true, pagesAdded: args.pages.length };
  },
});

/**
 * Set the active Facebook page for posting
 */
export const setActivePage = mutation({
  args: {
    tenantId: v.id("tenants"),
    pageId: v.string(),
  },
  handler: async (ctx, { tenantId, pageId }) => {
    await requireTenantOwner(ctx, tenantId);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const pages = tenant.facebookPages || [];
    const page = pages.find((p) => p.pageId === pageId);
    if (!page) {
      throw new Error("Page not found in connected pages");
    }

    // Update active page and sync legacy fields
    await ctx.db.patch(tenantId, {
      activeFacebookPageId: pageId,
      // Update legacy fields for backward compatibility
      facebookPageId: page.pageId,
      facebookPageName: page.pageName,
      facebookPageToken: page.pageToken,
      facebookTokenExpiresAt: page.tokenExpiresAt,
    });

    console.log(`[Facebook] Set active page to "${page.pageName}" for tenant ${tenant.slug}`);

    return { success: true, pageName: page.pageName };
  },
});

/**
 * Remove a Facebook page from the tenant
 */
export const removePage = mutation({
  args: {
    tenantId: v.id("tenants"),
    pageId: v.string(),
  },
  handler: async (ctx, { tenantId, pageId }) => {
    await requireTenantOwner(ctx, tenantId);

    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const pages = tenant.facebookPages || [];
    const pageToRemove = pages.find((p) => p.pageId === pageId);
    const updatedPages = pages.filter((p) => p.pageId !== pageId);

    // Determine new active page
    let newActivePageId = tenant.activeFacebookPageId;
    if (tenant.activeFacebookPageId === pageId) {
      // If we're removing the active page, select another one or clear
      newActivePageId = updatedPages.length > 0 ? updatedPages[0].pageId : undefined;
    }

    const newActivePage = updatedPages.find((p) => p.pageId === newActivePageId);

    await ctx.db.patch(tenantId, {
      facebookPages: updatedPages,
      activeFacebookPageId: newActivePageId,
      // Update legacy fields
      facebookPageId: newActivePage?.pageId,
      facebookPageName: newActivePage?.pageName,
      facebookPageToken: newActivePage?.pageToken,
      facebookTokenExpiresAt: newActivePage?.tokenExpiresAt,
      // Clear legacy connected info if no pages left
      ...(updatedPages.length === 0 && {
        facebookConnectedBy: undefined,
        facebookConnectedAt: undefined,
      }),
    });

    console.log(`[Facebook] Removed page "${pageToRemove?.pageName}" from tenant ${tenant.slug}`);

    return { success: true, remainingPages: updatedPages.length };
  },
});

/**
 * Disconnect all Facebook pages from tenant
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
    const pageCount = tenant.facebookPages?.length || 1;

    await ctx.db.patch(tenantId, {
      // Clear legacy fields
      facebookPageId: undefined,
      facebookPageName: undefined,
      facebookPageToken: undefined,
      facebookTokenExpiresAt: undefined,
      facebookConnectedBy: undefined,
      facebookConnectedAt: undefined,
      // Clear multi-page fields
      facebookPages: undefined,
      activeFacebookPageId: undefined,
    });

    console.log(`[Facebook] Disconnected ${pageCount} page(s) from tenant ${tenant.slug} (was: "${oldPageName}")`);

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
 * Returns both legacy single-page info and multi-page info
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

    const now = Date.now();
    const pages = tenant.facebookPages || [];

    // Check if any page token is expired
    const hasExpiredToken = pages.some((p) => p.tokenExpiresAt && p.tokenExpiresAt < now);
    const legacyIsExpired = tenant.facebookTokenExpiresAt
      ? tenant.facebookTokenExpiresAt < now
      : false;

    // Determine if connected (has pages in new array or legacy fields)
    const isConnected = pages.length > 0 || !!tenant.facebookPageId;

    // Map pages with expiration status
    const pagesWithStatus = pages.map((p) => ({
      pageId: p.pageId,
      pageName: p.pageName,
      connectedBy: p.connectedBy,
      connectedAt: p.connectedAt,
      tokenExpiresAt: p.tokenExpiresAt,
      isExpired: p.tokenExpiresAt ? p.tokenExpiresAt < now : false,
      isActive: p.pageId === tenant.activeFacebookPageId,
    }));

    return {
      isConnected,
      // Legacy single-page fields (for backward compatibility)
      pageId: tenant.facebookPageId,
      pageName: tenant.facebookPageName,
      connectedAt: tenant.facebookConnectedAt,
      isExpired: hasExpiredToken || legacyIsExpired,
      // Multi-page fields
      pages: pagesWithStatus,
      activePageId: tenant.activeFacebookPageId,
      activePageName: pages.find((p) => p.pageId === tenant.activeFacebookPageId)?.pageName || tenant.facebookPageName,
    };
  },
});

/**
 * Get page token for internal use (sync jobs)
 * Uses active page from facebookPages array with fallback to legacy fields
 */
export const getPageToken = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      return null;
    }

    const now = Date.now();
    const pages = tenant.facebookPages || [];

    // Try to get active page from pages array first
    if (pages.length > 0 && tenant.activeFacebookPageId) {
      const activePage = pages.find((p) => p.pageId === tenant.activeFacebookPageId);
      if (activePage) {
        // Check if token is expired
        if (activePage.tokenExpiresAt && activePage.tokenExpiresAt < now) {
          console.log(`[Facebook] Token expired for active page "${activePage.pageName}" on tenant ${tenant.slug || tenantId}`);
          return null;
        }
        return {
          pageId: activePage.pageId,
          pageToken: activePage.pageToken,
        };
      }
    }

    // Fall back to legacy fields
    if (!tenant.facebookPageToken) {
      return null;
    }

    // Check if legacy token is expired
    if (tenant.facebookTokenExpiresAt && tenant.facebookTokenExpiresAt < now) {
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
