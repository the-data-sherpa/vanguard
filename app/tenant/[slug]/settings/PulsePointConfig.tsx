"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, AlertTriangle, Trash2 } from "lucide-react";

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

  const handleSave = async (confirmDelete = false) => {
    // If there's an existing agency ID and it's changing, show confirmation first
    if (initialAgencyId && agencyId.trim() !== initialAgencyId && !showConfirm && !confirmDelete) {
      setShowConfirm(true);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const trimmedAgencyId = agencyId.trim();
      const isChangingAgency = initialAgencyId && trimmedAgencyId !== initialAgencyId;

      await updatePulsepointConfig({
        tenantId,
        config: {
          enabled: !!trimmedAgencyId,
          agencyIds: trimmedAgencyId ? [trimmedAgencyId] : [],
          syncInterval: 60, // 1 minute default
        },
        // Pass deleteExistingIncidents when changing agencies
        deleteExistingIncidents: isChangingAgency ? true : undefined,
      });

      setShowConfirm(false);
      setMessage({
        type: "success",
        text: isChangingAgency
          ? "Agency changed. All previous incident data has been cleared."
          : trimmedAgencyId
            ? "Agency ID saved successfully"
            : "PulsePoint configuration cleared",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save";

      // Handle the special confirmation error
      if (errorMessage === "AGENCY_CHANGE_REQUIRES_CONFIRMATION") {
        setShowConfirm(true);
        setSaving(false);
        return;
      }

      setMessage({
        type: "error",
        text: errorMessage,
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
              onClick={() => handleSave(false)}
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
                onClick={() => handleSave(true)}
                disabled={saving}
                size="default"
                variant="destructive"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Data & Change
                  </>
                )}
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
            <p className="font-medium text-destructive">Warning: This will permanently delete all incident data</p>
            <p className="text-muted-foreground mt-1">
              Changing the agency ID will <strong className="text-destructive">permanently delete</strong> all
              existing incidents, notes, and grouped incident data. This action cannot be undone.
            </p>
            <p className="text-muted-foreground mt-1">
              New incidents will be synced from the new agency after the change.
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
