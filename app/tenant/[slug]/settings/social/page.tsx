"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  Facebook,
  Settings,
  Link2,
  Unlink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Star,
  Eye,
  Send,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface SocialSettingsPageProps {
  params: Promise<{ slug: string }>;
}

// Available call type categories for filtering
const CALL_TYPE_CATEGORIES = [
  { id: "fire", label: "Fire", description: "Structure fires, brush fires, etc." },
  { id: "medical", label: "Medical/EMS", description: "Medical emergencies" },
  { id: "traffic", label: "Traffic", description: "Vehicle accidents, traffic hazards" },
  { id: "rescue", label: "Rescue", description: "Technical rescues, water rescues" },
  { id: "hazmat", label: "HazMat", description: "Hazardous materials incidents" },
  { id: "other", label: "Other", description: "All other incident types" },
];

export default function SocialSettingsPage({ params }: SocialSettingsPageProps) {
  return (
    <AuthGuard requiredRole="owner">
      <SocialSettingsContent params={params} />
    </AuthGuard>
  );
}

function SocialSettingsContent({ params }: SocialSettingsPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isSendingTestPost, setIsSendingTestPost] = useState(false);
  const [testPostResult, setTestPostResult] = useState<{
    success: boolean;
    postUrl?: string;
    error?: string;
  } | null>(null);

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const facebookStatus = useQuery(
    api.missionControl.getFacebookStatus,
    tenant ? { tenantId: tenant._id } : "skip"
  );

  const disconnectFacebook = useMutation(api.facebook.disconnect);
  const sendTestPost = useAction(api.facebook.sendTestPost);

  // Loading state
  if (tenant === undefined || facebookStatus === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Tenant not found</p>
      </div>
    );
  }

  const handleConnectFacebook = () => {
    // Redirect to Facebook OAuth
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      console.error("Facebook App ID not configured");
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/facebook/callback`;
    // Include both tenant ID and slug in state for redirect after OAuth
    const state = JSON.stringify({ tenantId: tenant._id, slug: tenant.slug });
    const scope = "pages_show_list,pages_manage_posts";

    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("response_type", "code");

    window.location.href = authUrl.toString();
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectFacebook({ tenantId: tenant._id });
      setShowDisconnectDialog(false);
    } catch (error) {
      console.error("Failed to disconnect Facebook:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSendTestPost = async () => {
    setIsSendingTestPost(true);
    setTestPostResult(null);
    try {
      const result = await sendTestPost({ tenantId: tenant._id });
      setTestPostResult(result);
    } catch (error) {
      setTestPostResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test post",
      });
    } finally {
      setIsSendingTestPost(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Social Media Settings
        </h1>
        <p className="text-muted-foreground">
          Connect your social media accounts for automatic posting
        </p>
      </div>

      {/* Facebook Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            Facebook Page
          </CardTitle>
          <CardDescription>
            Connect your Facebook page to automatically post incident updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {facebookStatus?.isConnected ? (
            <>
              {/* Connected state */}
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">{facebookStatus.pageName}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Connected {facebookStatus.connectedAt && formatDistanceToNow(facebookStatus.connectedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              </div>

              {/* Token expiration warning */}
              {facebookStatus.isExpired && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Token Expired</p>
                    <p className="text-sm">
                      Your Facebook connection has expired. Please reconnect to continue posting.
                    </p>
                  </div>
                </div>
              )}

              {/* Test Post Section */}
              <div className="border-t pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium">Test Your Connection</h4>
                    <p className="text-sm text-muted-foreground">
                      Send a test post to verify your Facebook integration is working correctly.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSendTestPost}
                    disabled={isSendingTestPost || facebookStatus.isExpired}
                  >
                    {isSendingTestPost ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Test Post
                  </Button>
                </div>

                {/* Test post result */}
                {testPostResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    testPostResult.success
                      ? "bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800"
                  }`}>
                    {testPostResult.success ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 dark:text-green-100">Test post sent successfully!</p>
                          {testPostResult.postUrl && (
                            <a
                              href={testPostResult.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-green-700 dark:text-green-300 hover:underline inline-flex items-center gap-1"
                            >
                              View post on Facebook
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-100">Failed to send test post</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{testPostResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleConnectFacebook}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => setShowDisconnectDialog(true)}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not connected state */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">No page connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Facebook page to get started
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleConnectFacebook}>
                <Facebook className="mr-2 h-4 w-4" />
                Connect Facebook Page
              </Button>

              <p className="text-sm text-muted-foreground">
                You will be redirected to Facebook to authorize access to your page.
                We only request permission to post updates.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Auto-Post Settings Card */}
      <AutoPostRulesCard tenantId={tenant._id} isConnected={facebookStatus?.isConnected || false} />

      {/* Post Templates Card */}
      <PostTemplatesCard tenantId={tenant._id} />

      {/* Other Platforms Card */}
      <Card>
        <CardHeader>
          <CardTitle>Other Platforms</CardTitle>
          <CardDescription>
            Additional social media integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
                <span className="text-white font-bold">X</span>
              </div>
              <div>
                <p className="font-medium">Twitter / X</p>
                <p className="text-sm text-muted-foreground">
                  Post updates to Twitter
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center">
                <span className="text-white font-bold text-sm">DC</span>
              </div>
              <div>
                <p className="font-medium">Discord</p>
                <p className="text-sm text-muted-foreground">
                  Send updates via Discord webhook
                </p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Facebook Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop all automatic posting to your Facebook page. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ===================
// Auto-Post Rules Component
// ===================

function AutoPostRulesCard({ tenantId, isConnected }: { tenantId: Id<"tenants">; isConnected: boolean }) {
  const rules = useQuery(api.autoPostRules.get, { tenantId });
  const saveRules = useMutation(api.autoPostRules.save);

  const [enabled, setEnabled] = useState(false);
  const [callTypes, setCallTypes] = useState<string[]>([]);
  const [excludeMedical, setExcludeMedical] = useState(true);
  const [minUnits, setMinUnits] = useState<string>("");
  const [delaySeconds, setDelaySeconds] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load rules when data arrives
  useEffect(() => {
    if (rules) {
      setEnabled(rules.enabled);
      setCallTypes(rules.callTypes);
      setExcludeMedical(rules.excludeMedical);
      setMinUnits(rules.minUnits?.toString() || "");
      setDelaySeconds(rules.delaySeconds?.toString() || "");
      setHasChanges(false);
    }
  }, [rules]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveRules({
        tenantId,
        enabled,
        callTypes,
        excludeMedical,
        minUnits: minUnits ? parseInt(minUnits) : undefined,
        delaySeconds: delaySeconds ? parseInt(delaySeconds) : undefined,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save rules:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCallType = (typeId: string) => {
    setCallTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
    setHasChanges(true);
  };

  if (rules === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Auto-Post Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto-Post Settings</CardTitle>
        <CardDescription>
          Configure which incidents are automatically posted to Facebook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-post-enabled" className="text-base">
              Enable Auto-Posting
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically post qualifying incidents to Facebook
            </p>
          </div>
          <Switch
            id="auto-post-enabled"
            checked={enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              setHasChanges(true);
            }}
            disabled={!isConnected}
          />
        </div>

        {!isConnected && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Connect your Facebook page above to enable auto-posting.
          </p>
        )}

        {/* Call Type Filters */}
        <div className="space-y-3">
          <Label className="text-base">Incident Types to Post</Label>
          <p className="text-sm text-muted-foreground">
            Select which types of incidents should be automatically posted
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CALL_TYPE_CATEGORIES.map((type) => (
              <div
                key={type.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  callTypes.includes(type.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleCallType(type.id)}
              >
                <Checkbox
                  id={`type-${type.id}`}
                  checked={callTypes.includes(type.id)}
                  onCheckedChange={() => toggleCallType(type.id)}
                />
                <div className="space-y-1">
                  <Label htmlFor={`type-${type.id}`} className="cursor-pointer font-medium">
                    {type.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exclude Medical Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="space-y-0.5">
            <Label htmlFor="exclude-medical" className="text-base">
              Exclude Medical Calls
            </Label>
            <p className="text-sm text-muted-foreground">
              Do not post medical emergencies (HIPAA privacy)
            </p>
          </div>
          <Switch
            id="exclude-medical"
            checked={excludeMedical}
            onCheckedChange={(checked) => {
              setExcludeMedical(checked);
              setHasChanges(true);
            }}
          />
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min-units">Minimum Units</Label>
            <Input
              id="min-units"
              type="number"
              min="1"
              placeholder="Any"
              value={minUnits}
              onChange={(e) => {
                setMinUnits(e.target.value);
                setHasChanges(true);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Only post if this many units respond
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay-seconds">Delay (seconds)</Label>
            <Input
              id="delay-seconds"
              type="number"
              min="0"
              max="300"
              placeholder="0"
              value={delaySeconds}
              onChange={(e) => {
                setDelaySeconds(e.target.value);
                setHasChanges(true);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Wait before posting new incidents
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===================
// Post Templates Component
// ===================

interface PostTemplate {
  _id: Id<"postTemplates">;
  name: string;
  callTypes: string[];
  template: string;
  includeUnits: boolean;
  includeMap: boolean;
  hashtags: string[];
  isDefault?: boolean;
}

function PostTemplatesCard({ tenantId }: { tenantId: Id<"tenants"> }) {
  const templates = useQuery(api.postTemplates.list, { tenantId });
  const createTemplate = useMutation(api.postTemplates.create);
  const updateTemplate = useMutation(api.postTemplates.update);
  const deleteTemplate = useMutation(api.postTemplates.remove);
  const setDefaultTemplate = useMutation(api.postTemplates.setDefault);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCallTypes, setFormCallTypes] = useState<string[]>([]);
  const [formTemplate, setFormTemplate] = useState("");
  const [formIncludeUnits, setFormIncludeUnits] = useState(true);
  const [formIncludeMap, setFormIncludeMap] = useState(false);
  const [formHashtags, setFormHashtags] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormCallTypes([]);
    setFormTemplate(DEFAULT_TEMPLATE);
    setFormIncludeUnits(true);
    setFormIncludeMap(false);
    setFormHashtags("#EmergencyAlert #FirstResponders");
    setFormIsDefault(false);
  };

  const loadTemplateToForm = (template: PostTemplate) => {
    setFormName(template.name);
    setFormCallTypes(template.callTypes);
    setFormTemplate(template.template);
    setFormIncludeUnits(template.includeUnits);
    setFormIncludeMap(template.includeMap);
    setFormHashtags(template.hashtags.join(" "));
    setFormIsDefault(template.isDefault || false);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const hashtags = formHashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      await createTemplate({
        tenantId,
        name: formName,
        callTypes: formCallTypes,
        template: formTemplate,
        includeUnits: formIncludeUnits,
        includeMap: formIncludeMap,
        hashtags,
        isDefault: formIsDefault,
      });
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const hashtags = formHashtags
        .split(/[\s,]+/)
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      await updateTemplate({
        tenantId,
        templateId: selectedTemplate._id,
        name: formName,
        callTypes: formCallTypes,
        template: formTemplate,
        includeUnits: formIncludeUnits,
        includeMap: formIncludeMap,
        hashtags,
        isDefault: formIsDefault,
      });
      setShowEditDialog(false);
      setSelectedTemplate(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      await deleteTemplate({ tenantId, templateId: selectedTemplate._id });
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to delete template:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (template: PostTemplate) => {
    try {
      await setDefaultTemplate({ tenantId, templateId: template._id });
    } catch (error) {
      console.error("Failed to set default template:", error);
    }
  };

  const toggleFormCallType = (typeId: string) => {
    setFormCallTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  // Generate preview
  const generatePreview = (template: string): string => {
    let preview = template;
    preview = preview.replace(/\{\{status\}\}/gi, "🚨 ACTIVE CALL");
    preview = preview.replace(/\{\{callType\}\}/gi, "Structure Fire");
    preview = preview.replace(/\{\{address\}\}/gi, "123 Main Street");
    preview = preview.replace(/\{\{units\}\}/gi, "• E1 - On Scene\n• T1 - En Route\n• BC1 - Dispatched");
    preview = preview.replace(/\{\{unitsGrouped\}\}/gi, "Mooresville:\n• E1 - On Scene\n• T1 - En Route\n\nIredell County:\n• BC1 - Dispatched");
    preview = preview.replace(/\{\{unitCount\}\}/gi, "3");
    preview = preview.replace(/\{\{time\}\}/gi, "2:30 PM");
    preview = preview.replace(/\{\{updates\}\}/gi, "• [2:35 PM] Fire under control");
    preview = preview.replace(/\{\{hashtags\}\}/gi, formHashtags || "#EmergencyAlert");
    return preview.replace(/\n{3,}/g, "\n\n").trim();
  };

  if (templates === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Post Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Post Templates</CardTitle>
              <CardDescription>
                Customize how incidents appear when posted to social media
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No templates created yet. Create a template to customize your posts.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template: Doc<"postTemplates">) => (
                <div
                  key={template._id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="mr-1 h-3 w-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.callTypes.length === 0 || template.callTypes.includes("*")
                        ? "All incident types"
                        : `Types: ${template.callTypes.join(", ")}`}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {template.includeUnits && <span>Units included</span>}
                      {template.hashtags.length > 0 && (
                        <span>{template.hashtags.length} hashtags</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        loadTemplateToForm(template);
                        setShowPreviewDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        loadTemplateToForm(template);
                        setShowEditDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Placeholder hints */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="font-medium text-sm mb-2">Available Placeholders</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><code>{"{{status}}"}</code> - Status with emoji</div>
              <div><code>{"{{callType}}"}</code> - Incident type</div>
              <div><code>{"{{address}}"}</code> - Location</div>
              <div><code>{"{{units}}"}</code> - Unit list (flat)</div>
              <div><code>{"{{unitsGrouped}}"}</code> - Units by department</div>
              <div><code>{"{{unitCount}}"}</code> - Number of units</div>
              <div><code>{"{{time}}"}</code> - Incident time</div>
              <div><code>{"{{updates}}"}</code> - Recent updates</div>
              <div><code>{"{{hashtags}}"}</code> - Your hashtags</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Template Dialog */}
      <TemplateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create Template"
        description="Create a new post template for your incidents"
        formName={formName}
        setFormName={setFormName}
        formCallTypes={formCallTypes}
        toggleFormCallType={toggleFormCallType}
        formTemplate={formTemplate}
        setFormTemplate={setFormTemplate}
        formIncludeUnits={formIncludeUnits}
        setFormIncludeUnits={setFormIncludeUnits}
        formHashtags={formHashtags}
        setFormHashtags={setFormHashtags}
        formIsDefault={formIsDefault}
        setFormIsDefault={setFormIsDefault}
        generatePreview={generatePreview}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        submitLabel="Create Template"
      />

      {/* Edit Template Dialog */}
      <TemplateFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        title="Edit Template"
        description="Update your post template"
        formName={formName}
        setFormName={setFormName}
        formCallTypes={formCallTypes}
        toggleFormCallType={toggleFormCallType}
        formTemplate={formTemplate}
        setFormTemplate={setFormTemplate}
        formIncludeUnits={formIncludeUnits}
        setFormIncludeUnits={setFormIncludeUnits}
        formHashtags={formHashtags}
        setFormHashtags={setFormHashtags}
        formIsDefault={formIsDefault}
        setFormIsDefault={setFormIsDefault}
        generatePreview={generatePreview}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
        submitLabel="Save Changes"
      />

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              How your post will look with sample data
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap font-mono text-sm">
            {generatePreview(formTemplate)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedTemplate?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ===================
// Template Form Dialog Component
// ===================

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formName: string;
  setFormName: (name: string) => void;
  formCallTypes: string[];
  toggleFormCallType: (typeId: string) => void;
  formTemplate: string;
  setFormTemplate: (template: string) => void;
  formIncludeUnits: boolean;
  setFormIncludeUnits: (include: boolean) => void;
  formHashtags: string;
  setFormHashtags: (hashtags: string) => void;
  formIsDefault: boolean;
  setFormIsDefault: (isDefault: boolean) => void;
  generatePreview: (template: string) => string;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

function TemplateFormDialog({
  open,
  onOpenChange,
  title,
  description,
  formName,
  setFormName,
  formCallTypes,
  toggleFormCallType,
  formTemplate,
  setFormTemplate,
  formIncludeUnits,
  setFormIncludeUnits,
  formHashtags,
  setFormHashtags,
  formIsDefault,
  setFormIsDefault,
  generatePreview,
  onSubmit,
  isSubmitting,
  submitLabel,
}: TemplateFormDialogProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Fire Incidents Template"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          {/* Call Types */}
          <div className="space-y-2">
            <Label>Incident Types</Label>
            <p className="text-xs text-muted-foreground">
              Leave empty or select &quot;All&quot; to use for any incident type
            </p>
            <div className="flex flex-wrap gap-2">
              {CALL_TYPE_CATEGORIES.map((type) => (
                <Badge
                  key={type.id}
                  variant={formCallTypes.includes(type.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFormCallType(type.id)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Template Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="template-content">Template Content</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
            </div>
            {showPreview ? (
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap font-mono text-sm min-h-[200px]">
                {generatePreview(formTemplate)}
              </div>
            ) : (
              <Textarea
                id="template-content"
                placeholder="Enter your template with placeholders..."
                value={formTemplate}
                onChange={(e) => setFormTemplate(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-units"
                checked={formIncludeUnits}
                onCheckedChange={setFormIncludeUnits}
              />
              <Label htmlFor="include-units">Include Units</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-default"
                checked={formIsDefault}
                onCheckedChange={setFormIsDefault}
              />
              <Label htmlFor="is-default">Set as Default</Label>
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              placeholder="#EmergencyAlert #FirstResponders"
              value={formHashtags}
              onChange={(e) => setFormHashtags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate hashtags with spaces or commas
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !formName.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Default template for new templates
const DEFAULT_TEMPLATE = `{{status}}

📋 Type: {{callType}}

📍 {{address}}

🚒 Units:
{{units}}

⏰ {{time}}

{{updates}}

{{hashtags}}`;
