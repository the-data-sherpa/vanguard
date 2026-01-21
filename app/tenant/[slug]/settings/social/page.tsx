"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import {
  Facebook,
  Settings,
  Link2,
  Unlink,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AuthGuard } from "@/components/auth/AuthGuard";
import Link from "next/link";

interface SocialSettingsPageProps {
  params: Promise<{ slug: string }>;
}

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

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const facebookStatus = useQuery(
    api.missionControl.getFacebookStatus,
    tenant ? { tenantId: tenant._id } : "skip"
  );

  const disconnectFacebook = useMutation(api.facebook.disconnect);

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
    const state = tenant._id; // Use tenant ID as state for security
    const scope = "pages_show_list,pages_read_engagement,pages_manage_posts";

    const authUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
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
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Facebook className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{facebookStatus.pageName}</p>
                    <p className="text-sm text-muted-foreground">
                      Connected {facebookStatus.connectedAt && formatDistanceToNow(facebookStatus.connectedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Connected
                </Badge>
              </div>

              {/* Token expiration warning */}
              {facebookStatus.isExpired && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Token Expired</p>
                    <p className="text-sm">
                      Your Facebook connection has expired. Please reconnect to continue posting.
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleConnectFacebook}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
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
      <Card>
        <CardHeader>
          <CardTitle>Auto-Post Settings</CardTitle>
          <CardDescription>
            Configure which incidents are automatically posted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Auto-Post Rules</p>
              <p className="text-sm text-muted-foreground">
                Set up rules for automatic posting based on incident type
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Post Templates Card */}
      <Card>
        <CardHeader>
          <CardTitle>Post Templates</CardTitle>
          <CardDescription>
            Customize how incidents appear when posted to social media
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Custom Templates</p>
              <p className="text-sm text-muted-foreground">
                Create custom post formats for different incident types
              </p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

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
