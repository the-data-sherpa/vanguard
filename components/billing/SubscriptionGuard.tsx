"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { PRICING } from "@/lib/stripe";

interface SubscriptionGuardProps {
  tenantId: Id<"tenants">;
  tenantSlug: string;
  children: ReactNode;
  allowBillingPage?: boolean;
}

/**
 * Guards access to tenant pages based on subscription status.
 * Shows a block screen for expired trials, but allows past_due a grace period.
 * Always allows access to the billing page.
 */
export function SubscriptionGuard({
  tenantId,
  tenantSlug,
  children,
  allowBillingPage = false,
}: SubscriptionGuardProps) {
  const subscriptionStatus = useQuery(api.billing.getSubscriptionStatus, { tenantId });

  // Show loading while checking status
  if (subscriptionStatus === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If tenant not found, allow access (will be handled elsewhere)
  if (subscriptionStatus === null) {
    return <>{children}</>;
  }

  // Allow if billing page (users need to be able to subscribe)
  if (allowBillingPage) {
    return <>{children}</>;
  }

  // Allow active subscribers and trials
  if (subscriptionStatus.hasActiveSubscription || subscriptionStatus.isTrialing) {
    return <>{children}</>;
  }

  // Allow past_due with a warning (handled by TrialBanner)
  if (subscriptionStatus.isPastDue) {
    return <>{children}</>;
  }

  // Block expired trials - show subscription required screen
  if (subscriptionStatus.isExpired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Trial Expired</CardTitle>
            <CardDescription>
              Your 14-day free trial has ended. Subscribe to continue using
              Vanguard CAD and all its features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold">${PRICING.monthlyPrice}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>

            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Real-time incident tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                PulsePoint integration
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Weather alerts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Unlimited users
              </li>
            </ul>

            <Button className="w-full" size="lg" asChild>
              <Link href={`/tenant/${tenantSlug}/billing`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: allow access (covers edge cases)
  return <>{children}</>;
}
