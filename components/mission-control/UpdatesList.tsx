"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Update {
  _id: Id<"incidentUpdates">;
  content: string;
  createdAt: number;
  updatedAt?: number;
  createdBy: string;
  creatorName: string;
  creatorAvatar?: string;
  isSyncedToFacebook?: boolean;
  syncError?: string;
}

interface UpdatesListProps {
  updates: Update[];
  tenantId: Id<"tenants">;
}

export function UpdatesList({ updates, tenantId }: UpdatesListProps) {
  const [editingId, setEditingId] = useState<Id<"incidentUpdates"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteId, setDeleteId] = useState<Id<"incidentUpdates"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateMutation = useMutation(api.incidentUpdates.update);
  const deleteMutation = useMutation(api.incidentUpdates.remove);

  const handleEdit = (update: Update) => {
    setEditingId(update._id);
    setEditContent(update.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    setIsLoading(true);
    try {
      await updateMutation({
        tenantId,
        updateId: editingId,
        content: editContent.trim(),
      });
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsLoading(true);
    try {
      await deleteMutation({
        tenantId,
        updateId: deleteId,
      });
      setDeleteId(null);
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (updates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Updates</h4>
      <div className="space-y-3">
        {updates.map((update) => (
          <div
            key={update._id}
            className={cn(
              "flex gap-3 p-3 rounded-lg",
              update.syncError ? "bg-red-50" : "bg-muted/50"
            )}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={update.creatorAvatar} />
              <AvatarFallback className="text-xs">
                {getInitials(update.creatorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{update.creatorName}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(update.createdAt, { addSuffix: true })}
                  </span>
                  {update.updatedAt && (
                    <span className="text-muted-foreground italic">(edited)</span>
                  )}
                  {update.isSyncedToFacebook ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(update)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteId(update._id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {editingId === update._id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim() || isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{update.content}</p>
              )}

              {update.syncError && (
                <p className="text-xs text-red-600 mt-1">
                  Sync failed: {update.syncError}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this update? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
