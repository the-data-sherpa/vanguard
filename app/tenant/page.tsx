"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";

export default function TenantLandingPage() {
  const router = useRouter();
  const userTenant = useQuery(api.users.getCurrentUserTenant);
  const userTenantStatus = useQuery(api.users.hasAnyTenant);

  useEffect(() => {
    // Wait for both queries to load
    if (userTenantStatus === undefined || userTenant === undefined) {
      return;
    }

    // Not authenticated - redirect to login
    if (!userTenantStatus.isAuthenticated) {
      router.replace("/login");
      return;
    }

    // User has no tenant - redirect to onboarding
    if (!userTenantStatus.hasTenant) {
      router.replace("/onboarding");
      return;
    }

    // User has a tenant - redirect to their dashboard
    if (userTenant?.tenant) {
      router.replace(`/tenant/${userTenant.tenant.slug}`);
      return;
    }
  }, [userTenant, userTenantStatus, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}
