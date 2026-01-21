"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import { Loader2, Save, User, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common timezones for easy selection
const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "UTC", label: "UTC" },
];

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Preferences state
  const [timezone, setTimezone] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesInitialized, setPreferencesInitialized] = useState(false);

  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Get all available timezones from the browser
  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      // Fallback for older browsers
      return COMMON_TIMEZONES.map((tz) => tz.value);
    }
  }, []);

  // Initialize form with user data
  if (user && !initialized) {
    setName(user.name || "");
    setUsername(user.username || "");
    setBio(user.bio || "");
    setInitialized(true);
  }

  // Initialize preferences
  if (user && !preferencesInitialized) {
    setTimezone(user.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setEmailNotifications(user.preferences?.emailNotifications ?? true);
    setPushNotifications(user.preferences?.pushNotifications ?? false);
    setPreferencesInitialized(true);
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setProfileMessage(null);
    try {
      await updateProfile({
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
      });
      setProfileMessage({ type: "success", text: "Profile saved successfully" });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save profile",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    setPreferencesMessage(null);
    try {
      await updateProfile({
        preferences: {
          timezone,
          emailNotifications,
          pushNotifications,
        },
      });
      setPreferencesMessage({ type: "success", text: "Preferences saved successfully" });
    } catch (error) {
      setPreferencesMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save preferences",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "user":
      default:
        return "outline";
    }
  };

  // Find if current timezone is in common list
  const isCommonTimezone = COMMON_TIMEZONES.some((tz) => tz.value === timezone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="flex items-center gap-4">
        {clerkUser?.imageUrl && (
          <img
            src={clerkUser.imageUrl}
            alt="Profile"
            className="h-20 w-20 rounded-full"
          />
        )}
        <div>
          <h2 className="text-xl font-semibold">{user.name || user.email}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {user.tenantRole && (
              <Badge variant={getRoleBadgeVariant(user.tenantRole)}>
                {user.tenantRole.charAt(0).toUpperCase() + user.tenantRole.slice(1)}
              </Badge>
            )}
            {user.verified && (
              <Badge variant="outline" className="text-green-600">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile information visible to other users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setProfileMessage(null);
                    }}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setProfileMessage(null);
                    }}
                    placeholder="your-username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed through Clerk and cannot be changed here
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    setProfileMessage(null);
                  }}
                  placeholder="Tell us about yourself..."
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                {profileMessage && (
                  <p
                    className={`text-sm ${
                      profileMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {profileMessage.text}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your experience and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={(value) => {
                  setTimezone(value);
                  setPreferencesMessage(null);
                }}>
                  <SelectTrigger id="timezone" className="w-full sm:w-80">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                      Common
                    </div>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                    {!isCommonTimezone && timezone && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">
                          Current
                        </div>
                        <SelectItem value={timezone}>{timezone}</SelectItem>
                      </>
                    )}
                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-t mt-1 pt-2">
                      All Timezones
                    </div>
                    {allTimezones
                      .filter((tz) => !COMMON_TIMEZONES.some((c) => c.value === tz))
                      .map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Times throughout the application will be displayed in this timezone
                </p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button onClick={handleSavePreferences} disabled={isSavingPreferences}>
                  {isSavingPreferences ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Preferences
                </Button>
                {preferencesMessage && (
                  <p
                    className={`text-sm ${
                      preferencesMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {preferencesMessage.text}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how you receive notifications about incidents and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <Label htmlFor="emailNotifications" className="font-medium cursor-pointer">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important alerts and updates
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={(checked) => {
                    setEmailNotifications(checked);
                    setPreferencesMessage(null);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <Label htmlFor="pushNotifications" className="font-medium cursor-pointer">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications for real-time alerts
                  </p>
                  <p className="text-xs text-amber-600">
                    Push notifications require browser permission
                  </p>
                </div>
                <Switch
                  id="pushNotifications"
                  checked={pushNotifications}
                  onCheckedChange={(checked) => {
                    setPushNotifications(checked);
                    setPreferencesMessage(null);
                  }}
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button onClick={handleSavePreferences} disabled={isSavingPreferences}>
                  {isSavingPreferences ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Notification Settings
                </Button>
                {preferencesMessage && (
                  <p
                    className={`text-sm ${
                      preferencesMessage.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {preferencesMessage.text}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
