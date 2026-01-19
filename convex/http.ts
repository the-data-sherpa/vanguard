import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
      return new Response("Server configuration error", { status: 500 });
    }

    // Get headers for verification
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Get the body
    const payload = await request.text();

    // Verify the webhook
    const wh = new Webhook(webhookSecret);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    // Handle the event
    const eventType = evt.type;

    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

        const primaryEmail = email_addresses?.find((e: EmailAddress) => e.id === evt.data.primary_email_address_id);
        const email = primaryEmail?.email_address;

        if (!email) {
          console.error("No email found for user:", id);
          return new Response("No email found", { status: 400 });
        }

        const name = [first_name, last_name].filter(Boolean).join(" ") || undefined;

        if (eventType === "user.created") {
          await ctx.runMutation(internal.users.syncUserFromClerk, {
            clerkId: id,
            email,
            name,
            username: username || undefined,
            avatar: image_url || undefined,
          });
        } else {
          await ctx.runMutation(internal.users.updateUserFromClerk, {
            clerkId: id,
            email,
            name,
            username: username || undefined,
            avatar: image_url || undefined,
          });
        }
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await ctx.runMutation(internal.users.deleteUserFromClerk, {
            clerkId: id,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

// Type definitions for Clerk webhook events
interface EmailAddress {
  id: string;
  email_address: string;
}

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: EmailAddress[];
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    username?: string;
  };
}

export default http;
