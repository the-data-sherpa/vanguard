"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRight, Building2, ChevronDown, Plus, Shield } from "lucide-react";

interface AuthButtonsProps {
  variant?: "nav" | "hero" | "cta";
}

function SignedInNav() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const userTenant = useQuery(api.users.getCurrentUserTenant);

  const isPlatformAdmin = currentUser?.role === "platform_admin";
  const hasTenant = !!userTenant?.tenant;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <Building2 className="h-4 w-4" />
            Dashboard
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {hasTenant && userTenant?.tenant && (
            <>
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Your Organization
                </p>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  href={`/tenant/${userTenant.tenant.slug}`}
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  {userTenant.tenant.displayName || userTenant.tenant.name}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {!hasTenant && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/onboarding" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {isPlatformAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </DropdownMenuItem>
          )}
          {!isPlatformAdmin && !hasTenant && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No organizations yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <UserButton afterSignOutUrl="/" />
    </>
  );
}

function SignedInHeroOrCta({ variant }: { variant: "hero" | "cta" }) {
  const userTenant = useQuery(api.users.getCurrentUserTenant);
  const hasTenant = !!userTenant?.tenant;

  const buttonVariant = variant === "cta" ? "secondary" : "default";
  const href = hasTenant && userTenant?.tenant
    ? `/tenant/${userTenant.tenant.slug}`
    : "/onboarding";
  const label = hasTenant ? "Go to Dashboard" : "Create Organization";

  return (
    <Button size="lg" variant={buttonVariant} asChild>
      <Link href={href}>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}

export function AuthButtons({ variant = "nav" }: AuthButtonsProps) {
  // Check if Clerk is configured (key available at runtime)
  const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkConfigured) {
    // Fallback for when Clerk is not configured
    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Get Started</Link>
        </Button>
      </>
    );
  }

  if (variant === "nav") {
    return (
      <>
        <SignedOut>
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <SignedInNav />
        </SignedIn>
      </>
    );
  }

  if (variant === "hero") {
    return (
      <>
        <SignedOut>
          <Button size="lg" asChild>
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <SignedInHeroOrCta variant="hero" />
        </SignedIn>
      </>
    );
  }

  if (variant === "cta") {
    return (
      <>
        <SignedOut>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10"
            asChild
          >
            <Link href="/login">Sign In</Link>
          </Button>
        </SignedOut>
        <SignedIn>
          <SignedInHeroOrCta variant="cta" />
        </SignedIn>
      </>
    );
  }

  return null;
}

export function HeroTagline() {
  const isClerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!isClerkConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Free to start. No credit card required.
      </p>
    );
  }

  return (
    <SignedOut>
      <p className="text-sm text-muted-foreground">
        Free to start. No credit card required.
      </p>
    </SignedOut>
  );
}
