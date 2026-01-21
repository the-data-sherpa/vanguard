"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DateRange {
  label: string;
  startTime: number;
  endTime: number;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 60 days", days: 60 },
  { label: "Last 90 days", days: 90 },
];

function createDateRange(days: number, label: string): DateRange {
  const now = Date.now();
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return {
    label,
    startTime: startDate.getTime(),
    endTime: endDate.getTime(),
  };
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start">
          <Calendar className="mr-2 h-4 w-4" />
          {value.label}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.days}
            onClick={() => onChange(createDateRange(preset.days, preset.label))}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getDefaultDateRange(): DateRange {
  return createDateRange(30, "Last 30 days");
}
