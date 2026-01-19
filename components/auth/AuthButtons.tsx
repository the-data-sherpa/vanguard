"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface AuthButtonsProps {
  variant?: "nav" | "hero" | "cta";
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
          <Button variant="ghost" asChild>
            <Link href="/tenant">Dashboard</Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
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
          <Button size="lg" asChild>
            <Link href="/tenant">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
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
          <Button size="lg" variant="secondary" asChild>
            <Link href="/tenant">
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
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
