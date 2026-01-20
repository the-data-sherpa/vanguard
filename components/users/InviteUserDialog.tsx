"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoleSelector } from "./RoleSelector";

interface InviteUserDialogProps {
  tenantId: Id<"tenants">;
  canInviteAdmin?: boolean;
}

export function InviteUserDialog({
  tenantId,
  canInviteAdmin = false,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "moderator" | "admin">("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUser = useMutation(api.users.inviteUser);

  const handleInvite = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      await inviteUser({
        tenantId,
        email: email.trim().toLowerCase(),
        role,
      });
      setOpen(false);
      setEmail("");
      setRole("member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a new user to join your organization. They will receive access
            once they sign up with this email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <RoleSelector
              value={role}
              onChange={setRole}
              canSetAdmin={canInviteAdmin}
            />
            <p className="text-xs text-muted-foreground">
              {role === "member" && "Members can view incidents and weather data."}
              {role === "moderator" && "Moderators can manage user submissions and content."}
              {role === "admin" && "Admins can manage users and organization settings."}
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isInviting}>
            {isInviting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
