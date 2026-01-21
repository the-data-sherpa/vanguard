"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OperationalStatusProps {
  activeIncidentCount: number;
  activeAlertCount: number;
}

type StatusLevel = "operational" | "degraded" | "major";

function getStatusLevel(incidentCount: number, alertCount: number): StatusLevel {
  // Major: 5+ active incidents OR any severe weather alert
  if (incidentCount >= 5) return "major";
  // Degraded: 1-4 active incidents OR any weather alert
  if (incidentCount > 0 || alertCount > 0) return "degraded";
  // Operational: No active incidents or alerts
  return "operational";
}

const statusConfig = {
  operational: {
    icon: CheckCircle,
    label: "All Systems Operational",
    description: "No active incidents at this time",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-400",
    iconColor: "text-green-500",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Active Incidents",
    description: "Emergency services are responding",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  major: {
    icon: XCircle,
    label: "Multiple Active Incidents",
    description: "High activity - emergency services are responding",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

export function OperationalStatus({ activeIncidentCount, activeAlertCount }: OperationalStatusProps) {
  const status = getStatusLevel(activeIncidentCount, activeAlertCount);
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <Icon className={`h-12 w-12 ${config.iconColor}`} />
          <div>
            <h2 className={`text-2xl font-bold ${config.textColor}`}>
              {config.label}
            </h2>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
