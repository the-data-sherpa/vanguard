import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
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
 * Generate a presigned upload URL for Convex file storage.
 * Requires admin access to the tenant.
 */
export const generateUploadUrl = mutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    // Verify user has admin access
    await requireTenantOwner(ctx, tenantId);

    // Generate upload URL from Convex storage
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save file metadata after successful upload.
 * Returns the file URL.
 */
export const saveFile = mutation({
  args: {
    tenantId: v.id("tenants"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, { tenantId, storageId, fileName, fileType, fileSize }) => {
    // Verify user has admin access
    await requireTenantOwner(ctx, tenantId);

    // Validate file size (max 2MB)
    if (fileSize > 2 * 1024 * 1024) {
      throw new Error("File size exceeds 2MB limit");
    }

    // Validate file type
    if (!fileType.startsWith("image/")) {
      throw new Error("Only image files are allowed");
    }

    // Get the URL for the uploaded file
    const url = await ctx.storage.getUrl(storageId as Id<"_storage">);
    if (!url) {
      throw new Error("Failed to get file URL");
    }

    return url;
  },
});

/**
 * Delete a file from storage.
 * Requires admin access to the tenant.
 */
export const deleteFile = mutation({
  args: {
    tenantId: v.id("tenants"),
    storageId: v.string(),
  },
  handler: async (ctx, { tenantId, storageId }) => {
    // Verify user has admin access
    await requireTenantOwner(ctx, tenantId);

    // Delete from storage
    await ctx.storage.delete(storageId as Id<"_storage">);
  },
});
