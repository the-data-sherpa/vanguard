"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Clock } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ErrorLogEntry {
  _id: Id<"auditLogs">;
  _creationTime: number;
  tenantId?: Id<"tenants">;
  tenantName: string | null | undefined;
  tenantSlug: string | null | undefined;
  action: string;
  details: any;
  result?: "success" | "failure";
}

interface ErrorLogTableProps {
  errors: ErrorLogEntry[];
}

function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatAction(action: string) {
  // Make action names more readable
  return action
    .replace(/_/g, " ")
    .replace(/\./g, " > ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getErrorDetails(details: any): string {
  if (!details) return "No details available";

  if (typeof details === "string") return details;

  if (details.error) return details.error;
  if (details.message) return details.message;
  if (details.reason) return details.reason;

  return JSON.stringify(details, null, 2);
}

export function ErrorLogTable({ errors }: ErrorLogTableProps) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent errors</p>
        <p className="text-sm">All systems operating normally</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Time</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => (
            <TableRow key={error._id}>
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm">
                        {formatTimeAgo(error._creationTime)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatTimestamp(error._creationTime)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                {error.tenantName ? (
                  <div>
                    <div className="font-medium text-sm">{error.tenantName}</div>
                    <div className="text-xs text-muted-foreground">
                      /{error.tenantSlug}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">System</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatAction(error.action)}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[300px]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-left">
                      <span className="text-sm text-muted-foreground truncate block max-w-[280px]">
                        {getErrorDetails(error.details)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[400px]">
                      <pre className="text-xs whitespace-pre-wrap">
                        {getErrorDetails(error.details)}
                      </pre>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
