"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Users } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { UserTable } from "@/components/users/UserTable";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";

interface UsersPageProps {
  params: Promise<{ slug: string }>;
}

export default function UsersPage({ params }: UsersPageProps) {
  return (
    <AuthGuard requiredRole="owner">
      <UsersPageContent params={params} />
    </AuthGuard>
  );
}

function UsersPageContent({ params }: UsersPageProps) {
  const resolvedParams = use(params);
  const tenant = useQuery(api.tenants.getBySlug, { slug: resolvedParams.slug });
  const currentUser = useQuery(api.users.getCurrentUser);
  const users = useQuery(
    api.users.listTenantUsers,
    tenant ? { tenantId: tenant._id } : "skip"
  );

  if (tenant === undefined || currentUser === undefined || users === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Tenant not found</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  // Platform admins do NOT have automatic tenant access - use tenant role only
  const currentUserRole = currentUser.tenantRole || "user";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Users
          </h1>
          <p className="text-muted-foreground">
            Manage users in your organization
          </p>
        </div>
        <InviteUserDialog tenantId={tenant._id} />
      </div>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "user" : "users"} in this organization
        </div>
        <UserTable
          users={users}
          tenantId={tenant._id}
          currentUserId={currentUser._id}
          currentUserRole={currentUserRole}
        />
      </div>
    </div>
  );
}

// React 19 use() hook
import { use } from "react";
