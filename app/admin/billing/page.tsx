"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Type for subscription event from auditLogs
interface SubscriptionEvent {
  _id: Id<"auditLogs">;
  _creationTime: number;
  action: string;
  tenantId?: Id<"tenants">;
  tenantName?: string;
  tenantSlug?: string;
}
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/stripe";
import Link from "next/link";

export default function AdminBillingPage() {
  const stats = useQuery(api.billing.getBillingStats);
  const events = useQuery(api.billing.getRecentSubscriptionEvents, { limit: 20 });

  if (stats === undefined) {
    return <BillingDashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Unable to load billing stats. Make sure you have platform admin access.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Revenue metrics and subscription overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mrrFormatted}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscribers} active subscriber{stats.activeSubscribers !== 1 ? "s" : ""} @ ${stats.monthlyPrice}/mo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.totalTenants} total tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialsInProgress}</div>
            <p className="text-xs text-muted-foreground">
              14-day trials in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Trial to paid conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown & Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Breakdown of all tenants by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Active</span>
                </div>
                <span className="font-medium">{stats.activeSubscribers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Trialing</span>
                </div>
                <span className="font-medium">{stats.trialsInProgress}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Past Due</span>
                </div>
                <span className="font-medium">{stats.pastDueAccounts}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Expired</span>
                </div>
                <span className="font-medium">{stats.expiredTrials}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Attention Required</CardTitle>
            <CardDescription>Accounts that may need follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pastDueAccounts > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">
                      {stats.pastDueAccounts} account{stats.pastDueAccounts !== 1 ? "s" : ""} past due
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Payment failed, may need intervention
                    </p>
                  </div>
                </div>
              )}

              {stats.trialsInProgress > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-100">
                      {stats.trialsInProgress} trial{stats.trialsInProgress !== 1 ? "s" : ""} in progress
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Potential conversions to nurture
                    </p>
                  </div>
                </div>
              )}

              {stats.expiredTrials > 0 && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-950/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      {stats.expiredTrials} expired trial{stats.expiredTrials !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      May be candidates for re-engagement
                    </p>
                  </div>
                </div>
              )}

              {stats.pastDueAccounts === 0 && stats.trialsInProgress === 0 && stats.expiredTrials === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items requiring attention
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Subscription Events</CardTitle>
          <CardDescription>Latest billing activity across all tenants</CardDescription>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event: SubscriptionEvent) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <EventIcon action={event.action} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {formatEventAction(event.action)}
                        </p>
                        <EventBadge action={event.action} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.tenantSlug ? (
                          <Link
                            href={`/admin/tenants/${event.tenantId}`}
                            className="hover:underline"
                          >
                            {event.tenantName}
                          </Link>
                        ) : (
                          event.tenantName
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(event._creationTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent subscription events
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventIcon({ action }: { action: string }) {
  if (action.includes("trial_started")) {
    return <Clock className="h-5 w-5 text-blue-500" />;
  }
  if (action.includes("subscription_activated") || action.includes("active")) {
    return <Users className="h-5 w-5 text-green-500" />;
  }
  if (action.includes("trial_expired") || action.includes("canceled")) {
    return <Calendar className="h-5 w-5 text-gray-500" />;
  }
  if (action.includes("past_due")) {
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  }
  return <DollarSign className="h-5 w-5 text-muted-foreground" />;
}

function EventBadge({ action }: { action: string }) {
  if (action.includes("trial_started")) {
    return <Badge variant="secondary">Trial</Badge>;
  }
  if (action.includes("subscription_activated") || action.includes("active")) {
    return <Badge className="bg-green-600">Active</Badge>;
  }
  if (action.includes("trial_expired")) {
    return <Badge variant="outline">Expired</Badge>;
  }
  if (action.includes("canceled")) {
    return <Badge variant="outline">Canceled</Badge>;
  }
  if (action.includes("past_due")) {
    return <Badge variant="destructive">Past Due</Badge>;
  }
  return null;
}

function formatEventAction(action: string): string {
  const actionMap: Record<string, string> = {
    "billing.trial_started": "Trial Started",
    "billing.subscription_activated": "Subscription Activated",
    "billing.subscription_active": "Subscription Active",
    "billing.subscription_canceled": "Subscription Canceled",
    "billing.subscription_past_due": "Payment Failed",
    "billing.trial_expired": "Trial Expired",
  };
  return actionMap[action] || action.replace("billing.", "").replace(/_/g, " ");
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function BillingDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
