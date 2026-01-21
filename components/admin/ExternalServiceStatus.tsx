"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Radio,
  CloudRain,
  CreditCard,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveCheckResult {
  status: "ok" | "error";
  latencyMs: number;
  statusCode?: number;
  error?: string;
  endpoint: string;
}

interface ActiveHealthData {
  checkedAt: number;
  pulsepoint: ActiveCheckResult;
  nws: ActiveCheckResult;
  stripe: ActiveCheckResult;
}

const CACHE_KEY = "vanguard_external_services_health";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCachedData(): ActiveHealthData | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as ActiveHealthData;
    const age = Date.now() - data.checkedAt;

    // Return cached data if less than TTL old
    if (age < CACHE_TTL_MS) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedData(data: ActiveHealthData) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function formatTimeAgo(timestamp: number | null) {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

function StatusIcon({ status }: { status: "ok" | "error" | "unknown" }) {
  switch (status) {
    case "ok":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "unknown":
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function ActiveServiceBadge({ result }: { result: ActiveCheckResult }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant={result.status === "ok" ? "outline" : "destructive"}
            className={cn("gap-1", result.status === "ok" && "text-green-600")}
          >
            <StatusIcon status={result.status} />
            {result.latencyMs}ms
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Status: {result.statusCode || "N/A"}</div>
            <div>Latency: {result.latencyMs}ms</div>
            {result.error && <div className="text-red-400">Error: {result.error}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const services = [
  { key: "pulsepoint", name: "PulsePoint", icon: Radio },
  { key: "nws", name: "NWS Weather", icon: CloudRain },
  { key: "stripe", name: "Stripe", icon: CreditCard },
] as const;

export function ExternalServiceStatus() {
  const [isChecking, setIsChecking] = useState(false);
  const [healthData, setHealthData] = useState<ActiveHealthData | null>(null);
  const [initialized, setInitialized] = useState(false);
  const checkHealth = useAction(api.adminHealth.checkExternalServicesHealth);

  // Load cached data on mount and auto-check if stale
  useEffect(() => {
    const cached = loadCachedData();
    if (cached) {
      setHealthData(cached);
      setInitialized(true);
    } else {
      // No valid cache, run health check
      handleCheckHealth();
    }
  }, []);

  const handleCheckHealth = async () => {
    setIsChecking(true);
    setInitialized(true);
    try {
      const result = await checkHealth();
      setHealthData(result);
      saveCachedData(result);
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const allOk = healthData
    ? services.every((s) => healthData[s.key].status === "ok")
    : null;
  const hasErrors = healthData
    ? services.some((s) => healthData[s.key].status === "error")
    : false;

  // Show loading state before initialization
  if (!initialized) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            External Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Checking services...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            External Services
          </div>
          {healthData ? (
            allOk ? (
              <Badge variant="outline" className="text-green-600 gap-1">
                <CheckCircle className="h-3 w-3" />
                All OK
              </Badge>
            ) : hasErrors ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Issues
              </Badge>
            ) : null
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!healthData && !isChecking ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Failed to check services
            </p>
            <Button
              onClick={handleCheckHealth}
              disabled={isChecking}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : isChecking && !healthData ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Checking services...
          </div>
        ) : healthData ? (
          <>
            <div className="space-y-2">
              {services.map((service) => {
                const Icon = service.icon;
                const result = healthData[service.key];

                return (
                  <div
                    key={service.key}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md border",
                      result.status === "error" && "border-red-200 bg-red-50 dark:bg-red-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    <ActiveServiceBadge result={result} />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Checked {formatTimeAgo(healthData.checkedAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCheckHealth}
                disabled={isChecking}
                className="h-7 px-2"
              >
                <RefreshCw
                  className={cn("h-3 w-3 mr-1", isChecking && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
