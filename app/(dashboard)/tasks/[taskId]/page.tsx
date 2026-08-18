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
  ArrowLeft, MapPin, Clock, User, CheckSquare, ClipboardCheck,
  MessageSquare, Send, Play, CheckCircle2, Pencil, Repeat, Plus, X, Square, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  userId: string;
  content: string;
  statusChange: string | null;
  createdAt: string;
};

type Subtask = {
  id: string;
  title: string;
  status: string;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
};

type Tag = { id: string; name: string };

type TaskDetail = {
  id: string;
  title: string;
  baseTitle: string | null;
  description: string | null;
  priority: string;
  status: string;
  source: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assigneeId: string | null;
  completionId: string | null;
  recurrenceRule: any;
  location: { id: string; name: string };
  createdBy: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  tags: { tag: Tag }[];
  subtasks: Subtask[];
  comments: Comment[];
};

type UserOption = { id: string; name: string; title: string | null };

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "", description: "", priority: "MEDIUM", dueDate: "",
    assigneeId: "", tagIds: [] as string[],
  });
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  const isOwner = session?.id === task?.createdBy.id;
  const canManage = session?.permissions?.includes("tasks.manage");
  const canEdit = isOwner || canManage;
  const canComment = isOwner || canManage;
  const isAssigned = task?.assigneeId != null;
  const isAssignee = task?.assigneeId === session?.id;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data?.user || null));
    fetch("/api/v1/tasks/tags")
      .then((r) => r.json())
      .then((data) => setAllTags(data?.data || []));
  }, []);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (task?.location.id) {
      fetch(`/api/v1/users?locationId=${task.location.id}`)
        .then((r) => r.json())
        .then((data) => setUsers(data?.data || []));
    }
  }, [task?.location.id]);

  async function fetchTask() {
    setLoading(true);
    const res = await fetch(`/api/v1/tasks/${taskId}`);
    if (res.ok) {
      const { data } = await res.json();
      setTask(data);
    } else {
      toast.error("Task not found");
      router.push("/tasks");
    }
    setLoading(false);
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success(newStatus === "in_progress" ? "Task started" : "Task completed");
      fetchTask();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setSending(false);
    if (res.ok) {
      setComment("");
      fetchTask();
    }
  }

  async function handleSubtaskToggle(subtaskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "open" : "completed";
    const res = await fetch(`/api/v1/tasks/subtasks/${subtaskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchTask();
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() }),
    });
    setAddingSubtask(false);
    if (res.ok) {
      setNewSubtask("");
      fetchTask();
    }
  }

  function openEdit() {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      assigneeId: task.assigneeId || "",
      tagIds: task.tags.map((t) => t.tag.id),
    });
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    const payload: any = {
      title: editForm.title,
      description: editForm.description || null,
      dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      assigneeId: editForm.assigneeId || null,
      tagIds: editForm.tagIds,
    };
    if (!isAssigned) payload.priority = editForm.priority;

    const res = await fetch(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success("Task updated");
      setEditOpen(false);
      fetchTask();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function toggleEditTag(tagId: string) {
    setEditForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter((t) => t !== tagId) : [...f.tagIds, tagId],
    }));
  }

  function formatRecurrence(rule: any): string {
    if (!rule) return "";
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    switch (rule.type) {
      case "daily": return "Repeats daily";
      case "weekly": return `Repeats weekly on ${days[rule.dayOfWeek] || ""}`;
      case "biweekly": return `Repeats bi-weekly on ${days[rule.dayOfWeek] || ""}`;
      case "monthly": return `Repeats monthly on the ${rule.dayOfMonth}${rule.dayOfMonth === 1 ? "st" : rule.dayOfMonth === 2 ? "nd" : rule.dayOfMonth === 3 ? "rd" : "th"}`;
      case "custom": return `Repeats every ${rule.interval} days`;
      default: return "";
    }
  }

  if (loading || !task) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  const isTerminal = ["completed", "missed"].includes(task.status);
  const subtasksDone = task.subtasks.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tasks")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {task.source === "checklist_failure" && (
              <ClipboardCheck className="h-4 w-4 text-blue-600 shrink-0" />
            )}
            {task.recurrenceRule && (
              <Repeat className="h-4 w-4 text-purple-600 shrink-0" />
            )}
            <h1 className="text-xl font-bold">{task.title}</h1>
            <StatusBadge status={task.status} />
            <Badge
              variant={task.priority === "CRITICAL" || task.priority === "HIGH" ? "destructive" : "outline"}
              className="text-xs"
            >
              {task.priority}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.location.name}
            </span>
            <span>Created by {task.createdBy.name} on {formatDate(task.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Source + Assigned badges */}
      {task.source === "checklist_failure" && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          From Checklist Failure
          {task.completionId && (
            <span className="ml-1 text-xs text-blue-500">(linked to completion)</span>
          )}
        </div>
      )}
      {task.assignee && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 flex items-center gap-2">
          <User className="h-4 w-4" />
          {task.assignee.id === session?.id ? "Assigned to you" : `Assigned to ${task.assignee.name}`}
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 flex-wrap">
          {task.status === "open" && (isAssignee || isOwner || canManage) && (
            <Button size="sm" onClick={() => handleStatusChange("in_progress")} disabled={actionLoading}>
              <Play className="mr-1 h-4 w-4" />
              Start
            </Button>
          )}
          {task.status === "in_progress" && (isAssignee || isOwner || canManage) && (
            <Button size="sm" onClick={() => handleStatusChange("completed")} disabled={actionLoading}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Complete
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      )}

      {/* Details */}
      <Card>
        <CardContent className="space-y-3 p-4">
          {task.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {task.dueDate && (
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </p>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDate(task.completedAt)}</p>
              </div>
            )}
          </div>
          {task.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((t) => (
                  <Badge key={t.tag.id} variant="secondary" className="text-xs">{t.tag.name}</Badge>
                ))}
              </div>
            </div>
          )}
          {task.recurrenceRule && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Recurrence</p>
              <p className="text-sm flex items-center gap-1">
                <Repeat className="h-3 w-3 text-purple-600" />
                {formatRecurrence(task.recurrenceRule)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subtasks */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
            <CheckSquare className="h-4 w-4" />
            Subtasks ({subtasksDone}/{task.subtasks.length})
          </h3>
          {task.subtasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subtasks.</p>
          ) : (
            <div className="space-y-1">
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 py-1 rounded-md hover:bg-muted px-1">
                  <button
                    onClick={() => handleSubtaskToggle(st.id, st.status)}
                    className="shrink-0"
                    disabled={isTerminal}
                  >
                    {st.status === "completed" ? (
                      <CheckCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className={cn("text-sm flex-1", st.status === "completed" && "line-through text-muted-foreground")}>
                    {st.title}
                  </span>
                  {st.assignee && (
                    <span className="text-xs text-muted-foreground">{st.assignee.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isTerminal && canEdit && (
            <div className="flex gap-2 mt-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Add subtask..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }}
              />
              <Button size="sm" variant="outline" onClick={handleAddSubtask} disabled={addingSubtask || !newSubtask.trim()}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Activity ({task.comments.length})
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {task.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              task.comments.map((c) => (
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
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {canComment && !isTerminal && (
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

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEdit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority {isAssigned && <span className="text-xs text-muted-foreground">(locked)</span>}</label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v || "MEDIUM" })} disabled={isAssigned}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select value={editForm.assigneeId} onValueChange={(v) => setEditForm({ ...editForm, assigneeId: v || "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned">
                    {editForm.assigneeId ? users.find((u) => u.id === editForm.assigneeId)?.name || "Select user" : "Unassigned"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {allTags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allTags.map((t) => (
                    <Badge
                      key={t.id}
                      variant={editForm.tagIds.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleEditTag(t.id)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
