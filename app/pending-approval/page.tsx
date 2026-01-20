"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, XCircle, Building2 } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const status = useQuery(api.users.getPendingApprovalStatus);

  // Handle redirects based on status
  useEffect(() => {
    if (!status) return;

    // Not authenticated - go to login
    if (!status.isAuthenticated) {
      router.push("/login");
      return;
    }

    // No tenant - go to onboarding
    if (!status.hasTenant) {
      router.push("/onboarding");
      return;
    }

    // Tenant is approved - go to dashboard
    if (status.tenant && status.tenant.status === "active") {
      router.push(`/tenant/${status.tenant.slug}`);
      return;
    }
  }, [status, router]);

  // Show loading while checking status
  if (!status || !status.isAuthenticated || !status.hasTenant || !status.tenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { tenant } = status;

  // Pending approval status
  if (tenant.status === "pending_approval") {
    const submittedDate = new Date(tenant._creationTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-2xl">Pending Approval</CardTitle>
            <CardDescription className="text-base">
              Your organization request is being reviewed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tenant.displayName || tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    vanguard.app/tenant/{tenant.slug}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Submitted</span>
                <span>{submittedDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Review
                </Badge>
              </div>
            </div>

            <div className="text-center space-y-2 py-4">
              <p className="text-muted-foreground">
                Our team will review your request and get back to you soon.
              </p>
              <p className="text-sm text-muted-foreground">
                This page will automatically update once your organization is approved.
              </p>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Questions? Contact us at support@vanguard.app
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected status
  if (tenant.status === "deactivated" && tenant.rejectionReason) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Application Not Approved</CardTitle>
            <CardDescription className="text-base">
              Your organization request was not approved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tenant.displayName || tenant.name}</p>
                </div>
              </div>
              {tenant.rejectionReason && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Reason:</p>
                  <p className="text-sm">{tenant.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground text-center">
                If you believe this was a mistake, please contact support@vanguard.app
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved status (should redirect, but show confirmation briefly)
  if (tenant.status === "active") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Approved!</CardTitle>
            <CardDescription className="text-base">
              Your organization has been approved
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Redirecting to your dashboard...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for other statuses
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Organization Status</CardTitle>
          <CardDescription>
            Status: {tenant.status}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Please contact support if you need assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
