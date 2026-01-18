"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TenantLayout } from "@/components/layout/TenantLayout";
import { useParams, notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function Layout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const slug = params.slug as string;

  const tenant = useQuery(api.tenants.getBySlug, { slug });

  // Loading state
  if (tenant === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container flex h-14 items-center">
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="container py-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not found
  if (tenant === null) {
    notFound();
  }

  return (
    <TenantLayout tenantSlug={tenant.slug} tenantName={tenant.displayName || tenant.name}>
      {children}
    </TenantLayout>
  );
}
