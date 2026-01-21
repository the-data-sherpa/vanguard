"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: "user" | "owner";
  tenantId?: string;
  fallback?: ReactNode;
}

// Role hierarchy for tenant access (platform_admin has no special tenant privileges)
const roleHierarchy: Record<string, number> = {
  user: 1,
  owner: 2,
};

export function AuthGuard({
  children,
  requiredRole = "user",
  fallback = <AccessDenied />,
}: AuthGuardProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const user = useQuery(api.users.getCurrentUser);

  // Still loading
  if (!clerkLoaded || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return fallback;
  }

  // User not found in database
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <p className="text-muted-foreground">
          Setting up your account...
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
      </div>
    );
  }

  // User is banned
  if (user.isBanned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
        <h2 className="text-xl font-semibold text-destructive">Account Suspended</h2>
        <p className="text-muted-foreground mt-2">
          Your account has been suspended. Please contact support.
        </p>
      </div>
    );
  }

  // Check role hierarchy (platform_admin has no special tenant privileges)
  const userRole = user.tenantRole || "user";
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  if (userLevel < requiredLevel) {
    return fallback;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
      <h2 className="text-xl font-semibold">Access Denied</h2>
      <p className="text-muted-foreground mt-2">
        You don&apos;t have permission to access this page.
      </p>
    </div>
  );
}
