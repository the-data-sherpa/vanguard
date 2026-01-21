"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  AlertTriangle,
  Car,
  HardHat,
} from "lucide-react";

interface UnitStatusItem {
  unitId: string;
  status: string;
  timeDispatched?: number;
  timeEnroute?: number;
  timeOnScene?: number;
}

// unitStatuses can be an array or a record depending on schema
type UnitStatuses =
  | UnitStatusItem[]
  | Record<string, { status: string; unit: string; timestamp: number }>;

interface PublicIncident {
  _id: string;
  callType: string;
  callTypeCategory: string;
  fullAddress: string;
  callReceivedTime: number;
  status: string;
  units: string[];
  unitStatuses: UnitStatuses;
  description?: string;
}

// Helper to normalize unitStatuses to array format
function normalizeUnitStatuses(unitStatuses: UnitStatuses): UnitStatusItem[] {
  if (!unitStatuses) return [];

  if (Array.isArray(unitStatuses)) {
    return unitStatuses;
  }

  // Convert record format to array format
  return Object.entries(unitStatuses).map(([unitId, data]) => ({
    unitId: data.unit || unitId,
    status: data.status,
  }));
}

interface PublicIncidentCardProps {
  incident: PublicIncident;
}

// Call type descriptions mapping
const CALL_TYPE_DESCRIPTIONS: Record<string, string> = {
  // Fire
  SF: "Structure Fire",
  WSF: "Confirmed Structure Fire",
  VF: "Vehicle Fire",
  GF: "Grass Fire",
  WF: "Wildland Fire",
  WVEG: "Confirmed Vegetation Fire",
  CF: "Commercial Fire",
  RF: "Residential Fire",
  AF: "Appliance Fire",
  TF: "Trash Fire",
  FA: "Fire Alarm",
  // Medical
  ME: "Medical Emergency",
  LA: "Lift Assist",
  CP: "Chest Pain",
  CVA: "Stroke",
  DIFF: "Difficulty Breathing",
  FALL: "Fall",
  SEIZ: "Seizure",
  UNC: "Unconscious",
  // Traffic
  TC: "Traffic Collision",
  MVC: "Motor Vehicle Collision",
  TCA: "Traffic Collision w/ Injuries",
  TCNO: "Traffic Collision No Injuries",
  // Rescue
  RES: "Rescue",
  WR: "Water Rescue",
  TR: "Technical Rescue",
  ELV: "Elevator Rescue",
  // Hazmat
  HM: "Hazmat",
  GAS: "Gas Leak",
  CMA: "Carbon Monoxide Alarm",
  // Other
  PS: "Public Service",
  PA: "Police Assist",
  OA: "Alarm",
};

function getCallTypeDescription(callType: string): string {
  return CALL_TYPE_DESCRIPTIONS[callType] || callType;
}

// Status display labels
const STATUS_LABELS: Record<string, string> = {
  Dispatched: "Dispatched",
  Enroute: "En Route",
  "On Scene": "On Scene",
  OnScene: "On Scene",
  Available: "Available",
  Cleared: "Cleared",
  DP: "Dispatched",
  EN: "En Route",
  ER: "En Route",
  OS: "On Scene",
  AV: "Available",
  CL: "Cleared",
  AR: "Arrived",
};

// Get icon for call type category
function getCategoryIcon(category: string) {
  switch (category) {
    case "fire":
      return <Flame className="h-5 w-5 text-orange-500" />;
    case "medical":
      return <Heart className="h-5 w-5 text-red-500" />;
    case "traffic":
      return <Car className="h-5 w-5 text-blue-500" />;
    case "rescue":
      return <HardHat className="h-5 w-5 text-purple-500" />;
    case "hazmat":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <MapPin className="h-5 w-5 text-gray-500" />;
  }
}

// Get border color based on category
function getCategoryBorderClass(category: string): string {
  switch (category) {
    case "fire":
      return "border-l-orange-500";
    case "medical":
      return "border-l-red-500";
    case "traffic":
      return "border-l-blue-500";
    case "rescue":
      return "border-l-purple-500";
    case "hazmat":
      return "border-l-yellow-500";
    default:
      return "border-l-gray-500";
  }
}

// Simple incident timeline component
function IncidentProgress({ unitStatuses }: { unitStatuses: UnitStatuses }) {
  const normalized = normalizeUnitStatuses(unitStatuses);
  if (normalized.length === 0) return null;

  // Determine overall incident state based on unit statuses
  const hasOnScene = normalized.some(
    (u) => u.status === "OS" || u.status === "On Scene" || u.status === "OnScene"
  );
  const hasEnroute = normalized.some(
    (u) => u.status === "EN" || u.status === "ER" || u.status === "Enroute"
  );
  const hasDispatched = normalized.some(
    (u) => u.status === "DP" || u.status === "Dispatched"
  );

  const stages = [
    { label: "Dispatched", active: hasDispatched || hasEnroute || hasOnScene },
    { label: "En Route", active: hasEnroute || hasOnScene },
    { label: "On Scene", active: hasOnScene },
  ];

  return (
    <div className="flex items-center gap-1 text-xs">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center">
          <div
            className={`px-2 py-0.5 rounded ${
              stage.active
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-gray-100 text-gray-400 dark:bg-gray-800"
            }`}
          >
            {stage.label}
          </div>
          {i < stages.length - 1 && (
            <div
              className={`w-4 h-0.5 ${
                stages[i + 1].active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function PublicIncidentCard({ incident }: PublicIncidentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const category = incident.callTypeCategory || "other";
  const callTypeDescription = getCallTypeDescription(incident.callType);
  const hasUnits = incident.units && incident.units.length > 0;
  const normalizedStatuses = normalizeUnitStatuses(incident.unitStatuses);

  const getUnitStatus = (unitId: string): string => {
    const unitStatus = normalizedStatuses.find((u) => u.unitId === unitId);
    return unitStatus?.status || "Unknown";
  };

  return (
    <Card
      className={`border-l-4 ${getCategoryBorderClass(category)}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Icon + Call Type + Time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getCategoryIcon(category)}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Badge className="bg-red-600 text-white hover:bg-red-600">
                ACTIVE
              </Badge>
              <span className="font-semibold truncate">{callTypeDescription}</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
            {formatDistanceToNow(new Date(incident.callReceivedTime), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Incident Progress */}
        <IncidentProgress unitStatuses={incident.unitStatuses} />

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground line-clamp-2">
            {incident.fullAddress}
          </p>
        </div>

        {/* Expand/Collapse for units */}
        {hasUnits && !isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setIsExpanded(true)}
          >
            Show {incident.units.length} Units <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        )}

        {/* Expanded Unit Details */}
        {hasUnits && isExpanded && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-medium">
              Units Responding ({incident.units.length})
            </p>

            <div className="space-y-1 ml-2">
              {incident.units.map((unit) => {
                const status = getUnitStatus(unit);
                const statusLabel = STATUS_LABELS[status] || status;

                return (
                  <div key={unit} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{unit}</span>
                    <Badge variant="outline" className="text-xs">
                      {statusLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setIsExpanded(false)}
            >
              Hide Units <ChevronUp className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Description if available */}
        {incident.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {incident.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
