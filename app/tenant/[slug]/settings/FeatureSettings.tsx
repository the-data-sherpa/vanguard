"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Loader2, CloudRain, Users, MessageSquare, Share2, Zap, BarChart3 } from "lucide-react";

interface FeatureSettingsProps {
  tenant: {
    _id: Id<"tenants">;
    tier: string;
    features?: {
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
    };
  };
}

interface FeatureToggle {
  key: keyof NonNullable<FeatureSettingsProps["tenant"]["features"]>;
  label: string;
  description: string;
  icon: React.ReactNode;
  tierRequired?: string[];
}

const FEATURES: FeatureToggle[] = [
  {
    key: "weatherAlerts",
    label: "Weather Alerts",
    description: "Enable NWS weather alerts for your coverage area",
    icon: <CloudRain className="h-5 w-5" />,
  },
  {
    key: "userSubmissions",
    label: "User Submissions",
    description: "Allow community members to submit incident reports",
    icon: <Users className="h-5 w-5" />,
  },
  {
    key: "forum",
    label: "Community Forum",
    description: "Enable community discussion forum",
    icon: <MessageSquare className="h-5 w-5" />,
    tierRequired: ["starter", "professional", "enterprise"],
  },
  {
    key: "facebook",
    label: "Facebook Integration",
    description: "Auto-post incidents and alerts to Facebook",
    icon: <Share2 className="h-5 w-5" />,
    tierRequired: ["starter", "professional", "enterprise"],
  },
  {
    key: "twitter",
    label: "Twitter Integration",
    description: "Auto-post incidents and alerts to Twitter",
    icon: <Share2 className="h-5 w-5" />,
    tierRequired: ["professional", "enterprise"],
  },
  {
    key: "discord",
    label: "Discord Integration",
    description: "Send notifications to Discord channels",
    icon: <Share2 className="h-5 w-5" />,
    tierRequired: ["professional", "enterprise"],
  },
  {
    key: "apiAccess",
    label: "API Access",
    description: "Enable REST API access for external integrations",
    icon: <Zap className="h-5 w-5" />,
    tierRequired: ["professional", "enterprise"],
  },
  {
    key: "advancedAnalytics",
    label: "Advanced Analytics",
    description: "Access detailed analytics and reporting",
    icon: <BarChart3 className="h-5 w-5" />,
    tierRequired: ["enterprise"],
  },
];

export function FeatureSettings({ tenant }: FeatureSettingsProps) {
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const feature of FEATURES) {
      initial[feature.key] = tenant.features?.[feature.key] ?? false;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const updateFeatures = useMutation(api.tenants.updateFeatures);

  const handleToggle = (key: string, enabled: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: enabled }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      await updateFeatures({
        tenantId: tenant._id,
        features: {
          facebook: features.facebook,
          twitter: features.twitter,
          instagram: features.instagram,
          discord: features.discord,
          weatherAlerts: features.weatherAlerts,
          userSubmissions: features.userSubmissions,
          forum: features.forum,
          customBranding: features.customBranding,
          apiAccess: features.apiAccess,
          advancedAnalytics: features.advancedAnalytics,
        },
      });
      setMessage({ type: "success", text: "Features saved successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save features",
      });
    } finally {
      setSaving(false);
    }
  };

  const isFeatureAvailable = (feature: FeatureToggle) => {
    if (!feature.tierRequired) return true;
    return feature.tierRequired.includes(tenant.tier);
  };

  const hasChanges = () => {
    for (const feature of FEATURES) {
      if (features[feature.key] !== (tenant.features?.[feature.key] ?? false)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Enable or disable features for your tenant. Some features require higher tier plans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FEATURES.map((feature) => {
            const available = isFeatureAvailable(feature);
            const enabled = features[feature.key];

            return (
              <div
                key={feature.key}
                className={`flex items-start justify-between gap-4 p-4 rounded-lg border ${
                  !available ? "opacity-60 bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-muted-foreground mt-0.5">{feature.icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={feature.key}
                        className={`font-medium ${!available ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {feature.label}
                      </Label>
                      {!available && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          {feature.tierRequired?.[0]} tier
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  id={feature.key}
                  checked={enabled}
                  onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                  disabled={!available}
                />
              </div>
            );
          })}

          <div className="flex items-center gap-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !hasChanges()}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Features
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
