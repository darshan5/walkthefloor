"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { AlertTriangle, MapPin, Clock, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, getInitials } from "@/lib/utils";

type CA = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  actualValue: string | null;
  targetValue: string | null;
  validRange: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  location: { id: string; name: string };
  assignee: { id: string; name: string; title: string | null } | null;
  createdBy: { id: string; name: string };
  completion: {
    task: { title: string; taskType: string; equipmentType: { name: string } | null } | null;
    instanceTask: { title: string; taskType: string; locationEquipment: { instanceName: string; equipmentType: { name: string } } | null } | null;
  } | null;
  _count: { comments: number };
};

type CADetail = CA & {
  comments: { id: string; userId: string; content: string; statusChange: string | null; createdAt: string }[];
};

export default function CorrectiveActionsPage() {
  const [cas, setCas] = useState<CA[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [selectedCA, setSelectedCA] = useState<CADetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  async function fetchCAs() {
    const res = await fetch(`/api/v1/corrective-actions?tab=${tab}`);
    if (res.ok) {
      const { data } = await res.json();
      setCas(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    fetchCAs();
  }, [tab]);

  async function openDetail(caId: string) {
    const res = await fetch(`/api/v1/corrective-actions/${caId}`);
    if (res.ok) {
      const { data } = await res.json();
      setSelectedCA(data);
      setDetailOpen(true);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selectedCA) return;
    const res = await fetch(`/api/v1/corrective-actions/${selectedCA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Status changed to ${newStatus}`);
      openDetail(selectedCA.id);
      fetchCAs();
    }
  }

  async function handleComment() {
    if (!selectedCA || !comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/v1/corrective-actions/${selectedCA.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setSending(false);
    if (res.ok) {
      setComment("");
      openDetail(selectedCA.id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Corrective Actions</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="my">My</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : cas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No corrective actions {tab === "my" ? "assigned to you" : "found"}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cas.map((ca) => (
            <Card
              key={ca.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetail(ca.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{ca.completion?.task?.title || ca.completion?.instanceTask?.title || ca.title}</span>
                      <StatusBadge status={ca.status} />
                      <Badge variant={ca.priority === "CRITICAL" ? "destructive" : "outline"} className="text-xs">
                        {ca.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ca.location.name}
                      </span>
                      {(ca.completion?.task?.equipmentType || ca.completion?.instanceTask?.locationEquipment) && (
                        <span>{ca.completion?.task?.equipmentType?.name || ca.completion?.instanceTask?.locationEquipment?.equipmentType.name}</span>
                      )}
                      {ca.actualValue && (
                        <span className="text-red-600 font-medium">
                          {ca.actualValue}
                          {ca.validRange && ` (${ca.validRange})`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ca.assignee && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {getInitials(ca.assignee.name)}
                        </div>
                        <span className="text-xs text-muted-foreground">{ca.assignee.name}</span>
                      </div>
                    )}
                    {ca.dueDate && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        Due {new Date(ca.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedCA && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCA.completion?.task?.title || selectedCA.completion?.instanceTask?.title || selectedCA.title}
                  <StatusBadge status={selectedCA.status} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium">{selectedCA.location.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority</span>
                    <p><Badge variant={selectedCA.priority === "CRITICAL" ? "destructive" : "outline"}>{selectedCA.priority}</Badge></p>
                  </div>
                  {selectedCA.actualValue && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Recorded</span>
                        <p className="font-medium text-red-600">{selectedCA.actualValue}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expected</span>
                        <p>{selectedCA.targetValue} {selectedCA.validRange && `(${selectedCA.validRange})`}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground">Assignee</span>
                    <p className="font-medium">{selectedCA.assignee?.name || "Unassigned"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p>{formatDateTime(selectedCA.createdAt)}</p>
                  </div>
                </div>

                {selectedCA.description && (
                  <p className="text-sm">{selectedCA.description}</p>
                )}

                {/* Status Actions */}
                {selectedCA.status !== "RESOLVED" && (
                  <div className="flex gap-2">
                    {selectedCA.status === "OPEN" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange("IN_PROGRESS")}>
                        Start Working
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleStatusChange("RESOLVED")}>
                      Mark Resolved
                    </Button>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({selectedCA.comments.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedCA.comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-muted p-2 text-sm">
                        {c.statusChange && (
                          <p className="text-xs text-muted-foreground italic mb-1">{c.statusChange}</p>
                        )}
                        <p>{c.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(c.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
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
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
