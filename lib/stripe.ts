// Client-side Stripe utilities

/**
 * Format cents as currency display string
 */
export function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format timestamp as date string
 */
export function formatSubscriptionDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Calculate days remaining until a timestamp
 */
export function getDaysRemaining(endTimestamp: number): number {
  const now = Date.now();
  const diff = endTimestamp - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Get subscription status display info
 */
export function getSubscriptionStatusInfo(status: string | undefined): {
  label: string;
  color: "green" | "yellow" | "red" | "gray" | "purple";
  description: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        color: "green",
        description: "Your subscription is active and in good standing.",
      };
    case "trialing":
      return {
        label: "Trial",
        color: "yellow",
        description: "You are currently on a free trial.",
      };
    case "past_due":
      return {
        label: "Past Due",
        color: "red",
        description: "Your payment is past due. Please update your payment method.",
      };
    case "canceled":
      return {
        label: "Canceled",
        color: "gray",
        description: "Your subscription has been canceled.",
      };
    case "expired":
      return {
        label: "Expired",
        color: "red",
        description: "Your trial has expired. Subscribe to continue using the platform.",
      };
    case "pro_bono":
      return {
        label: "Pro Bono",
        color: "purple",
        description: "Your organization has been granted complimentary access to Vanguard.",
      };
    default:
      return {
        label: "Unknown",
        color: "gray",
        description: "Subscription status is unknown.",
      };
  }
}

/**
 * Pricing information
 */
export const PRICING = {
  monthlyPrice: 29.99,
  monthlyPriceCents: 2999,
  trialDays: 7,
  currency: "USD",
} as const;

/**
 * Format trial days remaining message
 */
export function formatTrialMessage(daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return "Your trial has expired";
  }
  if (daysRemaining === 1) {
    return "1 day remaining in your trial";
  }
  return `${daysRemaining} days remaining in your trial`;
}
