"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Clock,
  Receipt,
} from "lucide-react";
import {
  formatCurrency,
  formatSubscriptionDate,
  getSubscriptionStatusInfo,
  formatTrialMessage,
  PRICING,
} from "@/lib/stripe";

export default function BillingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const subscriptionStatus = useQuery(
    api.billing.getSubscriptionStatus,
    tenant?._id ? { tenantId: tenant._id } : "skip"
  );

  const getCheckoutUrl = useAction(api.billing.getCheckoutUrl);
  const getBillingPortalUrl = useAction(api.billing.getBillingPortalUrl);
  const getInvoiceHistory = useAction(api.billing.getInvoiceHistory);
  const cancelSubscription = useAction(api.billing.cancelSubscription);
  const resumeSubscription = useAction(api.billing.resumeSubscription);

  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      number: string | null;
      status: string | null;
      amountPaid: number;
      currency: string;
      created: number;
      hostedInvoiceUrl: string | null;
    }>
  >([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tenant || subscriptionStatus === undefined) {
    return <BillingPageSkeleton />;
  }

  const statusInfo = getSubscriptionStatusInfo(subscriptionStatus?.status);
  const returnUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleSubscribe = async () => {
    if (!tenant?._id) return;
    setIsLoadingCheckout(true);
    setError(null);
    try {
      const result = await getCheckoutUrl({
        tenantId: tenant._id,
        returnUrl,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    if (!tenant?._id) return;
    setIsLoadingPortal(true);
    setError(null);
    try {
      const result = await getBillingPortalUrl({
        tenantId: tenant._id,
        returnUrl,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!tenant?._id) return;
    if (!confirm("Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period.")) {
      return;
    }
    setIsLoadingCancel(true);
    setError(null);
    try {
      await cancelSubscription({ tenantId: tenant._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setIsLoadingCancel(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!tenant?._id) return;
    setIsLoadingResume(true);
    setError(null);
    try {
      await resumeSubscription({ tenantId: tenant._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume subscription");
    } finally {
      setIsLoadingResume(false);
    }
  };

  const loadInvoices = async () => {
    if (!tenant?._id || invoicesLoaded) return;
    try {
      const result = await getInvoiceHistory({ tenantId: tenant._id });
      setInvoices(result);
      setInvoicesLoaded(true);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Status
            </CardTitle>
            <Badge
              variant={
                statusInfo.color === "green"
                  ? "default"
                  : statusInfo.color === "yellow"
                  ? "secondary"
                  : statusInfo.color === "red"
                  ? "destructive"
                  : "outline"
              }
              className={statusInfo.color === "green" ? "bg-green-600" : ""}
            >
              {statusInfo.label}
            </Badge>
          </div>
          <CardDescription>{statusInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trial Status */}
          {subscriptionStatus?.isTrialing && subscriptionStatus.trialDaysRemaining !== null && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {formatTrialMessage(subscriptionStatus.trialDaysRemaining)}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Subscribe now to continue using all features after your trial ends.
                </p>
              </div>
            </div>
          )}

          {/* Expired Trial */}
          {subscriptionStatus?.isExpired && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  Your trial has expired
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Subscribe now to regain access to all features.
                </p>
              </div>
            </div>
          )}

          {/* Past Due Warning */}
          {subscriptionStatus?.isPastDue && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  Payment past due
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Please update your payment method to avoid service interruption.
                </p>
              </div>
            </div>
          )}

          {/* Cancel at Period End Notice */}
          {subscriptionStatus?.cancelAtPeriodEnd && subscriptionStatus.currentPeriodEnd && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-950/30 rounded-lg border">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Subscription ending</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription will end on{" "}
                  {formatSubscriptionDate(subscriptionStatus.currentPeriodEnd / 1000)}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleResumeSubscription}
                disabled={isLoadingResume}
              >
                {isLoadingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Resume"
                )}
              </Button>
            </div>
          )}

          {/* Active Subscription Info */}
          {subscriptionStatus?.hasActiveSubscription && subscriptionStatus.currentPeriodEnd && !subscriptionStatus.cancelAtPeriodEnd && (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Subscription active
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Renews on {formatSubscriptionDate(subscriptionStatus.currentPeriodEnd / 1000)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vanguard CAD Pro</CardTitle>
          <CardDescription>
            Full-featured incident monitoring and emergency response platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">${PRICING.monthlyPrice}</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Real-time incident tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              PulsePoint integration
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Weather alerts
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Custom branding
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Unlimited users
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              30-day incident history
            </li>
          </ul>

          <div className="flex flex-col gap-2 pt-4">
            {/* Subscribe Button (for trial/expired) */}
            {(subscriptionStatus?.isTrialing || subscriptionStatus?.isExpired) && (
              <Button onClick={handleSubscribe} disabled={isLoadingCheckout}>
                {isLoadingCheckout ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe Now
                  </>
                )}
              </Button>
            )}

            {/* Manage Billing (for active subscribers) */}
            {subscriptionStatus?.hasActiveSubscription && (
              <>
                <Button onClick={handleManageBilling} disabled={isLoadingPortal}>
                  {isLoadingPortal ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Manage Billing
                    </>
                  )}
                </Button>
                {!subscriptionStatus.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    disabled={isLoadingCancel}
                    className="text-destructive hover:text-destructive"
                  >
                    {isLoadingCancel ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Cancel Subscription"
                    )}
                  </Button>
                )}
              </>
            )}

            {/* Update Payment (for past due) */}
            {subscriptionStatus?.isPastDue && (
              <Button onClick={handleManageBilling} disabled={isLoadingPortal}>
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Update Payment Method
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice History Card */}
      {subscriptionStatus?.hasStripeCustomer && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Invoice History
              </CardTitle>
              {!invoicesLoaded && (
                <Button variant="outline" size="sm" onClick={loadInvoices}>
                  Load Invoices
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!invoicesLoaded ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Click &quot;Load Invoices&quot; to view your billing history
              </p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No invoices found
              </p>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">
                        {invoice.number || "Invoice"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.created * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatCurrency(invoice.amountPaid, invoice.currency.toUpperCase())}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "open"
                            ? "secondary"
                            : "outline"
                        }
                        className={invoice.status === "paid" ? "bg-green-600" : ""}
                      >
                        {invoice.status}
                      </Badge>
                      {invoice.hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
