"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Building2, Settings, ArrowRight, ArrowLeft } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const userTenantStatus = useQuery(api.users.hasAnyTenant);
  const createTenant = useMutation(api.tenants.createAsOwner);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Organization details
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallySet, setSlugManuallySet] = useState(false);
  const [slugCheckDebounce, setSlugCheckDebounce] = useState<string>("");

  // Step 2: Optional configuration
  const [pulsepointAgency, setPulsepointAgency] = useState("");
  const [weatherZones, setWeatherZones] = useState("");

  // Check slug availability with debounce
  const slugAvailability = useQuery(
    api.tenants.checkSlugAvailable,
    slugCheckDebounce.length >= 3 ? { slug: slugCheckDebounce } : "skip"
  );

  // Debounce slug check with ref to avoid stale closure
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (slug.length >= 3) {
        setSlugCheckDebounce(slug);
      }
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [slug]);

  // Redirect if user already has a tenant
  useEffect(() => {
    if (userTenantStatus?.hasTenant && userTenantStatus.tenantId) {
      router.push("/tenant");
    }
  }, [userTenantStatus, router]);

  // Handle org name change - auto-generate slug if not manually set
  const handleOrgNameChange = (value: string) => {
    setOrgName(value);
    if (!slugManuallySet) {
      const newSlug = slugify(value);
      setSlug(newSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallySet(true);
    const newSlug = slugify(value);
    setSlug(newSlug);
  };

  const canProceedStep1 = () => {
    return (
      orgName.trim().length > 0 &&
      slug.length >= 3 &&
      slugAvailability?.available === true
    );
  };

  const handleSubmit = async () => {
    if (!canProceedStep1()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse weather zones
      const zones = weatherZones
        .split(",")
        .map((z) => z.trim().toUpperCase())
        .filter((z) => z.length > 0);

      await createTenant({
        name: orgName.trim(),
        slug: slug.trim(),
        pulsepointAgencyId: pulsepointAgency.trim() || undefined,
        weatherZones: zones.length > 0 ? zones : undefined,
      });

      // Redirect to pending approval page (tenant requires admin approval)
      router.push("/pending-approval");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      setIsSubmitting(false);
    }
  };

  // Show loading while checking tenant status
  if (!userTenantStatus) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user is not authenticated, they shouldn't be here
  if (!userTenantStatus.isAuthenticated) {
    router.push("/login");
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <span className={step === 1 ? "font-medium" : "text-muted-foreground"}>
              Organization
            </span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              2
            </div>
            <span className={step === 2 ? "font-medium" : "text-muted-foreground"}>
              Configuration
            </span>
          </div>
        </div>
      </div>

      {/* Step 1: Organization Details */}
      {step === 1 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Your Organization</CardTitle>
            <CardDescription>
              Set up your community&apos;s incident monitoring dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => handleOrgNameChange(e.target.value)}
                placeholder="e.g., Springfield Fire Department"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The name of your fire department, rescue squad, or community
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Dashboard URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  vanguard.app/tenant/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="springfield-fd"
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2 min-h-5">
                {slug.length > 0 && slug.length < 3 && (
                  <p className="text-xs text-amber-600">
                    URL must be at least 3 characters
                  </p>
                )}
                {slug.length >= 3 && slugAvailability === undefined && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking availability...
                  </p>
                )}
                {slug.length >= 3 && slugAvailability?.available === true && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Available
                  </p>
                )}
                {slug.length >= 3 && slugAvailability?.available === false && (
                  <p className="text-xs text-destructive">
                    This URL is already taken
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Badge variant="secondary" className="mb-4">
                14-day free trial after approval - No credit card required
              </Badge>
            </div>

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!canProceedStep1()}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Configure Integrations</CardTitle>
            <CardDescription>
              Set up data sources (you can skip this and configure later)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pulsepointAgency">PulsePoint Agency ID (Optional)</Label>
              <Input
                id="pulsepointAgency"
                value={pulsepointAgency}
                onChange={(e) => setPulsepointAgency(e.target.value)}
                placeholder="e.g., EMS1234"
              />
              <p className="text-xs text-muted-foreground">
                Your agency&apos;s PulsePoint identifier for incident data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weatherZones">NWS Weather Zones (Optional)</Label>
              <Input
                id="weatherZones"
                value={weatherZones}
                onChange={(e) => setWeatherZones(e.target.value)}
                placeholder="e.g., NCZ036, NCZ037"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated NWS zone codes for weather alerts
              </p>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Organization
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
