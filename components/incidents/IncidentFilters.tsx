'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, X, Filter, Calendar, Truck } from 'lucide-react';
import type { IncidentStatus, CallTypeCategory } from '@/lib/types';
import { getCategoryLabel, getCategoryBadgeClasses } from '@/lib/callTypeMapping';

interface IncidentFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  search: string;
  status: IncidentStatus[];
  categories: CallTypeCategory[];
  startDate?: string;
  endDate?: string;
  unitSearch?: string;
}

const ALL_STATUSES: IncidentStatus[] = ['active', 'closed', 'archived'];
const ALL_CATEGORIES: CallTypeCategory[] = ['fire', 'medical', 'rescue', 'traffic', 'hazmat', 'other'];

export function IncidentFilters({ onFilterChange, initialFilters }: IncidentFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(
    initialFilters ?? {
      search: '',
      status: ['active'],
      categories: [],
      startDate: undefined,
      endDate: undefined,
      unitSearch: '',
    }
  );

  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleStatus = (status: IncidentStatus) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  };

  const toggleCategory = (category: CallTypeCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const clearFilters = () => {
    const cleared: FilterState = {
      search: '',
      status: ['active'],
      categories: [],
      startDate: undefined,
      endDate: undefined,
      unitSearch: '',
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.status.length !== 1 || filters.status[0] !== 'active' ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.startDate || filters.endDate ? 1 : 0) +
    (filters.unitSearch ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full rounded-md border bg-background px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {filters.search && (
            <button
              onClick={() => updateFilters({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          {/* Date Range */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Date Range</Label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => updateFilters({ startDate: e.target.value || undefined })}
                className="w-auto"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => updateFilters({ endDate: e.target.value || undefined })}
                className="w-auto"
              />
              {(filters.startDate || filters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateFilters({ startDate: undefined, endDate: undefined })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Unit Search */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Unit Search</Label>
            </div>
            <div className="relative max-w-xs">
              <Input
                type="text"
                placeholder="Search by unit (e.g., E1, M3)"
                value={filters.unitSearch || ''}
                onChange={(e) => updateFilters({ unitSearch: e.target.value })}
              />
              {filters.unitSearch && (
                <button
                  onClick={() => updateFilters({ unitSearch: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="mb-2 text-sm font-medium">Status</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => (
                <Badge
                  key={status}
                  variant={filters.status.includes(status) ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleStatus(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="mb-2 text-sm font-medium">Category</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((category) => {
                const isSelected = filters.categories.includes(category);
                const badgeClasses = isSelected
                  ? getCategoryBadgeClasses(category)
                  : 'bg-transparent';

                return (
                  <Badge
                    key={category}
                    variant={isSelected ? 'secondary' : 'outline'}
                    className={`cursor-pointer ${badgeClasses}`}
                    onClick={() => toggleCategory(category)}
                  >
                    {getCategoryLabel(category)}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
