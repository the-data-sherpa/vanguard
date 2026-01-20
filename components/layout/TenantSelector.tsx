"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TenantSelectorProps {
  currentTenantSlug: string;
  currentTenantName: string;
}

export function TenantSelector({ currentTenantSlug, currentTenantName }: TenantSelectorProps) {
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const userTenant = useQuery(api.users.getCurrentUserTenant);

  // For now, users can only have one tenant
  // Future: This would list all tenants the user has access to
  const tenants = userTenant?.tenant ? [userTenant.tenant] : [];

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      owner: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      moderator: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      member: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return roleColors[role] || roleColors.member;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="max-w-[150px] truncate font-semibold">
            {currentTenantName}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Your Organizations
          </p>
        </div>
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant._id}
            onClick={() => router.push(`/tenant/${tenant.slug}`)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {tenant.displayName || tenant.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentUser?.tenantRole && (
                <Badge
                  variant="secondary"
                  className={cn("text-xs capitalize", getRoleBadge(currentUser.tenantRole))}
                >
                  {currentUser.tenantRole}
                </Badge>
              )}
              {tenant.slug === currentTenantSlug && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/onboarding")}
          className="text-muted-foreground"
          disabled
        >
          <Plus className="h-4 w-4 mr-2" />
          Create new organization
          <Badge variant="outline" className="ml-auto text-xs">
            Soon
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
