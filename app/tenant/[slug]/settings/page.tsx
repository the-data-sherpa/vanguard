"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Plug, ToggleLeft, Database } from "lucide-react";
import { GeneralSettings } from "./GeneralSettings";
import { IntegrationSettings } from "./IntegrationSettings";
import { FeatureSettings } from "./FeatureSettings";
import { DataSettings } from "./DataSettings";

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenant = useQuery(api.tenants.getBySlug, { slug });

  if (!tenant) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage tenant configuration, integrations, and features
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings tenant={tenant} />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationSettings tenant={tenant} />
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <FeatureSettings tenant={tenant} />
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <DataSettings tenant={tenant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-96" />
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
