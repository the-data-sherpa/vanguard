import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";
import Stripe from "stripe";
import { Id } from "./_generated/dataModel";
import {
  getPublicTenantInfoHandler,
  getPublicStatsHandler,
  getPublicIncidentsHandler,
  getPublicWeatherAlertsHandler,
  getIncidentHistoryHandler,
  getTenantByIdHandler,
} from "./publicApi";

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

    // Verify the webhook signature (use async version for Convex runtime)
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-12-15.clover",
      });
      event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
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

// ===================
// CORS Helper
// ===================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsResponse(body: string | null, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

// ===================
// Facebook OAuth Callback
// ===================

// OPTIONS handler for CORS preflight
http.route({
  path: "/facebook/connect",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return corsResponse(null, 204);
  }),
});

http.route({
  path: "/facebook/connect",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { tenantId, pageId, pageName, pageToken, connectedBy } = body;

      if (!tenantId || !pageId || !pageName || !pageToken || !connectedBy) {
        return corsResponse("Missing required fields", 400);
      }

      await ctx.runMutation(internal.facebook.saveConnection, {
        tenantId: tenantId as Id<"tenants">,
        pageId,
        pageName,
        pageToken,
        connectedBy,
      });

      return corsResponse(JSON.stringify({ success: true }), 200, { "Content-Type": "application/json" });
    } catch (error) {
      console.error("[Facebook Connect] Error:", error);
      return corsResponse("Internal server error", 500);
    }
  }),
});

/**
 * Save multiple Facebook pages after OAuth
 * Used by the new multi-page OAuth flow
 */
http.route({
  path: "/facebook/connect-pages",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return corsResponse(null, 204);
  }),
});

http.route({
  path: "/facebook/connect-pages",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { tenantId, pages, connectedBy } = body;

      if (!tenantId || !pages || !Array.isArray(pages) || pages.length === 0 || !connectedBy) {
        return corsResponse("Missing required fields", 400);
      }

      // Validate each page has required fields
      for (const page of pages) {
        if (!page.pageId || !page.pageName || !page.pageToken) {
          return corsResponse("Invalid page data: missing pageId, pageName, or pageToken", 400);
        }
      }

      await ctx.runMutation(internal.facebook.savePages, {
        tenantId: tenantId as Id<"tenants">,
        pages: pages.map((p: { pageId: string; pageName: string; pageToken: string; tokenExpiresAt?: number }) => ({
          pageId: p.pageId,
          pageName: p.pageName,
          pageToken: p.pageToken,
          tokenExpiresAt: p.tokenExpiresAt,
        })),
        connectedBy,
      });

      return corsResponse(JSON.stringify({ success: true, pagesAdded: pages.length }), 200, { "Content-Type": "application/json" });
    } catch (error) {
      console.error("[Facebook Connect Pages] Error:", error);
      return corsResponse("Internal server error", 500);
    }
  }),
});

/**
 * Reset Facebook sync state for active incidents
 * Used when switching active pages to re-post incidents
 */
http.route({
  path: "/facebook/reset-sync-state",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return corsResponse(null, 204);
  }),
});

http.route({
  path: "/facebook/reset-sync-state",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { tenantId } = body;

      if (!tenantId) {
        return corsResponse("Missing tenantId", 400);
      }

      const result = await ctx.runMutation(internal.facebookSync.resetSyncState, {
        tenantId: tenantId as Id<"tenants">,
      });

      return corsResponse(JSON.stringify({ success: true, resetCount: result.resetCount }), 200, { "Content-Type": "application/json" });
    } catch (error) {
      console.error("[Facebook Reset Sync State] Error:", error);
      return corsResponse("Internal server error", 500);
    }
  }),
});

// ===================
// Tenant lookup for OAuth redirects (rate-limited)
// ===================

http.route({
  path: "/tenants/:tenantId",
  method: "GET",
  handler: getTenantByIdHandler,
});

// ===================
// Public Status API (rate-limited)
// ===================
// These endpoints provide public access to status page data with rate limiting.
// Rate limits: 60 req/min per IP, 200 req/min per tenant

http.route({
  path: "/api/public/status/info",
  method: "GET",
  handler: getPublicTenantInfoHandler,
});

http.route({
  path: "/api/public/status/stats",
  method: "GET",
  handler: getPublicStatsHandler,
});

http.route({
  path: "/api/public/status/incidents",
  method: "GET",
  handler: getPublicIncidentsHandler,
});

http.route({
  path: "/api/public/status/weather",
  method: "GET",
  handler: getPublicWeatherAlertsHandler,
});

http.route({
  path: "/api/public/status/history",
  method: "GET",
  handler: getIncidentHistoryHandler,
});

export default http;
