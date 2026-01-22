"use client";

import { Doc } from "@/convex/_generated/dataModel";
import {
  MoreHorizontal,
  Shield,
  UserX,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserCardViewProps {
  users: Doc<"users">[];
  currentUserId: string;
  currentUserRole: string;
  onRoleChange: (user: Doc<"users">) => void;
  onRemove: (user: Doc<"users">) => void;
  onBan: (user: Doc<"users">) => void;
}

function getInitials(user: Doc<"users">) {
  if (user.name) {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email.slice(0, 2).toUpperCase();
}

function getRoleBadgeVariant(role?: string) {
  switch (role) {
    case "owner":
      return "default";
    case "user":
    default:
      return "outline";
  }
}

function canModifyUser(targetUser: Doc<"users">, currentUserId: string, currentUserRole: string) {
  if (targetUser._id === currentUserId) return false;
  return currentUserRole === "owner";
}

export function UserCardView({
  users,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
  onBan,
}: UserCardViewProps) {
  return (
    <div className="space-y-3">
      {users.map((user) => (
        <Card key={user._id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{getInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {user.name || user.email}
                    {user._id === currentUserId && (
                      <span className="text-muted-foreground ml-2">(you)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
              {canModifyUser(user, currentUserId, currentUserRole) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="touch" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRoleChange(user)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onBan(user)}>
                      {user.isBanned ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Ban User
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onRemove(user)}
                      className="text-destructive"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Remove from Tenant
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant={getRoleBadgeVariant(user.tenantRole)}>
                {user.tenantRole?.charAt(0).toUpperCase() + (user.tenantRole?.slice(1) || "")}
              </Badge>
              {user.isBanned ? (
                <Badge variant="destructive">Banned</Badge>
              ) : !user.isActive ? (
                <Badge variant="secondary">Pending</Badge>
              ) : user.verified ? (
                <Badge variant="outline" className="text-green-600">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
