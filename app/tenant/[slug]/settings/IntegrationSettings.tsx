"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, X, Plus } from "lucide-react";
import { SyncControls } from "./SyncControls";
import { PulsePointConfig } from "./PulsePointConfig";

interface IntegrationSettingsProps {
  tenant: {
    _id: Id<"tenants">;
    features?: {
      weatherAlerts?: boolean;
    };
    pulsepointConfig?: {
      enabled: boolean;
      agencyIds: string[];
      syncInterval: number;
    };
    weatherZones?: string[];
    unitLegendAvailable?: boolean;
    unitLegendUpdatedAt?: number;
    unitLegend?: Array<{ UnitKey: string; Description: string }>;
  };
}

export function IntegrationSettings({ tenant }: IntegrationSettingsProps) {
  const [zones, setZones] = useState<string[]>(tenant.weatherZones || []);
  const [newZone, setNewZone] = useState("");
  const [savingZones, setSavingZones] = useState(false);
  const [zoneMessage, setZoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateWeatherZones = useMutation(api.tenants.updateWeatherZones);

  const handleAddZone = () => {
    const zone = newZone.trim().toUpperCase();
    if (!zone) return;

    // Basic validation for NWS zone format
    const nwsPattern = /^[A-Z]{2}[CZ]\d{3}$/;
    if (!nwsPattern.test(zone)) {
      setZoneMessage({
        type: "error",
        text: "Invalid zone format. Use format like NCZ036 or ALZ001",
      });
      return;
    }

    if (zones.includes(zone)) {
      setZoneMessage({ type: "error", text: "Zone already added" });
      return;
    }

    setZones([...zones, zone]);
    setNewZone("");
    setZoneMessage(null);
  };

  const handleRemoveZone = (zone: string) => {
    setZones(zones.filter((z) => z !== zone));
    setZoneMessage(null);
  };

  const handleSaveZones = async () => {
    setSavingZones(true);
    setZoneMessage(null);

    try {
      await updateWeatherZones({
        tenantId: tenant._id,
        zones,
      });
      setZoneMessage({ type: "success", text: "Weather zones saved successfully" });
    } catch (error) {
      setZoneMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save zones",
      });
    } finally {
      setSavingZones(false);
    }
  };

  const hasZoneChanges =
    JSON.stringify(zones.sort()) !== JSON.stringify((tenant.weatherZones || []).sort());

  return (
    <div className="space-y-6">
      {/* Data Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
          <CardDescription>
            Force sync data from external sources. Automatic syncs run periodically,
            but you can trigger manual syncs here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncControls
            tenantId={tenant._id}
            hasWeatherEnabled={tenant.features?.weatherAlerts ?? false}
            hasPulsepointEnabled={tenant.pulsepointConfig?.enabled ?? false}
            unitLegendStatus={{
              available: tenant.unitLegendAvailable,
              updatedAt: tenant.unitLegendUpdatedAt,
              unitCount: tenant.unitLegend?.length ?? 0,
            }}
          />
        </CardContent>
      </Card>

      {/* PulsePoint Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>PulsePoint Configuration</CardTitle>
          <CardDescription>Emergency incident data source settings</CardDescription>
        </CardHeader>
        <CardContent>
          <PulsePointConfig
            tenantId={tenant._id}
            initialConfig={tenant.pulsepointConfig}
          />
        </CardContent>
      </Card>

      {/* Weather Zones */}
      <Card>
        <CardHeader>
          <CardTitle>Weather Zones</CardTitle>
          <CardDescription>
            Configure NWS weather zones to receive alerts for your area
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Zones */}
          <div className="space-y-2">
            <Label>Active Zones</Label>
            <div className="flex flex-wrap gap-2">
              {zones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No zones configured</p>
              ) : (
                zones.map((zone) => (
                  <Badge key={zone} variant="secondary" className="flex items-center gap-1">
                    {zone}
                    <button
                      onClick={() => handleRemoveZone(zone)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Add Zone */}
          <div className="space-y-2">
            <Label htmlFor="newZone">Add Zone</Label>
            <div className="flex gap-2">
              <Input
                id="newZone"
                value={newZone}
                onChange={(e) => {
                  setNewZone(e.target.value);
                  setZoneMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddZone();
                  }
                }}
                placeholder="e.g., NCZ036"
                className="font-mono w-32"
              />
              <Button type="button" variant="outline" onClick={handleAddZone}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter NWS zone codes. Format: 2-letter state + C/Z + 3 digits (e.g., NCZ036, ALZ001)
            </p>
          </div>

          {/* Save Zones */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSaveZones} disabled={savingZones || !hasZoneChanges}>
              {savingZones ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Zones
            </Button>
            {zoneMessage && (
              <p
                className={`text-sm ${
                  zoneMessage.type === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {zoneMessage.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
