import { v } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
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
// Queries
// ===================

/**
 * List all post templates for a tenant
 */
export const list = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    return await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});

/**
 * Get a single post template
 */
export const get = query({
  args: {
    templateId: v.id("postTemplates"),
  },
  handler: async (ctx, { templateId }) => {
    return await ctx.db.get(templateId);
  },
});

/**
 * Get the default template for a call type
 */
export const getForCallType = query({
  args: {
    tenantId: v.id("tenants"),
    callType: v.string(),
  },
  handler: async (ctx, { tenantId, callType }) => {
    const templates = await ctx.db
      .query("postTemplates")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .collect();

    // Find template that matches this call type
    const matchingTemplate = templates.find(
      (t) => t.callTypes.includes(callType) || t.callTypes.includes("*")
    );

    // Fall back to default template
    if (!matchingTemplate) {
      return templates.find((t) => t.isDefault) || null;
    }

    return matchingTemplate;
  },
});

// ===================
// Mutations
// ===================

/**
 * Create a new post template
 */
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    name: v.string(),
    callTypes: v.array(v.string()),
    template: v.string(),
    includeUnits: v.boolean(),
    includeMap: v.boolean(),
    hashtags: v.array(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireTenantOwner(ctx, args.tenantId);

    // If this is being set as default, unset other defaults
    if (args.isDefault) {
      const existingTemplates = await ctx.db
        .query("postTemplates")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      for (const template of existingTemplates) {
        if (template.isDefault) {
          await ctx.db.patch(template._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("postTemplates", {
      tenantId: args.tenantId,
      name: args.name,
      callTypes: args.callTypes,
      template: args.template,
      includeUnits: args.includeUnits,
      includeMap: args.includeMap,
      hashtags: args.hashtags,
      isDefault: args.isDefault || false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a post template
 */
export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    templateId: v.id("postTemplates"),
    name: v.optional(v.string()),
    callTypes: v.optional(v.array(v.string())),
    template: v.optional(v.string()),
    includeUnits: v.optional(v.boolean()),
    includeMap: v.optional(v.boolean()),
    hashtags: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireTenantOwner(ctx, args.tenantId);

    const existingTemplate = await ctx.db.get(args.templateId);
    if (!existingTemplate || existingTemplate.tenantId !== args.tenantId) {
      throw new Error("Template not found");
    }

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingTemplates = await ctx.db
        .query("postTemplates")
        .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
        .collect();

      for (const template of existingTemplates) {
        if (template._id !== args.templateId && template.isDefault) {
          await ctx.db.patch(template._id, { isDefault: false });
        }
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.callTypes !== undefined) updates.callTypes = args.callTypes;
    if (args.template !== undefined) updates.template = args.template;
    if (args.includeUnits !== undefined) updates.includeUnits = args.includeUnits;
    if (args.includeMap !== undefined) updates.includeMap = args.includeMap;
    if (args.hashtags !== undefined) updates.hashtags = args.hashtags;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.templateId, updates);
    return args.templateId;
  },
});

/**
 * Delete a post template
 */
export const remove = mutation({
  args: {
    tenantId: v.id("tenants"),
    templateId: v.id("postTemplates"),
  },
  handler: async (ctx, { tenantId, templateId }) => {
    await requireTenantOwner(ctx, tenantId);

    const template = await ctx.db.get(templateId);
    if (!template || template.tenantId !== tenantId) {
      throw new Error("Template not found");
    }

    await ctx.db.delete(templateId);
    return templateId;
  },
});

// ===================
// Auto-Post Rules
// ===================

/**
 * Get auto-post rules for a tenant
 */
export const getAutoPostRules = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const rules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
      .first();

    // Return default rules if none exist
    if (!rules) {
      return {
        enabled: false,
        callTypes: [],
        excludeMedical: true,
        minUnits: undefined,
        delaySeconds: undefined,
      };
    }

    return rules;
  },
});

/**
 * Update auto-post rules
 */
export const updateAutoPostRules = mutation({
  args: {
    tenantId: v.id("tenants"),
    enabled: v.boolean(),
    callTypes: v.array(v.string()),
    excludeMedical: v.boolean(),
    minUnits: v.optional(v.number()),
    delaySeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireTenantOwner(ctx, args.tenantId);

    const existingRules = await ctx.db
      .query("autoPostRules")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .first();

    if (existingRules) {
      // Update existing
      await ctx.db.patch(existingRules._id, {
        enabled: args.enabled,
        callTypes: args.callTypes,
        excludeMedical: args.excludeMedical,
        minUnits: args.minUnits,
        delaySeconds: args.delaySeconds,
        updatedAt: Date.now(),
      });
      return existingRules._id;
    } else {
      // Create new
      return await ctx.db.insert("autoPostRules", {
        tenantId: args.tenantId,
        enabled: args.enabled,
        callTypes: args.callTypes,
        excludeMedical: args.excludeMedical,
        minUnits: args.minUnits,
        delaySeconds: args.delaySeconds,
        createdAt: Date.now(),
      });
    }
  },
});

// ===================
// Template Defaults
// ===================

/**
 * Get the default template content
 * Used when no custom template is configured
 */
export const DEFAULT_TEMPLATE = `{{STATUS_EMOJI}} {{STATUS_TEXT}}

Type: {{CALL_TYPE}}
Location: {{ADDRESS}}

{{#UNITS}}
Units:
{{UNITS_LIST}}
{{/UNITS}}

Time: {{TIME}}

{{#UPDATES}}
Updates:
{{UPDATES_LIST}}
{{/UPDATES}}

{{HASHTAGS}}`;
