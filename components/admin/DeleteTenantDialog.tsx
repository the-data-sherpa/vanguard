"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DeleteTenantDialogProps {
  tenantId: Id<"tenants">;
  tenantName: string;
  tenantSlug: string;
  isPendingDeletion: boolean;
  onDeleted?: () => void;
  onCancelled?: () => void;
}

export function DeleteTenantDialog({
  tenantId,
  tenantName,
  tenantSlug,
  isPendingDeletion,
  onDeleted,
  onCancelled,
}: DeleteTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleDeletion = useMutation(api.admin.scheduleTenantDeletion);
  const cancelDeletion = useMutation(api.admin.cancelTenantDeletion);

  const handleScheduleDeletion = async () => {
    if (confirmName !== tenantSlug) {
      setError("Tenant name does not match");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await scheduleDeletion({
        tenantId,
        reason: reason.trim() || undefined,
      });
      setOpen(false);
      setConfirmName("");
      setReason("");
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule deletion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await cancelDeletion({ tenantId });
      setOpen(false);
      onCancelled?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel deletion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmValid = confirmName === tenantSlug;

  // Calculate deletion date (30 days from now)
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 30);
  const formattedDeletionDate = deletionDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isPendingDeletion) {
    // Show cancel deletion dialog
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Cancel Deletion</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled deletion of{" "}
              <strong>{tenantName}</strong> and restore it to active status.
              The tenant and all its data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <Button onClick={handleCancelDeletion} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Tenant
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Show schedule deletion dialog
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Tenant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Schedule Tenant Deletion
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              You are about to schedule <strong>{tenantName}</strong> for deletion.
            </span>
            <span className="block">
              The tenant will be permanently deleted on{" "}
              <strong>{formattedDeletionDate}</strong> (30 days from now).
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="p-3 bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Warning:</strong> After the grace period, all tenant data will be
              permanently deleted including:
            </p>
            <ul className="text-sm text-orange-800 dark:text-orange-200 list-disc list-inside mt-2">
              <li>All incidents and incident notes</li>
              <li>All weather alerts</li>
              <li>All audit logs</li>
              <li>User associations (users will not be deleted)</li>
            </ul>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for deletion (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for deletion..."
              rows={2}
            />
          </div>

          {/* Confirm */}
          <div className="space-y-2">
            <Label htmlFor="confirmName">
              Type <strong className="font-mono">{tenantSlug}</strong> to confirm
            </Label>
            <Input
              id="confirmName"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={tenantSlug}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleScheduleDeletion}
            disabled={isSubmitting || !isConfirmValid}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Deletion
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
