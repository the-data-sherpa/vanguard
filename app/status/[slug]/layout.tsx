"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

// Create a client-side only Convex client for the public status page
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexReactClient(convexUrl);

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </ConvexProvider>
  );
}
