import { v } from "convex/values";
import { query, mutation, action, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ===================
// Constants
// ===================

const TRIAL_DURATION_DAYS = 7;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
const MONTHLY_PRICE_CENTS = 2999; // $29.99

// ===================
// Authorization Helpers
// ===================

async function requireTenantMember(
  ctx: QueryCtx | MutationCtx,
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

  if (user.tenantId !== tenantId) {
    throw new Error("Access denied: user does not belong to this tenant");
  }

  return { userId: user._id, tenantRole: user.tenantRole || "user" };
}

async function requireTenantOwner(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
): Promise<{ userId: Id<"users">; tenantRole: string }> {
  const { userId, tenantRole } = await requireTenantMember(ctx, tenantId);

  if (tenantRole !== "owner") {
    throw new Error("Access denied: requires owner role");
  }

  return { userId, tenantRole };
}

// ===================
// Queries
// ===================

/**
 * Get subscription status for a tenant
 */
export const getSubscriptionStatus = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      return null;
    }

    const now = Date.now();
    const trialEndsAt = tenant.trialEndsAt;
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000)))
      : null;

    const isProBono = tenant.subscriptionStatus === "pro_bono";

    return {
      status: tenant.subscriptionStatus || "expired",
      trialEndsAt: tenant.trialEndsAt,
      trialDaysRemaining,
      currentPeriodEnd: tenant.currentPeriodEnd,
      cancelAtPeriodEnd: tenant.cancelAtPeriodEnd,
      hasStripeCustomer: !!tenant.billingCustomerId,
      // Pro bono tenants are treated as having active subscription (full access)
      hasActiveSubscription: tenant.subscriptionStatus === "active" || isProBono,
      isTrialing: tenant.subscriptionStatus === "trialing",
      isExpired: tenant.subscriptionStatus === "expired",
      isPastDue: tenant.subscriptionStatus === "past_due",
      isProBono,
    };
  },
});

/**
 * Get billing stats for platform admin dashboard
 */
export const getBillingStats = query({
  args: {},
  handler: async (ctx) => {
    // Check for platform admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user || user.role !== "platform_admin") {
      return null;
    }

    const tenants = await ctx.db.query("tenants").collect();

    // Calculate metrics
    let activeSubscribers = 0;
    let trialsInProgress = 0;
    let pastDueAccounts = 0;
    let expiredTrials = 0;
    let proBonoTenants = 0;

    for (const tenant of tenants) {
      switch (tenant.subscriptionStatus) {
        case "active":
          activeSubscribers++;
          break;
        case "trialing":
          trialsInProgress++;
          break;
        case "past_due":
          pastDueAccounts++;
          break;
        case "expired":
          expiredTrials++;
          break;
        case "pro_bono":
          proBonoTenants++;
          break;
      }
    }

    // MRR = active subscribers * monthly price (pro bono doesn't contribute)
    const mrr = activeSubscribers * MONTHLY_PRICE_CENTS;

    // Calculate trial conversion rate (converted / (converted + expired))
    const totalTrialOutcomes = activeSubscribers + expiredTrials;
    const conversionRate = totalTrialOutcomes > 0
      ? (activeSubscribers / totalTrialOutcomes) * 100
      : 0;

    return {
      totalTenants: tenants.length,
      activeSubscribers,
      trialsInProgress,
      pastDueAccounts,
      expiredTrials,
      proBonoTenants,
      mrr,
      mrrFormatted: `$${(mrr / 100).toFixed(2)}`,
      conversionRate: conversionRate.toFixed(1),
      monthlyPrice: MONTHLY_PRICE_CENTS / 100,
    };
  },
});

/**
 * Get recent subscription events for admin dashboard
 */
export const getRecentSubscriptionEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    // Check for platform admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user || user.role !== "platform_admin") {
      return [];
    }

    // Get recent billing-related audit logs
    const logs = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.or(
          q.eq(q.field("action"), "billing.trial_started"),
          q.eq(q.field("action"), "billing.subscription_activated"),
          q.eq(q.field("action"), "billing.subscription_canceled"),
          q.eq(q.field("action"), "billing.subscription_past_due"),
          q.eq(q.field("action"), "billing.trial_expired")
        )
      )
      .order("desc")
      .take(limit);

    // Enrich with tenant names
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const tenant = log.tenantId ? await ctx.db.get(log.tenantId) : null;
        return {
          ...log,
          tenantName: tenant?.displayName || tenant?.name || "Unknown",
          tenantSlug: tenant?.slug,
        };
      })
    );

    return enrichedLogs;
  },
});

// ===================
// Internal Mutations (for webhooks and system)
// ===================

/**
 * Update Stripe customer ID for a tenant
 */
export const updateStripeCustomerId = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    customerId: v.string(),
  },
  handler: async (ctx, { tenantId, customerId }) => {
    await ctx.db.patch(tenantId, {
      billingCustomerId: customerId,
    });
  },
});

/**
 * Start a 14-day trial for a tenant
 */
export const startTrial = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const trialEndsAt = Date.now() + TRIAL_DURATION_MS;

    await ctx.db.patch(tenantId, {
      subscriptionStatus: "trialing",
      trialEndsAt,
    });

    // Log the event
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "billing.trial_started",
      targetType: "tenant",
      targetId: tenantId,
      details: { trialEndsAt },
      result: "success",
    });

    console.log(`[Billing] Started 14-day trial for tenant ${tenantId}, ends at ${new Date(trialEndsAt).toISOString()}`);
  },
});

/**
 * Expire a tenant's trial
 */
export const expireTrial = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) return;

    // Only expire if still trialing
    if (tenant.subscriptionStatus !== "trialing") {
      return;
    }

    await ctx.db.patch(tenantId, {
      subscriptionStatus: "expired",
    });

    // Log the event
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "billing.trial_expired",
      targetType: "tenant",
      targetId: tenantId,
      result: "success",
    });

    console.log(`[Billing] Trial expired for tenant ${tenantId}`);
  },
});

/**
 * Sync subscription status from Stripe webhook
 */
export const syncFromStripe = internalMutation({
  args: {
    tenantId: v.id("tenants"),
    subscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("trialing")
    ),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, { tenantId, subscriptionId, status, currentPeriodEnd, cancelAtPeriodEnd }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) {
      console.error(`[Billing] Tenant ${tenantId} not found when syncing from Stripe`);
      return;
    }

    const previousStatus = tenant.subscriptionStatus;

    await ctx.db.patch(tenantId, {
      billingSubscriptionId: subscriptionId,
      subscriptionStatus: status,
      currentPeriodEnd: currentPeriodEnd * 1000, // Convert to milliseconds
      cancelAtPeriodEnd,
    });

    // Log status change
    if (previousStatus !== status) {
      await ctx.db.insert("auditLogs", {
        tenantId,
        actorId: "stripe",
        actorType: "system",
        action: `billing.subscription_${status}`,
        targetType: "tenant",
        targetId: tenantId,
        details: { previousStatus, newStatus: status, subscriptionId },
        result: "success",
      });
    }

    console.log(`[Billing] Synced subscription for tenant ${tenantId}: ${previousStatus} -> ${status}`);
  },
});

/**
 * Mark subscription as canceled (from webhook)
 */
export const markSubscriptionCanceled = internalMutation({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId);
    if (!tenant) return;

    await ctx.db.patch(tenantId, {
      subscriptionStatus: "canceled",
      billingSubscriptionId: undefined,
    });

    // Log the event
    await ctx.db.insert("auditLogs", {
      tenantId,
      actorId: "stripe",
      actorType: "system",
      action: "billing.subscription_canceled",
      targetType: "tenant",
      targetId: tenantId,
      result: "success",
    });

    console.log(`[Billing] Subscription canceled for tenant ${tenantId}`);
  },
});

// ===================
// Actions (for client-initiated operations)
// ===================

/**
 * Get Stripe Checkout URL for subscribing
 */
export const getCheckoutUrl = action({
  args: {
    tenantId: v.id("tenants"),
    returnUrl: v.string(),
  },
  returns: v.object({ url: v.union(v.string(), v.null()) }),
  handler: async (ctx, { tenantId, returnUrl }): Promise<{ url: string | null }> => {
    // Get tenant info
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Create Stripe customer if needed
    let customerId = tenant.billingCustomerId;
    if (!customerId) {
      // Get the owner's email
      const identity = await ctx.auth.getUserIdentity();
      if (!identity?.email) {
        throw new Error("User email not available");
      }

      const result = await ctx.runAction(internal.stripe.createCustomer, {
        tenantId,
        email: identity.email,
        name: tenant.displayName || tenant.name,
      });
      customerId = result.customerId;
    }

    // Create checkout session
    const { sessionUrl } = await ctx.runAction(internal.stripe.createCheckoutSession, {
      tenantId,
      customerId,
      returnUrl,
    });

    return { url: sessionUrl };
  },
});

/**
 * Get Stripe Billing Portal URL
 */
export const getBillingPortalUrl = action({
  args: {
    tenantId: v.id("tenants"),
    returnUrl: v.string(),
  },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { tenantId, returnUrl }): Promise<{ url: string }> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.billingCustomerId) {
      throw new Error("No billing customer found for this tenant");
    }

    const { portalUrl } = await ctx.runAction(internal.stripe.createBillingPortalSession, {
      customerId: tenant.billingCustomerId,
      returnUrl,
    });

    return { url: portalUrl };
  },
});

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = action({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.object({ success: v.boolean(), currentPeriodEnd: v.number() }),
  handler: async (ctx, { tenantId }): Promise<{ success: boolean; currentPeriodEnd: number }> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.billingSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const result = await ctx.runAction(internal.stripe.cancelSubscription, {
      subscriptionId: tenant.billingSubscriptionId,
    });

    // Update tenant
    await ctx.runMutation(internal.billing.syncFromStripe, {
      tenantId,
      subscriptionId: tenant.billingSubscriptionId,
      status: "active", // Still active until period end
      currentPeriodEnd: result.currentPeriodEnd,
      cancelAtPeriodEnd: true,
    });

    return { success: true, currentPeriodEnd: result.currentPeriodEnd };
  },
});

/**
 * Resume a subscription that was set to cancel
 */
export const resumeSubscription = action({
  args: {
    tenantId: v.id("tenants"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { tenantId }): Promise<{ success: boolean }> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.billingSubscriptionId) {
      throw new Error("No subscription found");
    }

    const result = await ctx.runAction(internal.stripe.resumeSubscription, {
      subscriptionId: tenant.billingSubscriptionId,
    });

    // Update tenant
    await ctx.runMutation(internal.billing.syncFromStripe, {
      tenantId,
      subscriptionId: tenant.billingSubscriptionId,
      status: "active",
      currentPeriodEnd: result.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });

    return { success: true };
  },
});

/**
 * Get invoice history
 */
// Invoice type returned from Stripe
interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

export const getInvoiceHistory = action({
  args: {
    tenantId: v.id("tenants"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { tenantId, limit = 10 }): Promise<StripeInvoice[]> => {
    const tenant = await ctx.runQuery(api.tenants.get, { id: tenantId });
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    if (!tenant.billingCustomerId) {
      return [];
    }

    const invoices = await ctx.runAction(internal.stripe.getCustomerInvoices, {
      customerId: tenant.billingCustomerId,
      limit,
    });

    return invoices;
  },
});
