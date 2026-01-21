import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Authorization Helper
// ===================

async function requireTenantAccess(
  ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> }; db: any },
  tenantId: Id<"tenants">,
  requiredRole: "user" | "owner" = "owner"
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
    .withIndex("by_email", (q: any) => q.eq("email", email))
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

  const roleHierarchy: Record<string, number> = {
    user: 1,
    owner: 2,
  };

  const userRoleLevel = roleHierarchy[user.tenantRole || "user"] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  if (userRoleLevel < requiredRoleLevel) {
    throw new Error(`Access denied: requires ${requiredRole} role or higher`);
  }

  return { userId: user._id, tenantRole: user.tenantRole || "user" };
}

// ===================
// Queries
// ===================

/**
 * Get auto-post rules for a tenant
 */
export const get = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .unique();
  },
});

/**
 * Get auto-post rules (internal use for sync jobs)
 */
export const getInternal = internalQuery({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .unique();
  },
});

// ===================
// Mutations
// ===================

/**
 * Save auto-post rules for a tenant (create or update)
 * Requires owner role
 */
export const save = mutation({
  args: {
    tenantId: v.id("tenants"),
    enabled: v.boolean(),
    callTypes: v.array(v.string()),
    excludeMedical: v.boolean(),
    minUnits: v.optional(v.number()),
    delaySeconds: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, enabled, callTypes, excludeMedical, minUnits, delaySeconds }) => {
    // Verify user has owner access
    const { userId } = await requireTenantAccess(ctx, tenantId, "owner");

    // Check if rules already exist
    const existing = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .unique();

    if (existing) {
      // Update existing rules
      await ctx.db.patch(existing._id, {
        enabled,
        callTypes,
        excludeMedical,
        minUnits,
        delaySeconds,
        updatedAt: Date.now(),
      });

      // Log the update
      await ctx.db.insert("auditLogs", {
        tenantId,
        actorId: userId,
        actorType: "user",
        action: "autopost_rules.updated",
        targetType: "autoPostRules",
        targetId: existing._id,
        details: { enabled, callTypesCount: callTypes.length, excludeMedical },
        result: "success",
      });

      return existing._id;
    } else {
      // Create new rules
      const id = await ctx.db.insert("autoPostRules", {
        tenantId,
        enabled,
        callTypes,
        excludeMedical,
        minUnits,
        delaySeconds,
        createdAt: Date.now(),
      });

      // Log the creation
      await ctx.db.insert("auditLogs", {
        tenantId,
        actorId: userId,
        actorType: "user",
        action: "autopost_rules.created",
        targetType: "autoPostRules",
        targetId: id,
        details: { enabled, callTypesCount: callTypes.length, excludeMedical },
        result: "success",
      });

      return id;
    }
  },
});

/**
 * Delete auto-post rules for a tenant
 * Requires owner role
 */
export const remove = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    // Verify user has owner access
    const { userId } = await requireTenantAccess(ctx, tenantId, "owner");

    const existing = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);

      // Log the deletion
      await ctx.db.insert("auditLogs", {
        tenantId,
        actorId: userId,
        actorType: "user",
        action: "autopost_rules.deleted",
        targetType: "autoPostRules",
        targetId: existing._id,
        details: {},
        result: "success",
      });
    }
  },
});
