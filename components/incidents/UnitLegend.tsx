'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, RefreshCw, X, Search } from 'lucide-react';
import type { UnitLegend as UnitLegendType } from '@/lib/types';

interface UnitLegendProps {
  legend: UnitLegendType;
  updatedAt?: string | null;
  tenantSlug: string;
  onRefresh?: () => Promise<void>;
}

export function UnitLegend({ legend, updatedAt, tenantSlug, onRefresh }: UnitLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredLegend = searchQuery
    ? legend.filter(
        (unit) =>
          unit.UnitKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
          unit.Description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : legend;

  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <BookOpen className="h-4 w-4" />
        Unit Legend ({legend.length})
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Unit Legend
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh legend from PulsePoint"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {formattedDate && (
          <p className="text-xs text-muted-foreground">Last updated: {formattedDate}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search units..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Unit list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {filteredLegend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'No units match your search' : 'No units in legend'}
              </p>
            ) : (
              filteredLegend.map((unit) => (
                <div
                  key={unit.UnitKey}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {unit.UnitKey}
                  </Badge>
                  <span className="text-sm text-right">{unit.Description}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-center">
          {filteredLegend.length} of {legend.length} units
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to get unit description from legend
 */
export function useUnitDescription(
  legend: UnitLegendType | undefined,
  unitKey: string
): string | null {
  if (!legend || legend.length === 0) return null;
  const entry = legend.find((u) => u.UnitKey === unitKey);
  return entry?.Description || null;
}

/**
 * Get unit description from legend (non-hook version)
 */
export function getUnitDescription(
  legend: UnitLegendType | undefined,
  unitKey: string
): string | null {
  if (!legend || legend.length === 0) return null;
  const entry = legend.find((u) => u.UnitKey === unitKey);
  return entry?.Description || null;
}
