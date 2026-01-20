"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { adaptIncident } from "@/lib/convex-adapters";
import { IncidentDetail, IncidentDetailSkeleton } from "@/components/incidents/IncidentDetail";
import { IncidentNotes } from "@/components/incidents/IncidentNotes";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const incidentId = params.id as string;

  // Get tenant
  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  // Get incident - REACTIVE, auto-updates
  const incidentRaw = useQuery(
    api.incidents.getById,
    tenantId ? { tenantId, id: incidentId as Id<"incidents"> } : "skip"
  );

  // Loading state
  if (!tenant || incidentRaw === undefined) {
    return (
      <div className="space-y-6">
        <IncidentDetailSkeleton />
      </div>
    );
  }

  // Not found
  if (incidentRaw === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Incident Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The incident you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button onClick={() => router.push(`/tenant/${slug}/incidents`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Incidents
        </Button>
      </div>
    );
  }

  const incident = adaptIncident(incidentRaw);

  return (
    <IncidentDetail
      incident={incident}
      unitLegend={tenant.unitLegend ?? undefined}
      onBack={() => router.push(`/tenant/${slug}/incidents`)}
    >
      {/* Notes Section */}
      <IncidentNotes
        tenantId={tenantId!}
        incidentId={incidentId as Id<"incidents">}
      />
    </IncidentDetail>
  );
}
