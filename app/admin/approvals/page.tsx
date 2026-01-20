"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Building2, Clock, CheckCircle, XCircle, Loader2, User } from "lucide-react";

type PendingTenant = {
  _id: Id<"tenants">;
  slug: string;
  name: string;
  displayName?: string;
  _creationTime: number;
  owner: {
    _id: Id<"users">;
    email: string;
    name?: string;
  } | null;
};

export default function ApprovalsPage() {
  const pendingApprovals = useQuery(api.admin.getPendingApprovals);
  const approveTenant = useMutation(api.admin.approveTenant);
  const rejectTenant = useMutation(api.admin.rejectTenant);

  const [selectedTenant, setSelectedTenant] = useState<PendingTenant | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<Id<"tenants"> | null>(null);

  const handleApprove = async (tenantId: Id<"tenants">) => {
    setProcessing(tenantId);
    try {
      await approveTenant({ tenantId });
    } catch (error) {
      console.error("Failed to approve tenant:", error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (tenant: PendingTenant) => {
    setSelectedTenant(tenant);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedTenant) return;

    setProcessing(selectedTenant._id);
    try {
      await rejectTenant({
        tenantId: selectedTenant._id,
        reason: rejectReason || undefined,
      });
      setRejectDialogOpen(false);
      setSelectedTenant(null);
    } catch (error) {
      console.error("Failed to reject tenant:", error);
    } finally {
      setProcessing(null);
    }
  };

  if (pendingApprovals === undefined) {
    return <ApprovalsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Pending Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve new organization requests
        </p>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingApprovals.length}</div>
          <p className="text-xs text-muted-foreground">
            {pendingApprovals.length === 0
              ? "No pending approvals"
              : pendingApprovals.length === 1
              ? "1 organization waiting for review"
              : `${pendingApprovals.length} organizations waiting for review`}
          </p>
        </CardContent>
      </Card>

      {/* Pending List */}
      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium">All caught up!</h3>
              <p className="text-sm text-muted-foreground">
                No pending organization requests to review.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((tenant) => (
            <Card key={tenant._id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {tenant.displayName || tenant.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {tenant.slug}
                        </Badge>
                      </div>
                      {tenant.owner && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            {tenant.owner.name || tenant.owner.email}
                            {tenant.owner.name && (
                              <span className="text-muted-foreground/70">
                                {" "}({tenant.owner.email})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {new Date(tenant._creationTime).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectClick(tenant)}
                      disabled={processing === tenant._id}
                    >
                      {processing === tenant._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1 text-red-500" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(tenant._id)}
                      disabled={processing === tenant._id}
                    >
                      {processing === tenant._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization Request</DialogTitle>
            <DialogDescription>
              This will reject the request for &quot;{selectedTenant?.displayName || selectedTenant?.name}&quot;.
              The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be visible to the user.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={processing !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={processing !== null}
            >
              {processing !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-48 mt-2" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
