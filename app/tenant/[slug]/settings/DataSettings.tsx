"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Loader2, FileJson, FileSpreadsheet, AlertTriangle } from "lucide-react";

interface DataSettingsProps {
  tenant: {
    _id: Id<"tenants">;
  };
}

type ExportFormat = "csv" | "json";
type DataType = "incidents" | "weatherAlerts" | "auditLogs";

interface ExportConfig {
  dataType: DataType;
  format: ExportFormat;
  startDate: string;
  endDate: string;
}

export function DataSettings({ tenant }: DataSettingsProps) {
  const [config, setConfig] = useState<ExportConfig>({
    dataType: "incidents",
    format: "csv",
    startDate: "",
    endDate: "",
  });
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch export data based on current config
  const incidentsExport = useQuery(
    api.exports.getIncidentsForExport,
    config.dataType === "incidents"
      ? {
          tenantId: tenant._id,
          startDate: config.startDate ? new Date(config.startDate).getTime() : undefined,
          endDate: config.endDate ? new Date(config.endDate).getTime() : undefined,
        }
      : "skip"
  );

  const weatherExport = useQuery(
    api.exports.getWeatherAlertsForExport,
    config.dataType === "weatherAlerts"
      ? {
          tenantId: tenant._id,
          startDate: config.startDate ? new Date(config.startDate).getTime() : undefined,
          endDate: config.endDate ? new Date(config.endDate).getTime() : undefined,
        }
      : "skip"
  );

  const auditExport = useQuery(
    api.exports.getAuditLogsForExport,
    config.dataType === "auditLogs"
      ? {
          tenantId: tenant._id,
          startDate: config.startDate ? new Date(config.startDate).getTime() : undefined,
          endDate: config.endDate ? new Date(config.endDate).getTime() : undefined,
        }
      : "skip"
  );

  const getCurrentData = () => {
    switch (config.dataType) {
      case "incidents":
        return incidentsExport;
      case "weatherAlerts":
        return weatherExport;
      case "auditLogs":
        return auditExport;
      default:
        return null;
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const data = getCurrentData();
      if (!data || data.length === 0) {
        setMessage({ type: "error", text: "No data to export" });
        return;
      }

      let content: string;
      let mimeType: string;
      let extension: string;

      if (config.format === "json") {
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        // Convert to CSV
        content = convertToCSV(data);
        mimeType = "text/csv";
        extension = "csv";
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.dataType}_export_${new Date().toISOString().split("T")[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `Exported ${data.length} records successfully` });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Export failed",
      });
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data: Record<string, unknown>[]): string => {
    if (data.length === 0) return "";

    // Get all unique keys from all objects
    const keys = Array.from(
      new Set(data.flatMap((item) => Object.keys(item)))
    );

    // Create header row
    const header = keys.join(",");

    // Create data rows
    const rows = data.map((item) =>
      keys
        .map((key) => {
          const value = item[key];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(",")
    );

    return [header, ...rows].join("\n");
  };

  const data = getCurrentData();
  const recordCount = data ? data.length : 0;
  const isLoading = data === undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>
            Export your data in CSV or JSON format for backup or analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type</Label>
            <Select
              value={config.dataType}
              onValueChange={(value: DataType) => {
                setConfig((prev) => ({ ...prev, dataType: value }));
                setMessage(null);
              }}
            >
              <SelectTrigger id="dataType" className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incidents">Incidents</SelectItem>
                <SelectItem value="weatherAlerts">Weather Alerts</SelectItem>
                <SelectItem value="auditLogs">Audit Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date (Optional)</Label>
              <Input
                id="startDate"
                type="date"
                value={config.startDate}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, startDate: e.target.value }));
                  setMessage(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={config.endDate}
                onChange={(e) => {
                  setConfig((prev) => ({ ...prev, endDate: e.target.value }));
                  setMessage(null);
                }}
              />
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={config.format === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setConfig((prev) => ({ ...prev, format: "csv" }))}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                type="button"
                variant={config.format === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setConfig((prev) => ({ ...prev, format: "json" }))}
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          {/* Record Count Preview */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading data...</span>
                </>
              ) : recordCount === 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">
                    No records found for the selected criteria
                  </span>
                </>
              ) : (
                <span className="text-sm">
                  <strong>{recordCount}</strong> records ready to export
                </span>
              )}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={exporting || isLoading || recordCount === 0}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting ? "Exporting..." : "Export Data"}
            </Button>
            {message && (
              <p
                className={`text-sm ${
                  message.type === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Retention Info */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
          <CardDescription>Information about data storage and retention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Incident Data</span>
              <span>Retained for 30 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weather Alerts</span>
              <span>Retained for 30 days after expiration</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audit Logs</span>
              <span>Retained for 1 year</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
