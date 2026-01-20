"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

interface PlatformAdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function PlatformAdminGuard({
  children,
  fallback = <AccessDenied />,
}: PlatformAdminGuardProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const user = useQuery(api.users.getCurrentUser);

  // Still loading
  if (!clerkLoaded || user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <p className="text-muted-foreground">
          Setting up your account...
        </p>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-2" />
      </div>
    );
  }

  // Check for platform admin role
  if (user.role !== "platform_admin") {
    return fallback;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold">Access Denied</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        This area is restricted to platform administrators only.
        If you believe you should have access, please contact support.
      </p>
    </div>
  );
}
