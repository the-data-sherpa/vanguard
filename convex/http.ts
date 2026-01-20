import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";
import Stripe from "stripe";
import { Id } from "./_generated/dataModel";

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

// ===================
// Stripe Webhook
// ===================

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return new Response("Server configuration error", { status: 500 });
    }

    // Get the signature header
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    // Get the raw body
    const payload = await request.text();

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-12-15.clover",
      });
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook verification failed:", err);
      return new Response("Invalid webhook signature", { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const subscriptionId = session.subscription as string;

        if (tenantId && subscriptionId) {
          // Get subscription details from Stripe
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2025-12-15.clover",
          });
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // In newer Stripe API, current_period_end is on subscription items
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

          await ctx.runMutation(internal.billing.syncFromStripe, {
            tenantId: tenantId as Id<"tenants">,
            subscriptionId,
            status: subscription.status === "active" ? "active" : "trialing",
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });

          console.log(`[Stripe Webhook] Checkout completed for tenant ${tenantId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (tenantId) {
          // Map Stripe status to our status
          let status: "active" | "past_due" | "canceled" | "trialing" = "active";
          if (subscription.status === "past_due") {
            status = "past_due";
          } else if (subscription.status === "canceled") {
            status = "canceled";
          } else if (subscription.status === "trialing") {
            status = "trialing";
          }

          // In newer Stripe API, current_period_end is on subscription items
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

          await ctx.runMutation(internal.billing.syncFromStripe, {
            tenantId: tenantId as Id<"tenants">,
            subscriptionId: subscription.id,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });

          console.log(`[Stripe Webhook] Subscription updated for tenant ${tenantId}: ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (tenantId) {
          await ctx.runMutation(internal.billing.markSubscriptionCanceled, {
            tenantId: tenantId as Id<"tenants">,
          });

          console.log(`[Stripe Webhook] Subscription deleted for tenant ${tenantId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // In newer Stripe API, subscription is accessed via parent.subscription_details
        const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
          ? invoice.parent.subscription_details.subscription
          : (invoice.parent?.subscription_details?.subscription as Stripe.Subscription | undefined)?.id;

        if (subscriptionId) {
          // Get the subscription to find the tenant
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2025-12-15.clover",
          });
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const tenantId = subscription.metadata?.tenantId;

          if (tenantId) {
            // In newer Stripe API, current_period_end is on subscription items
            const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

            await ctx.runMutation(internal.billing.syncFromStripe, {
              tenantId: tenantId as Id<"tenants">,
              subscriptionId,
              status: "past_due",
              currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });

            console.log(`[Stripe Webhook] Payment failed for tenant ${tenantId}`);
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
