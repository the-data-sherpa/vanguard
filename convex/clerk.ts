import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Delete a user from Clerk
 * Used during orphaned user cleanup
 */
export const deleteClerkUser = internalAction({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error("[Clerk] Missing CLERK_SECRET_KEY environment variable");
      throw new Error("Missing CLERK_SECRET_KEY");
    }

    console.log(`[Clerk] Deleting user: ${clerkId}`);

    const response = await fetch(
      `https://api.clerk.com/v1/users/${clerkId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error(`[Clerk] Failed to delete user ${clerkId}: ${response.status} - ${errorText}`);
      throw new Error(`Failed to delete Clerk user: ${response.status}`);
    }

    if (response.status === 404) {
      console.log(`[Clerk] User ${clerkId} not found (already deleted)`);
    } else {
      console.log(`[Clerk] Successfully deleted user: ${clerkId}`);
    }

    return { success: true };
  },
});
