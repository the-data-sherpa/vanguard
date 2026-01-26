"use client";

import { useState, useEffect } from "react";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DashboardVisibility {
  incidentTrends: boolean;
  callTypes: boolean;
  busyTimes: boolean;
  unitActivity: boolean;
  responseTimes: boolean;
  weatherCorrelation: boolean;
}

const defaultVisibility: DashboardVisibility = {
  incidentTrends: true,
  callTypes: true,
  busyTimes: true,
  unitActivity: true,
  responseTimes: true,
  weatherCorrelation: true,
};

const chartLabels: Record<keyof DashboardVisibility, string> = {
  incidentTrends: "Incident Trends",
  callTypes: "Call Types",
  busyTimes: "Busy Times Heatmap",
  unitActivity: "Unit Activity",
  responseTimes: "Response Times",
  weatherCorrelation: "Weather Impact",
};

interface DashboardCustomizerProps {
  value: DashboardVisibility;
  onChange: (visibility: DashboardVisibility) => void;
}

export function DashboardCustomizer({ value, onChange }: DashboardCustomizerProps) {
  const visibleCount = Object.values(value).filter(Boolean).length;
  const totalCount = Object.keys(value).length;

  const handleToggle = (key: keyof DashboardVisibility) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  const handleShowAll = () => {
    onChange(defaultVisibility);
  };

  const handleHideAll = () => {
    onChange({
      incidentTrends: false,
      callTypes: false,
      busyTimes: false,
      unitActivity: false,
      responseTimes: false,
      weatherCorrelation: false,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Settings2 className="h-4 w-4 mr-2" />
          Customize
          <span className="ml-2 text-xs text-muted-foreground">
            {visibleCount}/{totalCount}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Visible Charts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {(Object.keys(chartLabels) as Array<keyof DashboardVisibility>).map((key) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={value[key]}
            onCheckedChange={() => handleToggle(key)}
          >
            {chartLabels[key]}
          </DropdownMenuCheckboxItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="flex gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleShowAll}
          >
            <Eye className="h-3 w-3 mr-1" />
            Show All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleHideAll}
          >
            <EyeOff className="h-3 w-3 mr-1" />
            Hide All
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook to persist visibility preferences
export function useDashboardVisibility(tenantSlug: string): [DashboardVisibility, (v: DashboardVisibility) => void] {
  const storageKey = `vanguard-dashboard-visibility-${tenantSlug}`;
  
  const [visibility, setVisibility] = useState<DashboardVisibility>(defaultVisibility);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVisibility({ ...defaultVisibility, ...parsed });
      }
    } catch (e) {
      console.error("Failed to load dashboard preferences:", e);
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to localStorage when changed
  const updateVisibility = (newVisibility: DashboardVisibility) => {
    setVisibility(newVisibility);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newVisibility));
    } catch (e) {
      console.error("Failed to save dashboard preferences:", e);
    }
  };

  return [visibility, updateVisibility];
}

export function getDefaultVisibility(): DashboardVisibility {
  return defaultVisibility;
}
