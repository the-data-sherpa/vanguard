"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "pending" | "posted" | "failed" | "needs_update";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  switch (status) {
    case "posted":
      return (
        <Badge
          variant="outline"
          className={cn("text-green-600 border-green-300 bg-green-50", className)}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className={cn("text-yellow-600 border-yellow-300 bg-yellow-50", className)}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className={cn("text-red-600 border-red-300 bg-red-50", className)}
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "needs_update":
      return (
        <Badge
          variant="outline"
          className={cn("text-blue-600 border-blue-300 bg-blue-50", className)}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Needs Update
        </Badge>
      );
    default:
      return null;
  }
}
