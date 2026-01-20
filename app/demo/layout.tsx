"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, ArrowRight } from "lucide-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Create a client-side only Convex client for the demo
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexReactClient(convexUrl);

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="container py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                This is a demo with simulated data
              </span>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                Read-only
              </Badge>
            </div>
            <Button variant="secondary" size="sm" asChild className="bg-white text-orange-600 hover:bg-gray-100">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <Link href="/demo" className="flex items-center gap-2 font-semibold">
              <Flame className="h-6 w-6 text-orange-500" />
              <span>Demo Fire & Rescue</span>
            </Link>

            <nav className="ml-8 flex items-center gap-6">
              <Link
                href="/demo"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/demo/incidents"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Incidents
              </Link>
              <Link
                href="/demo/weather"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Weather
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container py-6">
          {children}
        </main>

        {/* Footer CTA */}
        <div className="border-t bg-muted/50">
          <div className="container py-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
              Start your 14-day free trial today. No credit card required.
              Full access to all features.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ConvexProvider>
  );
}
