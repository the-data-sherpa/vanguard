"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CreditCard, X } from "lucide-react";
import { formatTrialMessage, PRICING } from "@/lib/stripe";
import Link from "next/link";
import { useState } from "react";

interface TrialBannerProps {
  tenantId: Id<"tenants">;
  tenantSlug: string;
}

export function TrialBanner({ tenantId, tenantSlug }: TrialBannerProps) {
  const subscriptionStatus = useQuery(api.billing.getSubscriptionStatus, { tenantId });
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render until we have data
  if (!subscriptionStatus) {
    return null;
  }

  // Don't show for active subscribers
  if (subscriptionStatus.hasActiveSubscription) {
    return null;
  }

  // Don't show if dismissed (for this session)
  if (isDismissed) {
    return null;
  }

  // Trial banner
  if (subscriptionStatus.isTrialing && subscriptionStatus.trialDaysRemaining !== null) {
    const isUrgent = subscriptionStatus.trialDaysRemaining <= 3;

    return (
      <div className={`${isUrgent ? "bg-amber-500" : "bg-blue-500"} text-white`}>
        <div className="container py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {formatTrialMessage(subscriptionStatus.trialDaysRemaining)}
            </span>
            <span className="text-sm opacity-90">
              Subscribe for ${PRICING.monthlyPrice}/month to continue after trial
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              asChild
              className={isUrgent ? "bg-white text-amber-600 hover:bg-gray-100" : "bg-white text-blue-600 hover:bg-gray-100"}
            >
              <Link href={`/tenant/${tenantSlug}/billing`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe Now
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Expired trial banner
  if (subscriptionStatus.isExpired) {
    return (
      <div className="bg-red-500 text-white">
        <div className="container py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <span className="font-medium">Your trial has expired</span>
              <span className="text-sm opacity-90 ml-2">
                Subscribe to regain access to all features
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="bg-white text-red-600 hover:bg-gray-100"
          >
            <Link href={`/tenant/${tenantSlug}/billing`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Subscribe Now
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Past due banner
  if (subscriptionStatus.isPastDue) {
    return (
      <div className="bg-red-500 text-white">
        <div className="container py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <span className="font-medium">Payment past due</span>
              <span className="text-sm opacity-90 ml-2">
                Please update your payment method to continue service
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="bg-white text-red-600 hover:bg-gray-100"
          >
            <Link href={`/tenant/${tenantSlug}/billing`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
