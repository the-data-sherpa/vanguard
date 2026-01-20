import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===================
// Queries
// ===================

/**
 * List notes for an incident
 */
export const listByIncident = query({
  args: {
    incidentId: v.id("incidents"),
  },
  handler: async (ctx, { incidentId }) => {
    return await ctx.db
      .query("incidentNotes")
      .withIndex("by_incident", (q) => q.eq("incidentId", incidentId))
      .order("desc")
      .collect();
  },
});

/**
 * Get a single note by ID
 */
export const get = query({
  args: { id: v.id("incidentNotes") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// ===================
// Mutations
// ===================

/**
 * Add a note to an incident
 */
export const add = mutation({
  args: {
    tenantId: v.id("tenants"),
    incidentId: v.id("incidents"),
    content: v.string(),
    authorId: v.id("users"),
    authorName: v.string(),
  },
  handler: async (ctx, { tenantId, incidentId, content, authorId, authorName }) => {
    // Verify the incident exists and belongs to the tenant
    const incident = await ctx.db.get(incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }
    if (incident.tenantId !== tenantId) {
      throw new Error("Incident does not belong to this tenant");
    }

    return await ctx.db.insert("incidentNotes", {
      tenantId,
      incidentId,
      content: content.trim(),
      authorId,
      authorName,
    });
  },
});

/**
 * Update a note (author only)
 */
export const update = mutation({
  args: {
    id: v.id("incidentNotes"),
    content: v.string(),
    authorId: v.id("users"),
  },
  handler: async (ctx, { id, content, authorId }) => {
    const note = await ctx.db.get(id);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only the author can edit their note
    if (note.authorId !== authorId) {
      throw new Error("You can only edit your own notes");
    }

    await ctx.db.patch(id, {
      content: content.trim(),
      isEdited: true,
      editedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Remove a note (author or admin)
 */
export const remove = mutation({
  args: {
    id: v.id("incidentNotes"),
    authorId: v.id("users"),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, authorId, isAdmin }) => {
    const note = await ctx.db.get(id);
    if (!note) {
      throw new Error("Note not found");
    }

    // Only the author or an admin can delete a note
    if (note.authorId !== authorId && !isAdmin) {
      throw new Error("You can only delete your own notes");
    }

    await ctx.db.delete(id);
    return id;
  },
});
