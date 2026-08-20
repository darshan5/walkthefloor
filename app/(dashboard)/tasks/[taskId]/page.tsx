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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Clock, ClipboardCheck, MessageSquare, Send,
  Play, CheckCircle2, Pencil, Repeat, Plus, X, Square, CheckCheck, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-200 text-blue-800",
  MEDIUM: "bg-yellow-200 text-yellow-800",
  HIGH: "bg-orange-400 text-white",
  CRITICAL: "bg-red-500 text-white",
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-blue-50", text: "text-blue-700" },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700" },
  completed: { bg: "bg-green-50", text: "text-green-700" },
  missed: { bg: "bg-red-50", text: "text-red-700" },
};

type Subtask = { id: string; title: string; status: string; assigneeId: string | null; assigneeName: string | null };
type Tag = { id: string; name: string };
type Comment = { id: string; userId: string; userName: string; content: string; statusChange: string | null; createdAt: string };
type UserOption = { id: string; name: string; title: string | null };

type TaskDetail = {
  id: string; title: string; baseTitle: string | null; description: string | null;
  priority: string; status: string; source: string; dueDate: string | null;
  completedAt: string | null; createdAt: string; assigneeId: string | null;
  createdById: string; locationId: string; locationName: string;
  createdByName: string; assigneeName: string | null;
  completionId: string | null; recurrenceRule: any;
  tags: { tag: Tag }[]; subtasks: Subtask[]; comments: Comment[];
};

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
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeId: "", tagIds: [] as string[] });
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  const isOwner = session?.id === task?.createdById;
  const canManage = session?.permissions?.includes("tasks.manage");
  const canAssign = session?.permissions?.includes("tasks.assign");
  const canEdit = isOwner || canManage;
  const canComment = isOwner || canManage;
  const isAssigned = task?.assigneeId != null;
  const isTerminal = task ? ["completed", "missed"].includes(task.status) : false;

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((d) => setSession(d?.user || null));
    fetch("/api/v1/tasks/tags").then((r) => r.json()).then((d) => setAllTags(d?.data || []));
  }, []);
  useEffect(() => { fetchTask(); }, [taskId]);
  useEffect(() => {
    if (task?.locationId) fetch(`/api/v1/users?locationId=${task.locationId}`).then((r) => r.json()).then((d) => setUsers(d?.data || []));
  }, [task?.locationId]);

  async function fetchTask() {
    setLoading(true);
    const res = await fetch(`/api/v1/tasks/${taskId}`);
    if (res.ok) { const { data } = await res.json(); setTask(data); }
    else { toast.error("Task not found"); router.push("/tasks"); }
    setLoading(false);
  }

  async function handleStatusChange(s: string) {
    setActionLoading(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: s }) });
    setActionLoading(false);
    if (res.ok) { toast.success(s === "completed" ? "Completed" : "Reopened"); fetchTask(); }
    else { const { error } = await res.json(); toast.error(error); }
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setSending(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment }) });
    setSending(false);
    if (res.ok) { setComment(""); fetchTask(); }
  }

  async function handleSubtaskToggle(id: string, status: string) {
    await fetch(`/api/v1/tasks/subtasks/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status === "completed" ? "open" : "completed" }) });
    fetchTask();
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    await fetch(`/api/v1/tasks/${taskId}/subtasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newSubtask.trim() }) });
    setNewSubtask(""); fetchTask();
  }

  function openEdit() {
    if (!task) return;
    setEditForm({ title: task.title, description: task.description || "", priority: task.priority, dueDate: task.dueDate ? task.dueDate.split("T")[0] : "", assigneeId: task.assigneeId || "", tagIds: task.tags.map((t) => t.tag.id) });
    setEditMode(true);
  }

  async function handleEditSave() {
    if (!task) return;
    setActionLoading(true);
    const payload: any = { title: editForm.title, description: editForm.description || null, dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null, tagIds: editForm.tagIds };
    if (!isAssigned) payload.priority = editForm.priority;
    if (canAssign) payload.assigneeId = editForm.assigneeId || null;
    const res = await fetch(`/api/v1/tasks/${taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setActionLoading(false);
    if (res.ok) { toast.success("Updated"); setEditMode(false); fetchTask(); }
    else { const { error } = await res.json(); toast.error(error); }
  }

  function formatRecurrence(rule: any): string {
    if (!rule) return "";
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    switch (rule.type) {
      case "daily": return "Repeats daily";
      case "weekly": return `Repeats weekly on ${days[rule.dayOfWeek] || ""}`;
      case "biweekly": return `Repeats bi-weekly on ${days[rule.dayOfWeek] || ""}`;
      case "monthly": return `Repeats monthly on the ${rule.dayOfMonth}${rule.dayOfMonth===1?"st":rule.dayOfMonth===2?"nd":rule.dayOfMonth===3?"rd":"th"}`;
      case "custom": return `Repeats every ${rule.interval} days`;
      default: return "";
    }
  }

  if (loading || !task) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  const subtasksDone = task.subtasks.filter((s) => s.status === "completed").length;
  const ss = STATUS_STYLES[task.status] || STATUS_STYLES.open;

  return (
    <div className="space-y-4 pb-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tasks")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {task.source === "checklist_failure" && <ClipboardCheck className="h-4 w-4 text-blue-600 shrink-0" />}
            {task.recurrenceRule && <Repeat className="h-4 w-4 text-purple-600 shrink-0" />}
            <h1 className="text-xl font-bold">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", ss.bg, ss.text)}>{task.status.replace("_", " ")}</span>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
            <span className="text-xs text-muted-foreground">{task.locationName}</span>
            <span className="text-xs text-muted-foreground">by {task.createdByName}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2 flex-wrap">
          {task.status === "open" && <Button size="sm" onClick={() => handleStatusChange("completed")} disabled={actionLoading}><CheckCircle2 className="mr-1 h-3 w-3" />Complete</Button>}
          {task.status === "completed" && <Button size="sm" variant="outline" onClick={() => handleStatusChange("open")} disabled={actionLoading}>Reopen</Button>}
          {canEdit && <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="mr-1 h-3 w-3" />Edit</Button>}
        </div>
      )}

      {task.assigneeName && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 flex items-center gap-1.5">
          <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{getInitials(task.assigneeName)}</AvatarFallback></Avatar>
          {task.assigneeId === session?.id ? "Assigned to you" : `Assigned to ${task.assigneeName}`}
        </div>
      )}

      {/* Details */}
      <Card>
        <CardContent className="space-y-3 p-4">
          {task.description && <div><p className="text-xs font-medium text-muted-foreground">Description</p><p className="text-sm whitespace-pre-wrap">{task.description}</p></div>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {formatDate(task.dueDate)}</span>}
            {task.completedAt && <span>Completed {formatDate(task.completedAt)}</span>}
          </div>
          {task.tags.length > 0 && <div className="flex flex-wrap gap-1">{task.tags.map((t) => <Badge key={t.tag.id} variant="secondary" className="text-xs">{t.tag.name}</Badge>)}</div>}
          {task.recurrenceRule && <p className="text-xs flex items-center gap-1 text-purple-600"><Repeat className="h-3 w-3" />{formatRecurrence(task.recurrenceRule)}</p>}
          {task.source === "checklist_failure" && <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">From Checklist Failure</div>}
        </CardContent>
      </Card>

      {/* Subtasks */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" />Subtasks ({subtasksDone}/{task.subtasks.length})</h3>
          {task.subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted">
              <button onClick={() => handleSubtaskToggle(st.id, st.status)} className="shrink-0" disabled={isTerminal}>
                {st.status === "completed" ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
              <span className={cn("text-sm flex-1", st.status === "completed" && "line-through text-muted-foreground")}>{st.title}</span>
              {st.assigneeName && <span className="text-[11px] text-muted-foreground">{st.assigneeName}</span>}
            </div>
          ))}
          {!isTerminal && canEdit && (
            <div className="flex gap-2 mt-2">
              <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add subtask..." className="h-8 text-sm" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); } }} />
              <Button size="sm" variant="ghost" onClick={handleAddSubtask} disabled={!newSubtask.trim()}><Plus className="h-3 w-3" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />Activity ({task.comments.length})</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {task.comments.map((c) => (
              <div key={c.id} className="text-sm">
                {c.statusChange ? (
                  <div className="flex items-center gap-2 py-1 text-muted-foreground"><div className="h-px flex-1 bg-border" /><span className="text-[11px] italic">{c.content}</span><div className="h-px flex-1 bg-border" /></div>
                ) : (
                  <div className="rounded-md bg-muted p-2"><p className="text-xs">{c.content}</p><p className="text-[10px] text-muted-foreground mt-1">{c.userName} · {formatDateTime(c.createdAt)}</p></div>
                )}
              </div>
            ))}
          </div>
          {canComment && !isTerminal && (
            <>
              <Separator className="my-2" />
              <div className="flex gap-2">
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleComment()} />
                <Button size="icon" className="h-8 w-8" onClick={handleComment} disabled={sending || !comment.trim()}><Send className="h-3 w-3" /></Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      {editMode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setEditMode(false)}>
          <div className="bg-background w-full max-w-lg rounded-t-lg sm:rounded-lg p-4 space-y-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Edit Task</h2>
            <div><label className="text-sm font-medium">Title</label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium">Description</label><Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority {isAssigned && <span className="text-xs text-muted-foreground">(locked)</span>}</label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v || "MEDIUM" })} disabled={isAssigned}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem><SelectItem value="CRITICAL">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Due Date</label><Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} /></div>
            </div>
            {canAssign && (
              <div>
                <label className="text-sm font-medium">Assignee</label>
                <Select value={editForm.assigneeId} onValueChange={(v) => setEditForm({ ...editForm, assigneeId: v || "" })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned">{editForm.assigneeId ? users.find((u) => u.id === editForm.assigneeId)?.name || "Select" : "Unassigned"}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {allTags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {allTags.map((t) => <Badge key={t.id} variant={editForm.tagIds.includes(t.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setEditForm((f) => ({ ...f, tagIds: f.tagIds.includes(t.id) ? f.tagIds.filter((x) => x !== t.id) : [...f.tagIds, t.id] }))}>{t.name}</Badge>)}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleEditSave} disabled={actionLoading}>{actionLoading ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
