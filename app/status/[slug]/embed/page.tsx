"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, CheckCircle, AlertTriangle, XCircle, Flame } from "lucide-react";
import Image from "next/image";

type StatusLevel = "operational" | "degraded" | "major";

function getStatusLevel(incidentCount: number, alertCount: number): StatusLevel {
  if (incidentCount >= 5) return "major";
  if (incidentCount > 0 || alertCount > 0) return "degraded";
  return "operational";
}

const statusConfig = {
  operational: {
    icon: CheckCircle,
    label: "All Systems Operational",
    bgColor: "bg-green-50 dark:bg-green-950",
    textColor: "text-green-700 dark:text-green-400",
    iconColor: "text-green-500",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Active Incidents",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  major: {
    icon: XCircle,
    label: "Multiple Active Incidents",
    bgColor: "bg-red-50 dark:bg-red-950",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

export default function EmbedStatusPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenantInfo = useQuery(api.status.getPublicTenantInfo, { slug });
  const stats = useQuery(api.status.getPublicStats, { slug });

  // Loading state
  if (tenantInfo === undefined || stats === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[100px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found or feature disabled
  if (tenantInfo === null || stats === null) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Status page not available
      </div>
    );
  }

  const status = getStatusLevel(stats.activeIncidentCount, stats.activeAlertCount);
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg ${config.bgColor}`}>
      <div className="flex items-center gap-3">
        {/* Logo or Icon */}
        {tenantInfo.logoUrl ? (
          <Image
            src={tenantInfo.logoUrl}
            alt={tenantInfo.name}
            width={32}
            height={32}
            className="rounded"
          />
        ) : (
          <div
            className="h-8 w-8 rounded flex items-center justify-center"
            style={{ backgroundColor: tenantInfo.primaryColor || "#f97316" }}
          >
            <Flame className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            <span className={`font-medium ${config.textColor}`}>
              {config.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {tenantInfo.name}
          </p>
        </div>

        {/* Stats */}
        <div className="text-right">
          <div className="text-lg font-bold">{stats.activeIncidentCount}</div>
          <div className="text-xs text-muted-foreground">
            {stats.activeIncidentCount === 1 ? "incident" : "incidents"}
          </div>
        </div>
      </div>

      {/* Link to full page */}
      <div className="mt-3 pt-3 border-t text-center">
        <a
          href={`/status/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline"
        >
          View Full Status Page
        </a>
      </div>
    </div>
  );
}
