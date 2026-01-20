"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type TenantTier = "free" | "starter" | "professional" | "enterprise";

const TIER_FEATURES: Record<TenantTier, { name: string; description: string; features: string[] }> = {
  free: {
    name: "Free",
    description: "Basic incident monitoring",
    features: [
      "Up to 3 users",
      "PulsePoint integration",
      "Basic weather alerts",
      "30-day data retention",
    ],
  },
  starter: {
    name: "Starter",
    description: "For small departments",
    features: [
      "Up to 10 users",
      "PulsePoint integration",
      "Full weather alerts",
      "60-day data retention",
      "Incident notes",
    ],
  },
  professional: {
    name: "Professional",
    description: "For growing departments",
    features: [
      "Up to 50 users",
      "PulsePoint integration",
      "Full weather alerts",
      "90-day data retention",
      "Incident notes",
      "Social media integration",
      "Custom branding",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Full platform access",
    features: [
      "Unlimited users",
      "PulsePoint integration",
      "Full weather alerts",
      "Unlimited data retention",
      "Incident notes",
      "Social media integration",
      "Custom branding",
      "API access",
      "Advanced analytics",
      "Priority support",
    ],
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function CreateTenantForm() {
  const router = useRouter();
  const createTenant = useMutation(api.tenants.create);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallySet, setSlugManuallySet] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [tier, setTier] = useState<TenantTier>("free");

  // Optional initial config
  const [weatherZones, setWeatherZones] = useState("");
  const [pulsepointAgency, setPulsepointAgency] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallySet && name) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallySet]);

  const handleSlugChange = (value: string) => {
    setSlugManuallySet(true);
    setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tenantId = await createTenant({
        name: name.trim(),
        slug: slug.trim(),
        displayName: displayName.trim() || undefined,
        tier,
      });

      // Redirect to the new tenant's detail page
      router.push(`/admin/tenants/${tenantId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Set up the tenant&apos;s identity and URL slug
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fire Department Name"
            />
            <p className="text-xs text-muted-foreground">
              The official name of the organization
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">/tenant/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="fire-dept"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional display name"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Shown in the UI instead of the name.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tier Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Tier</CardTitle>
          <CardDescription>
            Select the features and limits for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.entries(TIER_FEATURES) as [TenantTier, typeof TIER_FEATURES["free"]][]).map(
              ([tierKey, tierInfo]) => (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setTier(tierKey)}
                  className={cn(
                    "flex flex-col h-full p-4 border rounded-lg text-left transition-colors hover:bg-accent",
                    tier === tierKey && "border-primary ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{tierInfo.name}</span>
                    {tier === tierKey && (
                      <Badge variant="default" className="ml-2">Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tierInfo.description}
                  </p>
                  <ul className="text-sm space-y-1">
                    {tierInfo.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Optional Initial Config */}
      <Card>
        <CardHeader>
          <CardTitle>Initial Configuration (Optional)</CardTitle>
          <CardDescription>
            Pre-configure integrations. These can be changed later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pulsepointAgency">PulsePoint Agency ID</Label>
            <Input
              id="pulsepointAgency"
              value={pulsepointAgency}
              onChange={(e) => setPulsepointAgency(e.target.value)}
              placeholder="e.g., EMS1234"
            />
            <p className="text-xs text-muted-foreground">
              The agency identifier from PulsePoint (can configure later)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weatherZones">NWS Weather Zones</Label>
            <Input
              id="weatherZones"
              value={weatherZones}
              onChange={(e) => setWeatherZones(e.target.value)}
              placeholder="e.g., NCZ036, NCZ037"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated NWS zone codes (can configure later)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Tenant
        </Button>
      </div>
    </form>
  );
}
