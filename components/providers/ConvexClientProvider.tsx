"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { useTheme } from "next-themes";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function ClerkThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // During build/SSG, Clerk key may not be available
  // This prevents build failures while still working at runtime
  if (!publishableKey) {
    // Return children without Clerk wrapper during static generation
    // This allows pages to build; auth will work at runtime when key is available
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        elements: {
          formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "shadow-none",
        },
      }}
      signInUrl="/login"
      signUpUrl="/signup"
    >
      {children}
    </ClerkProvider>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // If no Clerk key, use Convex without Clerk auth (for build time)
  if (!publishableKey) {
    return (
      <ClerkThemeProvider>
        {children}
      </ClerkThemeProvider>
    );
  }

  return (
    <ClerkThemeProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkThemeProvider>
  );
}
