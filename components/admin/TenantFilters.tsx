"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TenantStatus = "all" | "active" | "suspended" | "pending_deletion";
export type TenantTier = "all" | "free" | "starter" | "professional" | "enterprise";

interface TenantFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TenantStatus;
  onStatusChange: (value: TenantStatus) => void;
  tier: TenantTier;
  onTierChange: (value: TenantTier) => void;
}

export function TenantFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  tier,
  onTierChange,
}: TenantFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={status} onValueChange={(v) => onStatusChange(v as TenantStatus)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="pending_deletion">Pending Deletion</SelectItem>
        </SelectContent>
      </Select>

      {/* Tier Filter */}
      <Select value={tier} onValueChange={(v) => onTierChange(v as TenantTier)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="starter">Starter</SelectItem>
          <SelectItem value="professional">Professional</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
