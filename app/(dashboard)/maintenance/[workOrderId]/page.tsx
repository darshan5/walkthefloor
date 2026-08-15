"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/data/status-badge";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wrench,
  User,
  Building2,
  MessageSquare,
  Send,
  DollarSign,
  CheckCircle2,
  XCircle,
  Play,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";

type Comment = {
  id: string;
  userId: string;
  content: string;
  statusChange: string | null;
  createdAt: string;
};

type WorkOrderDetail = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  photoUrls: string[];
  estimatedCost: number | null;
  actualCost: number | null;
  expenseNotes: string | null;
  invoiceUrl: string | null;
  rejectionNotes: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
  location: { id: string; name: string };
  createdBy: { id: string; name: string; title: string | null };
  approvedBy: { id: string; name: string } | null;
  assignee: { id: string; name: string; title: string | null } | null;
  vendor: { id: string; name: string; specialty: string | null } | null;
  equipment: { id: string; instanceName: string; equipmentType: { name: string } } | null;
  comments: Comment[];
};

type UserOption = { id: string; name: string; title: string | null };
type Vendor = { id: string; name: string; specialty: string | null };

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workOrderId = params.workOrderId as string;

  const [wo, setWo] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [costEditOpen, setCostEditOpen] = useState(false);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [approveForm, setApproveForm] = useState({
    assignType: "user" as "user" | "vendor",
    assigneeId: "",
    vendorId: "",
    estimatedCost: "",
    dueDate: "",
    notes: "",
  });
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [costForm, setCostForm] = useState({
    actualCost: "",
    expenseNotes: "",
    invoiceUrl: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const canApprove = session?.permissions?.includes("maintenance.approve");
  const canManage = session?.permissions?.includes("maintenance.manage");
  const isAssignee = wo?.assignee?.id === session?.id;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data?.user || null));
    fetch("/api/v1/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(data?.data || []));
  }, []);

  useEffect(() => {
    fetchWorkOrder();
  }, [workOrderId]);

  useEffect(() => {
    if (wo?.location.id) {
      fetch(`/api/v1/users?locationId=${wo.location.id}`)
        .then((r) => r.json())
        .then((data) => setUsers(data?.data || []));
    }
  }, [wo?.location.id]);

  async function fetchWorkOrder() {
    setLoading(true);
    const res = await fetch(`/api/v1/work-orders/${workOrderId}`);
    if (res.ok) {
      const { data } = await res.json();
      setWo(data);
    } else {
      toast.error("Work order not found");
      router.push("/maintenance");
    }
    setLoading(false);
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const payload: any = { notes: approveForm.notes || undefined };
    if (approveForm.assignType === "user") payload.assigneeId = approveForm.assigneeId;
    else payload.vendorId = approveForm.vendorId;
    if (approveForm.estimatedCost) payload.estimatedCost = parseFloat(approveForm.estimatedCost);
    if (approveForm.dueDate) payload.dueDate = new Date(approveForm.dueDate).toISOString();

    const res = await fetch(`/api/v1/work-orders/${workOrderId}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success("Work order approved");
      setApproveOpen(false);
      fetchWorkOrder();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const res = await fetch(`/api/v1/work-orders/${workOrderId}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectionNotes }),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success("Work order rejected");
      setRejectOpen(false);
      fetchWorkOrder();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleAction(action: string) {
    setActionLoading(true);
    const res = await fetch(`/api/v1/work-orders/${workOrderId}/${action}`, {
      method: "PATCH",
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success(
        action === "start" ? "Work started" : action === "complete" ? "Marked as completed" : "Work order cancelled"
      );
      fetchWorkOrder();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleCostUpdate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const payload: any = {};
    if (costForm.actualCost) payload.actualCost = parseFloat(costForm.actualCost);
    if (costForm.expenseNotes) payload.expenseNotes = costForm.expenseNotes;
    if (costForm.invoiceUrl) payload.invoiceUrl = costForm.invoiceUrl;

    const res = await fetch(`/api/v1/work-orders/${workOrderId}/cost`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success("Cost updated");
      setCostEditOpen(false);
      fetchWorkOrder();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/v1/work-orders/${workOrderId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setSending(false);
    if (res.ok) {
      setComment("");
      fetchWorkOrder();
    }
  }

  if (loading || !wo) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  const isTerminal = ["completed", "rejected", "cancelled"].includes(wo.status);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/maintenance")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{wo.title}</h1>
            <StatusBadge status={wo.status} />
            <Badge
              variant={wo.priority === "CRITICAL" || wo.priority === "HIGH" ? "destructive" : "outline"}
              className="text-xs"
            >
              {wo.priority}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {wo.location.name}
            </span>
            <span>Created by {wo.createdBy.name} on {formatDate(wo.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="flex gap-2 flex-wrap">
          {wo.status === "pending_approval" && canApprove && (
            <>
              <Button size="sm" onClick={() => setApproveOpen(true)}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {wo.status === "approved" && isAssignee && (
            <Button size="sm" onClick={() => handleAction("start")}>
              <Play className="mr-1 h-4 w-4" />
              Start Work
            </Button>
          )}
          {wo.status === "in_progress" && canManage && (
            <Button size="sm" onClick={() => handleAction("complete")}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Mark Completed
            </Button>
          )}
          {(wo.status === "approved" || wo.status === "in_progress") && canManage && (
            <Button size="sm" variant="outline" onClick={() => handleAction("cancel")}>
              <Ban className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Details */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {wo.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm whitespace-pre-wrap">{wo.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {wo.equipment && (
              <div>
                <p className="text-muted-foreground">Equipment</p>
                <p className="font-medium flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  {wo.equipment.equipmentType.name} - {wo.equipment.instanceName}
                </p>
              </div>
            )}
            {wo.dueDate && (
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(wo.dueDate)}
                </p>
              </div>
            )}
            {wo.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDate(wo.completedAt)}</p>
              </div>
            )}
          </div>
          {wo.photoUrls && (wo.photoUrls as string[]).length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Photos</p>
              <div className="flex gap-2 overflow-x-auto">
                {(wo.photoUrls as string[]).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-24 w-24 rounded-md object-cover border"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
          {wo.rejectionNotes && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">Rejection Reason</p>
              <p className="text-sm text-red-600">{wo.rejectionNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment */}
      {(wo.assignee || wo.vendor || wo.approvedBy) && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Assignment</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {wo.assignee && (
                <div>
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {wo.assignee.name}
                    {wo.assignee.title && <span className="text-muted-foreground">({wo.assignee.title})</span>}
                  </p>
                </div>
              )}
              {wo.vendor && (
                <div>
                  <p className="text-muted-foreground">Vendor</p>
                  <p className="font-medium flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {wo.vendor.name}
                    {wo.vendor.specialty && <span className="text-muted-foreground">({wo.vendor.specialty})</span>}
                  </p>
                </div>
              )}
              {wo.approvedBy && (
                <div>
                  <p className="text-muted-foreground">Approved By</p>
                  <p className="font-medium">
                    {wo.approvedBy.name} on {wo.approvedAt && formatDate(wo.approvedAt)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost */}
      {(wo.estimatedCost !== null || wo.actualCost !== null || canManage) && wo.status !== "pending_approval" && wo.status !== "rejected" && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Cost
              </p>
              {canManage && !isTerminal && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCostForm({
                      actualCost: wo.actualCost?.toString() || "",
                      expenseNotes: wo.expenseNotes || "",
                      invoiceUrl: wo.invoiceUrl || "",
                    });
                    setCostEditOpen(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Estimated</p>
                <p className="font-medium">{wo.estimatedCost != null ? `$${wo.estimatedCost.toFixed(2)}` : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual</p>
                <p className="font-medium">{wo.actualCost != null ? `$${wo.actualCost.toFixed(2)}` : "—"}</p>
              </div>
              {wo.expenseNotes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Notes</p>
                  <p>{wo.expenseNotes}</p>
                </div>
              )}
              {wo.invoiceUrl && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Invoice</p>
                  <a href={wo.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    View Invoice
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Activity ({wo.comments.length})
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {wo.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              wo.comments.map((c) => (
                <div key={c.id} className="text-sm">
                  {c.statusChange ? (
                    <div className="flex items-center gap-2 py-1.5 text-muted-foreground">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs italic">{c.content}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  ) : (
                    <div className="rounded-md bg-muted p-2.5">
                      <p>{c.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {!isTerminal && (
            <>
              <Separator className="my-3" />
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                />
                <Button size="icon" onClick={handleComment} disabled={sending || !comment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Sheet */}
      <Sheet open={approveOpen} onOpenChange={setApproveOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>Approve Work Order</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleApprove} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Assign To *</label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={approveForm.assignType === "user" ? "default" : "outline"}
                  onClick={() => setApproveForm({ ...approveForm, assignType: "user", vendorId: "" })}
                >
                  <User className="mr-1 h-3 w-3" />
                  Internal User
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={approveForm.assignType === "vendor" ? "default" : "outline"}
                  onClick={() => setApproveForm({ ...approveForm, assignType: "vendor", assigneeId: "" })}
                >
                  <Building2 className="mr-1 h-3 w-3" />
                  Vendor
                </Button>
              </div>
            </div>
            {approveForm.assignType === "user" ? (
              <Select
                value={approveForm.assigneeId}
                onValueChange={(v) => setApproveForm({ ...approveForm, assigneeId: v || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}{u.title ? ` (${u.title})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={approveForm.vendorId}
                onValueChange={(v) => setApproveForm({ ...approveForm, vendorId: v || "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}{v.specialty ? ` (${v.specialty})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Estimated Cost</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                  value={approveForm.estimatedCost}
                  onChange={(e) => setApproveForm({ ...approveForm, estimatedCost: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={approveForm.dueDate}
                  onChange={(e) => setApproveForm({ ...approveForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={approveForm.notes}
                onChange={(e) => setApproveForm({ ...approveForm, notes: e.target.value })}
                placeholder="Instructions for the assignee..."
                rows={2}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={
                actionLoading ||
                (approveForm.assignType === "user" && !approveForm.assigneeId) ||
                (approveForm.assignType === "vendor" && !approveForm.vendorId)
              }
            >
              {actionLoading ? "Approving..." : "Approve"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Reject Sheet */}
      <Sheet open={rejectOpen} onOpenChange={setRejectOpen}>
        <SheetContent side="bottom" className="h-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>Reject Work Order</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleReject} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for Rejection *</label>
              <Textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Explain why this work order is being rejected..."
                rows={3}
                required
              />
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={actionLoading || !rejectionNotes.trim()}>
              {actionLoading ? "Rejecting..." : "Reject"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Cost Edit Sheet */}
      <Sheet open={costEditOpen} onOpenChange={setCostEditOpen}>
        <SheetContent side="bottom" className="h-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>Update Cost</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCostUpdate} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Actual Cost</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="$0.00"
                value={costForm.actualCost}
                onChange={(e) => setCostForm({ ...costForm, actualCost: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expense Notes</label>
              <Textarea
                value={costForm.expenseNotes}
                onChange={(e) => setCostForm({ ...costForm, expenseNotes: e.target.value })}
                placeholder="Details about the expense..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Invoice URL</label>
              <Input
                type="url"
                placeholder="https://..."
                value={costForm.invoiceUrl}
                onChange={(e) => setCostForm({ ...costForm, invoiceUrl: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
