import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// ===================
// Stripe Client
// ===================

function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover",
  });
}

// ===================
// Internal Actions
// ===================

/**
 * Create a Stripe customer for a tenant
 * Called when a new tenant is created
 */
export const createCustomer = internalAction({
  args: {
    tenantId: v.id("tenants"),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { tenantId, email, name }) => {
    const stripe = getStripeClient();

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        tenantId: tenantId,
      },
    });

    // Update tenant with Stripe customer ID
    await ctx.runMutation(internal.billing.updateStripeCustomerId, {
      tenantId,
      customerId: customer.id,
    });

    console.log(`[Stripe] Created customer ${customer.id} for tenant ${tenantId}`);
    return { customerId: customer.id };
  },
});

/**
 * Create a Stripe Checkout session for subscription
 * Returns a URL to redirect the user to
 */
export const createCheckoutSession = internalAction({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, { tenantId, customerId, returnUrl }) => {
    const stripe = getStripeClient();

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error("STRIPE_PRICE_ID environment variable is not set");
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      subscription_data: {
        metadata: {
          tenantId: tenantId,
        },
      },
      metadata: {
        tenantId: tenantId,
      },
    });

    console.log(`[Stripe] Created checkout session ${session.id} for tenant ${tenantId}`);
    return { sessionUrl: session.url };
  },
});

/**
 * Create a Stripe Billing Portal session
 * Returns a URL to redirect the user to manage their subscription
 */
export const createBillingPortalSession = internalAction({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, { customerId, returnUrl }) => {
    const stripe = getStripeClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[Stripe] Created billing portal session for customer ${customerId}`);
    return { portalUrl: session.url };
  },
});

/**
 * Cancel a subscription at period end
 */
export const cancelSubscription = internalAction({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const stripe = getStripeClient();

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // In newer Stripe API, current_period_end is on subscription items
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

    console.log(`[Stripe] Marked subscription ${subscriptionId} for cancellation at period end`);
    return {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
    };
  },
});

/**
 * Resume a subscription that was set to cancel
 */
export const resumeSubscription = internalAction({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const stripe = getStripeClient();

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // In newer Stripe API, current_period_end is on subscription items
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

    console.log(`[Stripe] Resumed subscription ${subscriptionId}`);
    return {
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd,
    };
  },
});

/**
 * Get subscription details from Stripe
 */
export const getSubscriptionDetails = internalAction({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const stripe = getStripeClient();

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // In newer Stripe API, current_period_end is on subscription items
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end || 0;

    return {
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
    };
  },
});

/**
 * Get customer's invoices from Stripe
 */
export const getCustomerInvoices = internalAction({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { customerId, limit = 10 }) => {
    const stripe = getStripeClient();

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      periodStart: invoice.period_start,
      periodEnd: invoice.period_end,
      invoicePdf: invoice.invoice_pdf ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    }));
  },
});
