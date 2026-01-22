"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";

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

interface ErrorLogCardViewProps {
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
  });
}

function formatAction(action: string) {
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

export function ErrorLogCardView({ errors }: ErrorLogCardViewProps) {
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
    <div className="space-y-3">
      {errors.map((error) => (
        <Card key={error._id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Badge variant="outline" className="font-mono text-xs mb-2">
                  {formatAction(error.action)}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  {error.tenantName ? (
                    <span>
                      {error.tenantName}{" "}
                      <span className="text-xs">/{error.tenantSlug}</span>
                    </span>
                  ) : (
                    <span>System</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                <span className="text-xs" title={formatTimestamp(error._creationTime)}>
                  {formatTimeAgo(error._creationTime)}
                </span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2 break-words">
              {getErrorDetails(error.details)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
