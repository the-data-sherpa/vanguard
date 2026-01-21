"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import {
  MoreHorizontal,
  Shield,
  UserX,
  Ban,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleSelector } from "./RoleSelector";

interface UserTableProps {
  users: Doc<"users">[];
  tenantId: Id<"tenants">;
  currentUserId: Id<"users">;
  currentUserRole: string;
}

export function UserTable({
  users,
  tenantId,
  currentUserId,
  currentUserRole,
}: UserTableProps) {
  const [roleChangeUser, setRoleChangeUser] = useState<Doc<"users"> | null>(null);
  const [removeUser, setRemoveUser] = useState<Doc<"users"> | null>(null);
  const [banUser, setBanUser] = useState<Doc<"users"> | null>(null);
  const [selectedRole, setSelectedRole] = useState<"owner" | "user">("user");
  const [isLoading, setIsLoading] = useState(false);

  const updateUserRole = useMutation(api.users.updateUserRole);
  const removeUserFromTenant = useMutation(api.users.removeUserFromTenant);
  const toggleUserBan = useMutation(api.users.toggleUserBan);

  const canModifyUser = (targetUser: Doc<"users">) => {
    // Cannot modify yourself
    if (targetUser._id === currentUserId) return false;
    // Only owners can modify users
    return currentUserRole === "owner";
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser) return;
    setIsLoading(true);
    try {
      await updateUserRole({
        tenantId,
        userId: roleChangeUser._id,
        role: selectedRole,
      });
      setRoleChangeUser(null);
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async () => {
    if (!removeUser) return;
    setIsLoading(true);
    try {
      await removeUserFromTenant({
        tenantId,
        userId: removeUser._id,
      });
      setRemoveUser(null);
    } catch (error) {
      console.error("Failed to remove user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBan = async () => {
    if (!banUser) return;
    setIsLoading(true);
    try {
      await toggleUserBan({
        tenantId,
        userId: banUser._id,
        banned: !banUser.isBanned,
      });
      setBanUser(null);
    } catch (error) {
      console.error("Failed to toggle ban:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "user":
      default:
        return "outline";
    }
  };

  const getInitials = (user: Doc<"users">) => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{getInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.name || user.email}
                        {user._id === currentUserId && (
                          <span className="text-muted-foreground ml-2">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.tenantRole)}>
                    {user.tenantRole?.charAt(0).toUpperCase() + (user.tenantRole?.slice(1) || "")}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  {canModifyUser(user) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRoleChangeUser(user);
                            setSelectedRole((user.tenantRole as "owner" | "user") || "user");
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setBanUser(user)}
                        >
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
                          onClick={() => setRemoveUser(user)}
                          className="text-destructive"
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Remove from Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {roleChangeUser?.name || roleChangeUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RoleSelector
              value={selectedRole}
              onChange={setSelectedRole}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {selectedRole === "user" && "Users can view incidents, weather data, and add incident updates."}
              {selectedRole === "owner" && "Owners can manage users and organization settings."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={!!removeUser} onOpenChange={() => setRemoveUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeUser?.name || removeUser?.email} from this
              organization? They will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveUser} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={!!banUser} onOpenChange={() => setBanUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{banUser?.isBanned ? "Unban" : "Ban"} User</DialogTitle>
            <DialogDescription>
              {banUser?.isBanned
                ? `Are you sure you want to unban ${banUser?.name || banUser?.email}? They will regain access to the organization.`
                : `Are you sure you want to ban ${banUser?.name || banUser?.email}? They will be unable to access the organization.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanUser(null)}>
              Cancel
            </Button>
            <Button
              variant={banUser?.isBanned ? "default" : "destructive"}
              onClick={handleToggleBan}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {banUser?.isBanned ? "Unban" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
