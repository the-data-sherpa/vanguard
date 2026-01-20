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
export type SubscriptionFilter = "all" | "trialing" | "active" | "past_due" | "canceled" | "expired";

interface TenantFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: TenantStatus;
  onStatusChange: (value: TenantStatus) => void;
  subscription: SubscriptionFilter;
  onSubscriptionChange: (value: SubscriptionFilter) => void;
}

export function TenantFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  subscription,
  onSubscriptionChange,
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

      {/* Subscription Filter */}
      <Select value={subscription} onValueChange={(v) => onSubscriptionChange(v as SubscriptionFilter)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Subscription" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subscriptions</SelectItem>
          <SelectItem value="active">Subscribed</SelectItem>
          <SelectItem value="trialing">Trial</SelectItem>
          <SelectItem value="past_due">Past Due</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="canceled">Canceled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
