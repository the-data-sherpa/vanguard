"use client";

import { Flame, Heart, Car, AlertTriangle, HardHat, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface IncidentSummaryProps {
  categoryBreakdown: Record<string, number>;
  totalCount: number;
}

const categoryConfig: Record<string, { icon: typeof Flame; label: string; color: string }> = {
  fire: {
    icon: Flame,
    label: "Fire",
    color: "text-orange-500",
  },
  medical: {
    icon: Heart,
    label: "Medical",
    color: "text-red-500",
  },
  traffic: {
    icon: Car,
    label: "Traffic",
    color: "text-blue-500",
  },
  hazmat: {
    icon: AlertTriangle,
    label: "Hazmat",
    color: "text-yellow-500",
  },
  rescue: {
    icon: HardHat,
    label: "Rescue",
    color: "text-purple-500",
  },
  other: {
    icon: HelpCircle,
    label: "Other",
    color: "text-gray-500",
  },
};

export function IncidentSummary({ categoryBreakdown, totalCount }: IncidentSummaryProps) {
  const categories = Object.entries(categoryBreakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Active Incidents</span>
          <span className="text-2xl font-bold">{totalCount}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalCount === 0 ? (
          <p className="text-muted-foreground text-sm">No active incidents</p>
        ) : (
          <div className="space-y-2">
            {categories.map(([category, count]) => {
              const config = categoryConfig[category] || categoryConfig.other;
              const Icon = config.icon;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
