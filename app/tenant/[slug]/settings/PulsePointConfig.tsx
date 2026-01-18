"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, AlertTriangle } from "lucide-react";

interface PulsePointConfigProps {
  tenantId: Id<"tenants">;
  initialConfig?: {
    enabled: boolean;
    agencyIds: string[];
    syncInterval: number;
  };
}

export function PulsePointConfig({ tenantId, initialConfig }: PulsePointConfigProps) {
  const initialAgencyId = initialConfig?.agencyIds?.[0] || "";
  const [agencyId, setAgencyId] = useState(initialAgencyId);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updatePulsepointConfig = useMutation(api.tenants.updatePulsepointConfig);

  const handleSave = async () => {
    // If there's an existing agency ID and it's changing, show confirmation first
    if (initialAgencyId && agencyId.trim() !== initialAgencyId && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setSaving(true);
    setMessage(null);
    setShowConfirm(false);

    try {
      const trimmedAgencyId = agencyId.trim();
      await updatePulsepointConfig({
        tenantId,
        config: {
          enabled: !!trimmedAgencyId,
          agencyIds: trimmedAgencyId ? [trimmedAgencyId] : [],
          syncInterval: 60, // 1 minute default
        },
      });

      setMessage({
        type: "success",
        text: trimmedAgencyId
          ? "Agency ID saved successfully"
          : "PulsePoint configuration cleared",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setAgencyId(initialAgencyId);
  };

  const hasChanges = agencyId.trim() !== initialAgencyId;
  const isChangingExistingAgency = initialAgencyId && hasChanges;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agencyId">PulsePoint Agency ID</Label>
        <div className="flex gap-2">
          <Input
            id="agencyId"
            value={agencyId}
            onChange={(e) => {
              setAgencyId(e.target.value);
              setShowConfirm(false);
              setMessage(null);
            }}
            placeholder="e.g., EMS1205"
            className="font-mono"
            disabled={saving}
          />
          {!showConfirm ? (
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              size="default"
              variant={isChangingExistingAgency ? "destructive" : "default"}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="ml-2">Save</span>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                disabled={saving}
                size="default"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                size="default"
                variant="destructive"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The PulsePoint agency ID for your area. You can find this in the PulsePoint app URL.
        </p>
      </div>

      {showConfirm && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Warning: Changing agency ID</p>
            <p className="text-muted-foreground mt-1">
              Changing the agency ID will affect incident syncing. New incidents will come
              from the new agency.
            </p>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
