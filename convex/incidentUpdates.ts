import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helper
// ===================

async function requireTenantMember(
  ctx: QueryCtx | MutationCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; clerkId: string | undefined; tenantRole: string }> {
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

  return { userId: user._id, clerkId: user.clerkId, tenantRole: user.tenantRole || "user" };
}

// ===================
// Queries
// ===================

/**
 * Get all updates for an incident
 */
export const listByIncident = query({
  args: {
    tenantId: v.id("tenants"),
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { tenantId, incidentId }) => {
    await requireTenantMember(ctx, tenantId);

    // Verify incident belongs to tenant
    const incident = await ctx.db.get(incidentId);
    if (!incident || incident.tenantId !== tenantId) {
      return [];
    }

    const updates = await ctx.db
      .query("incidentUpdates")
      .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
      .order("desc")
      .collect();

    // Enrich with creator info
    const enrichedUpdates = await Promise.all(
      updates.map(async (update) => {
        let creator = null;

        // Try to find creator - createdBy could be either a Clerk ID or a Convex user ID
        if (update.createdBy) {
          // First, try looking up by Clerk ID (most common case)
          creator = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", update.createdBy))
            .unique();

          // If not found by Clerk ID, try looking up as a Convex user ID
          if (!creator) {
            try {
              // Check if it looks like a Convex ID (they typically start with a specific format)
              const possibleUserId = update.createdBy as Id<"users">;
              creator = await ctx.db.get(possibleUserId);
            } catch {
              // Not a valid Convex ID, that's okay
            }
          }
        }

        return {
          ...update,
          creatorName: creator?.name || creator?.email || "Unknown User",
          creatorAvatar: creator?.avatar,
        };
      })
    );

    return enrichedUpdates;
  },
});

/**
 * Get pending updates across all incidents (for sync job)
 */
export const listPendingSync = query({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 100 }) => {
    await requireTenantMember(ctx, tenantId);

    const updates = await ctx.db
      .query("incidentUpdates")
      .withIndex("by_tenant_unsync", (q) =>
        q.eq("tenantId", tenantId).eq("isSyncedToFacebook", false)
      )
      .take(limit);

    return updates;
  },
});

// ===================
// Mutations
// ===================

/**
 * Add an update to an incident
 * Any tenant member can add updates (both owner and user roles)
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    incidentId: v.id("incidents"),
    content: v.string(),
  },
  handler: async (ctx, { tenantId, incidentId, content }) => {
    const { userId, clerkId } = await requireTenantMember(ctx, tenantId);

    // Use clerkId if available, otherwise use the user's _id as string
    const createdByIdentifier = clerkId || userId;

    // Verify incident belongs to tenant
    const incident = await ctx.db.get(incidentId);
    if (!incident || incident.tenantId !== tenantId) {
      throw new Error("Incident not found");
    }

    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Update content cannot be empty");
    }

    if (trimmedContent.length > 2000) {
      throw new Error("Update content is too long (max 2000 characters)");
    }

    // Create the update
    const updateId = await ctx.db.insert("incidentUpdates", {
      tenantId,
      incidentId,
      content: trimmedContent,
      createdBy: String(createdByIdentifier),
      createdAt: Date.now(),
      isSyncedToFacebook: false,
    });

    // Mark the incident as needing a Facebook update (if already posted)
    if (incident.isSyncedToFacebook) {
      await ctx.db.patch(incidentId, {
        needsFacebookUpdate: true,
      });
    }

    return updateId;
  },
});

/**
 * Edit an existing update
 * Only the creator or an owner can edit
 */
export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    updateId: v.id("incidentUpdates"),
    content: v.string(),
  },
  handler: async (ctx, { tenantId, updateId, content }) => {
    const { clerkId, tenantRole } = await requireTenantMember(ctx, tenantId);

    const existingUpdate = await ctx.db.get(updateId);
    if (!existingUpdate || existingUpdate.tenantId !== tenantId) {
      throw new Error("Update not found");
    }

    // Check permission: must be creator or owner
    if (existingUpdate.createdBy !== clerkId && tenantRole !== "owner") {
      throw new Error("You can only edit your own updates");
    }

    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Update content cannot be empty");
    }

    if (trimmedContent.length > 2000) {
      throw new Error("Update content is too long (max 2000 characters)");
    }

    // Update the record
    await ctx.db.patch(updateId, {
      content: trimmedContent,
      updatedAt: Date.now(),
      // Mark as needing re-sync if it was already synced
      isSyncedToFacebook: existingUpdate.isSyncedToFacebook ? false : existingUpdate.isSyncedToFacebook,
    });

    // Mark incident as needing update
    const incident = await ctx.db.get(existingUpdate.incidentId);
    if (incident?.isSyncedToFacebook) {
      await ctx.db.patch(existingUpdate.incidentId, {
        needsFacebookUpdate: true,
      });
    }

    return updateId;
  },
});

/**
 * Delete an update
 * Only the creator or an owner can delete
 */
export const remove = mutation({
  args: {
    tenantId: v.id("tenants"),
    updateId: v.id("incidentUpdates"),
  },
  handler: async (ctx, { tenantId, updateId }) => {
    const { clerkId, tenantRole } = await requireTenantMember(ctx, tenantId);

    const existingUpdate = await ctx.db.get(updateId);
    if (!existingUpdate || existingUpdate.tenantId !== tenantId) {
      throw new Error("Update not found");
    }

    // Check permission: must be creator or owner
    if (existingUpdate.createdBy !== clerkId && tenantRole !== "owner") {
      throw new Error("You can only delete your own updates");
    }

    await ctx.db.delete(updateId);

    // Mark incident as needing update if it was synced
    const incident = await ctx.db.get(existingUpdate.incidentId);
    if (incident?.isSyncedToFacebook) {
      await ctx.db.patch(existingUpdate.incidentId, {
        needsFacebookUpdate: true,
      });
    }

    return updateId;
  },
});

/**
 * Mark updates as synced (internal use by sync job)
 */
export const markSynced = mutation({
  args: {
    updateIds: v.array(v.id("incidentUpdates")),
  },
  handler: async (ctx, { updateIds }) => {
    const now = Date.now();

    for (const updateId of updateIds) {
      await ctx.db.patch(updateId, {
        isSyncedToFacebook: true,
        facebookSyncedAt: now,
        syncError: undefined,
      });
    }

    return { synced: updateIds.length };
  },
});

/**
 * Mark update sync as failed (internal use by sync job)
 */
export const markSyncFailed = mutation({
  args: {
    updateId: v.id("incidentUpdates"),
    error: v.string(),
  },
  handler: async (ctx, { updateId, error }) => {
    await ctx.db.patch(updateId, {
      syncError: error,
    });

    return updateId;
  },
});
