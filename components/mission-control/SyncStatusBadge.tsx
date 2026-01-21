"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "pending" | "posted" | "failed" | "needs_update" | "pending_update" | "pending_close";

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
          className={cn("text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950", className)}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="outline"
          className={cn("text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950", className)}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className={cn("text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950", className)}
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "needs_update":
    case "pending_update":
      return (
        <Badge
          variant="outline"
          className={cn("text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950", className)}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Pending Update
        </Badge>
      );
    case "pending_close":
      return (
        <Badge
          variant="outline"
          className={cn("text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950", className)}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Pending Close
        </Badge>
      );
    default:
      return null;
  }
}
