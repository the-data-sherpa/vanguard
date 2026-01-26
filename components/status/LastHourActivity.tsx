"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Flame, Heart, Car, AlertTriangle } from "lucide-react";

interface RecentIncident {
  _id: string;
  callType: string;
  callTypeCategory: string;
  timestamp: number;
  address?: string;
}

interface LastHourActivityProps {
  incidents: RecentIncident[];
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "fire":
      return <Flame className="h-3 w-3 text-orange-500" />;
    case "medical":
      return <Heart className="h-3 w-3 text-red-500" />;
    case "traffic":
      return <Car className="h-3 w-3 text-blue-500" />;
    default:
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case "fire":
      return "bg-orange-500";
    case "medical":
      return "bg-red-500";
    case "traffic":
      return "bg-blue-500";
    default:
      return "bg-amber-500";
  }
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hr ago";
  return `${hours} hrs ago`;
}

export function LastHourActivity({ incidents }: LastHourActivityProps) {
  // Filter to last hour only
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentIncidents = incidents
    .filter(i => i.timestamp > oneHourAgo)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8); // Show max 8

  // Generate timeline slots for the last hour (12 x 5-min blocks)
  const slots: { start: number; end: number; incidents: RecentIncident[] }[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const end = now - i * 5 * 60 * 1000;
    const start = end - 5 * 60 * 1000;
    slots.push({
      start,
      end,
      incidents: incidents.filter(inc => inc.timestamp >= start && inc.timestamp < end),
    });
  }
  slots.reverse(); // Oldest first

  const totalLastHour = recentIncidents.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Last Hour Activity</span>
          </CardTitle>
          <Badge variant={totalLastHour > 0 ? "default" : "secondary"}>
            {totalLastHour} incident{totalLastHour !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline visualization */}
          <div className="space-y-2">
            <div className="flex items-center gap-0.5">
              {slots.map((slot, idx) => {
                const hasActivity = slot.incidents.length > 0;
                const intensity = Math.min(slot.incidents.length / 3, 1);
                return (
                  <div
                    key={idx}
                    className="flex-1 h-8 rounded-sm relative group cursor-default"
                    style={{
                      backgroundColor: hasActivity
                        ? `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`
                        : "rgba(148, 163, 184, 0.1)",
                    }}
                    title={`${60 - idx * 5}-${55 - idx * 5} min ago: ${slot.incidents.length} incident${slot.incidents.length !== 1 ? "s" : ""}`}
                  >
                    {hasActivity && (
                      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 pb-1">
                        {slot.incidents.slice(0, 3).map((inc, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${getCategoryColor(inc.callTypeCategory)}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>60 min ago</span>
              <span>Now</span>
            </div>
          </div>

          {/* Recent incidents list */}
          {recentIncidents.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentIncidents.map((incident) => (
                <div
                  key={incident._id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="flex-shrink-0">
                    {getCategoryIcon(incident.callTypeCategory)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{incident.callType}</div>
                    {incident.address && (
                      <div className="text-xs text-muted-foreground truncate">
                        {incident.address}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {getTimeAgo(incident.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No incidents in the last hour
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
