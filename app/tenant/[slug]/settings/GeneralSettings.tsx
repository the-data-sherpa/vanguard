"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, Upload, X, ImageIcon, Clock } from "lucide-react";

// Common US timezones
const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
];

interface GeneralSettingsProps {
  tenant: {
    _id: Id<"tenants">;
    name: string;
    displayName?: string;
    description?: string;
    logoUrl?: string;
    primaryColor?: string;
    timezone?: string;
    slug: string;
    status: string;
    tier: string;
    lastIncidentSync?: number;
    lastWeatherSync?: number;
  };
}

export function GeneralSettings({ tenant }: GeneralSettingsProps) {
  const [displayName, setDisplayName] = useState(tenant.displayName || tenant.name);
  const [description, setDescription] = useState(tenant.description || "");
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor || "#3b82f6");
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || "");
  const [timezone, setTimezone] = useState(tenant.timezone || "America/New_York");
  const [saving, setSaving] = useState(false);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [timezoneMessage, setTimezoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateBranding = useMutation(api.tenants.updateBranding);
  const updateTimezone = useMutation(api.tenants.updateTimezone);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await updateBranding({
        tenantId: tenant._id,
        displayName: displayName || undefined,
        description: description || undefined,
        logoUrl: logoUrl || undefined,
        primaryColor: primaryColor || undefined,
      });

      setMessage({ type: "success", text: "Settings saved successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 2MB" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // Get presigned upload URL from Convex
      const uploadUrl = await generateUploadUrl({ tenantId: tenant._id });

      // Upload file to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();

      // Save file metadata and get URL
      const fileUrl = await saveFile({
        tenantId: tenant._id,
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      setLogoUrl(fileUrl);
      setMessage({ type: "success", text: "Logo uploaded successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload logo",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    setSavingTimezone(true);
    setTimezoneMessage(null);

    try {
      await updateTimezone({
        tenantId: tenant._id,
        timezone: newTimezone,
      });
      setTimezoneMessage({ type: "success", text: "Timezone updated" });
    } catch (error) {
      setTimezoneMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update timezone",
      });
    } finally {
      setSavingTimezone(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tenant Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
          <CardDescription>Basic information about this tenant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{tenant.displayName || tenant.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slug</span>
            <span className="font-mono text-sm">{tenant.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{tenant.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tier</span>
            <span className="font-medium capitalize">{tenant.tier}</span>
          </div>
          {tenant.lastIncidentSync && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Incident Sync</span>
              <span className="text-sm">
                {new Date(tenant.lastIncidentSync).toLocaleString()}
              </span>
            </div>
          )}
          {tenant.lastWeatherSync && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Weather Sync</span>
              <span className="text-sm">
                {new Date(tenant.lastWeatherSync).toLocaleString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timezone Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your organization&apos;s timezone for dispatch times and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <div className="flex items-center gap-4">
              <Select
                value={timezone}
                onValueChange={handleTimezoneChange}
                disabled={savingTimezone}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {US_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingTimezone && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {timezoneMessage && (
                <p
                  className={`text-sm ${
                    timezoneMessage.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {timezoneMessage.text}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              All times in incident posts and Mission Control will use this timezone
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Branding Card */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize how your tenant appears to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Logo</Label>
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                {logoUrl ? (
                  <>
                    <img
                      src={logoUrl}
                      alt="Tenant logo"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or SVG. Max 2MB. Recommended: 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your organization name"
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown to users throughout the application
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your organization..."
              rows={3}
            />
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-md border shadow-sm"
                style={{ backgroundColor: primaryColor }}
              />
              <Input
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                className="font-mono w-32"
              />
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Hex color code for your brand accent color
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
