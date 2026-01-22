"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, ArrowRight, Home, CloudRain, Radio } from "lucide-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { MobileNav } from "@/components/layout/MobileNav";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";

// Create a client-side only Convex client for the demo
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexReactClient(convexUrl);

const navItems = [
  { label: "Dashboard", href: "/demo", icon: Home, exact: true },
  { label: "Incidents", href: "/demo/incidents", icon: AlertTriangle },
  { label: "Weather", href: "/demo/weather", icon: CloudRain },
  { label: "Mission Control", href: "/demo/mission-control", icon: Radio },
];

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <div className="container mx-auto py-2 md:py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
              <span className="font-medium text-sm md:text-base">
                <span className="hidden sm:inline">This is a demo with simulated data</span>
                <span className="sm:hidden">Demo Mode</span>
              </span>
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 text-xs">
                Read-only
              </Badge>
            </div>
            <Button variant="secondary" size="sm" asChild className="bg-white text-orange-600 hover:bg-gray-100 hidden sm:flex">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 flex h-14 items-center justify-between">
            <div className="flex items-center">
              {/* Mobile Nav Trigger */}
              <MobileNav
                navItems={navItems}
                title="Demo Fire & Rescue"
                titleBadge="Demo"
                open={mobileNavOpen}
                onOpenChange={setMobileNavOpen}
              />

              <Link href="/demo" className="flex items-center gap-2 font-semibold">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="hidden sm:inline">Demo Fire & Rescue</span>
                <span className="sm:hidden">Demo</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="ml-8 hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname?.startsWith(item.href) ?? false;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">
                  <span className="hidden sm:inline">Start Free Trial</span>
                  <span className="sm:hidden">Sign Up</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Add bottom padding for mobile nav */}
        <main className="flex-1 container mx-auto px-4 py-6 pb-20 md:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Footer CTA - Hidden on mobile to avoid conflict with bottom nav */}
        <div className="border-t bg-muted/50 hidden md:block">
          <div className="container mx-auto px-4 py-8 text-center">
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

        {/* Bottom Navigation for Mobile */}
        <BottomNav
          items={[
            { href: "/demo", label: "Home", icon: Home, exact: true },
            { href: "/demo/incidents", label: "Incidents", icon: AlertTriangle },
            { href: "/demo/weather", label: "Weather", icon: CloudRain },
          ]}
          onMoreClick={() => setMobileNavOpen(true)}
        />
      </div>
    </ConvexProvider>
  );
}
