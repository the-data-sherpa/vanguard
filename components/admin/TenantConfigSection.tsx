"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";

interface TenantFeatures {
  facebook?: boolean;
  twitter?: boolean;
  instagram?: boolean;
  discord?: boolean;
  weatherAlerts?: boolean;
  userSubmissions?: boolean;
  forum?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  advancedAnalytics?: boolean;
}

interface PulsepointConfig {
  enabled: boolean;
  agencyIds: string[];
  syncInterval: number;
  callTypes?: string[];
}

interface TenantConfigSectionProps {
  tenantId: Id<"tenants">;
  pulsepointConfig?: PulsepointConfig;
  weatherZones?: string[];
  features?: TenantFeatures;
}

export function TenantConfigSection({
  tenantId,
  pulsepointConfig,
  weatherZones,
  features,
}: TenantConfigSectionProps) {
  // PulsePoint state
  const [ppEnabled, setPpEnabled] = useState(pulsepointConfig?.enabled ?? false);
  const [ppAgencyIds, setPpAgencyIds] = useState(pulsepointConfig?.agencyIds?.join(", ") ?? "");
  const [ppSyncInterval, setPpSyncInterval] = useState(pulsepointConfig?.syncInterval?.toString() ?? "120");
  const [ppSaving, setPpSaving] = useState(false);
  const [ppMessage, setPpMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Weather state
  const [wzZones, setWzZones] = useState(weatherZones?.join(", ") ?? "");
  const [wzSaving, setWzSaving] = useState(false);
  const [wzMessage, setWzMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Features state
  const [localFeatures, setLocalFeatures] = useState<TenantFeatures>(features ?? {});
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresMessage, setFeaturesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updatePulsepointConfig = useMutation(api.tenants.updatePulsepointConfig);
  const updateWeatherZones = useMutation(api.tenants.updateWeatherZones);
  const updateFeatures = useMutation(api.admin.updateTenantFeatures);

  const handleSavePulsepoint = async () => {
    setPpSaving(true);
    setPpMessage(null);

    try {
      const agencyIds = ppAgencyIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      await updatePulsepointConfig({
        tenantId,
        config: {
          enabled: ppEnabled,
          agencyIds,
          syncInterval: parseInt(ppSyncInterval) || 120,
        },
        deleteExistingIncidents: true,
      });

      setPpMessage({ type: "success", text: "PulsePoint configuration saved" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save";
      if (message === "AGENCY_CHANGE_REQUIRES_CONFIRMATION") {
        setPpMessage({ type: "error", text: "Agency change requires confirmation. Existing incidents will be deleted." });
      } else {
        setPpMessage({ type: "error", text: message });
      }
    } finally {
      setPpSaving(false);
    }
  };

  const handleSaveWeatherZones = async () => {
    setWzSaving(true);
    setWzMessage(null);

    try {
      const zones = wzZones
        .split(",")
        .map((z) => z.trim().toUpperCase())
        .filter(Boolean);

      await updateWeatherZones({
        tenantId,
        zones,
      });

      setWzMessage({ type: "success", text: "Weather zones saved" });
    } catch (error) {
      setWzMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save" });
    } finally {
      setWzSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setFeaturesSaving(true);
    setFeaturesMessage(null);

    try {
      await updateFeatures({
        tenantId,
        features: localFeatures,
      });

      setFeaturesMessage({ type: "success", text: "Features saved" });
    } catch (error) {
      setFeaturesMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save" });
    } finally {
      setFeaturesSaving(false);
    }
  };

  const toggleFeature = (key: keyof TenantFeatures) => {
    setLocalFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const FEATURE_LABELS: Record<keyof TenantFeatures, string> = {
    facebook: "Facebook Integration",
    twitter: "Twitter Integration",
    instagram: "Instagram Integration",
    discord: "Discord Integration",
    weatherAlerts: "Weather Alerts",
    userSubmissions: "User Submissions",
    forum: "Community Forum",
    customBranding: "Custom Branding",
    apiAccess: "API Access",
    advancedAnalytics: "Advanced Analytics",
  };

  return (
    <div className="space-y-6">
      {/* PulsePoint Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>PulsePoint Configuration</CardTitle>
          <CardDescription>
            Configure incident data sync from PulsePoint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pp-enabled">Enable PulsePoint</Label>
              <p className="text-xs text-muted-foreground">
                Sync incident data from PulsePoint
              </p>
            </div>
            <Switch
              id="pp-enabled"
              checked={ppEnabled}
              onCheckedChange={setPpEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-agency">Agency IDs</Label>
            <Input
              id="pp-agency"
              value={ppAgencyIds}
              onChange={(e) => setPpAgencyIds(e.target.value)}
              placeholder="e.g., EMS1234, FD5678"
              disabled={!ppEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated PulsePoint agency identifiers
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-interval">Sync Interval (seconds)</Label>
            <Input
              id="pp-interval"
              type="number"
              value={ppSyncInterval}
              onChange={(e) => setPpSyncInterval(e.target.value)}
              placeholder="120"
              disabled={!ppEnabled}
              min={60}
              max={600}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSavePulsepoint} disabled={ppSaving}>
              {ppSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {ppMessage && (
              <p className={`text-sm ${ppMessage.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {ppMessage.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weather Zones */}
      <Card>
        <CardHeader>
          <CardTitle>Weather Zones</CardTitle>
          <CardDescription>
            Configure NWS weather alert zones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wz-zones">NWS Zone Codes</Label>
            <Input
              id="wz-zones"
              value={wzZones}
              onChange={(e) => setWzZones(e.target.value)}
              placeholder="e.g., NCZ036, NCZ037, ALZ001"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated NWS zone codes (format: 2-letter state + C/Z + 3 digits)
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveWeatherZones} disabled={wzSaving}>
              {wzSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {wzMessage && (
              <p className={`text-sm ${wzMessage.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {wzMessage.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>
            Enable or disable features for this tenant (platform admin override)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(FEATURE_LABELS) as Array<keyof TenantFeatures>).map((key) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <Label htmlFor={`feature-${key}`} className="cursor-pointer">
                  {FEATURE_LABELS[key]}
                </Label>
                <Switch
                  id={`feature-${key}`}
                  checked={localFeatures[key] ?? false}
                  onCheckedChange={() => toggleFeature(key)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button onClick={handleSaveFeatures} disabled={featuresSaving}>
              {featuresSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Features
            </Button>
            {featuresMessage && (
              <p className={`text-sm ${featuresMessage.type === "success" ? "text-green-600" : "text-destructive"}`}>
                {featuresMessage.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
