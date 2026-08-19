"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Clock,
  ClipboardCheck,
  Repeat,
  X,
  Send,
  Search,
  Play,
  CheckCircle2,
  Pencil,
  Square,
  CheckCheck,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";
import { useLocation } from "@/components/layout/location-context";
import { cn } from "@/lib/utils";

const PRIORITY_GROUPS = [
  { key: "CRITICAL", label: "Critical", border: "border-l-red-500", bg: "bg-red-500", headerBg: "bg-red-50", text: "text-red-700" },
  { key: "HIGH", label: "High", border: "border-l-orange-500", bg: "bg-orange-500", headerBg: "bg-orange-50", text: "text-orange-700" },
  { key: "MEDIUM", label: "Medium", border: "border-l-yellow-500", bg: "bg-yellow-500", headerBg: "bg-yellow-50", text: "text-yellow-700" },
  { key: "LOW", label: "Low", border: "border-l-blue-400", bg: "bg-blue-400", headerBg: "bg-blue-50", text: "text-blue-700" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-200 text-blue-800",
  MEDIUM: "bg-yellow-200 text-yellow-800",
  HIGH: "bg-orange-400 text-white",
  CRITICAL: "bg-red-500 text-white",
};

type TaskItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  source: string;
  dueDate: string | null;
  createdAt: string;
  locationId: string;
  locationName: string;
  assigneeId: string | null;
  createdById: string;
  createdByName: string;
  assigneeName: string | null;
  description: string | null;
  tags: { tag: { id: string; name: string } }[];
  _count: { subtasks: number; comments: number };
  subtaskTotal: number;
  subtaskCompleted: number;
  recurrenceRule: any;
};

type TaskDetail = TaskItem & {
  baseTitle: string | null;
  completedAt: string | null;
  completionId: string | null;
  subtasks: { id: string; title: string; status: string; assigneeId: string | null; assigneeName: string | null }[];
  comments: { id: string; userId: string; userName: string; content: string; statusChange: string | null; createdAt: string }[];
};

type Tag = { id: string; name: string };
type Template = { id: string; name: string; title: string; description: string | null; priority: string; tagIds: string[]; subtasks: { title: string }[]; recurrenceRule: any };
type UserOption = { id: string; name: string; title: string | null };

export default function TasksPage() {
  const { selectedLocationId, locations } = useLocation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ completed: true, missed: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});

  // Detail panel state
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "MEDIUM", dueDate: "", assigneeId: "", tagIds: [] as string[] });
  const [actionLoading, setActionLoading] = useState(false);

  // Create from template
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "", description: "", priority: "MEDIUM", locationId: "",
    assigneeId: "", dueDate: "", tagIds: [] as string[], subtasks: [] as string[],
    newSubtask: "", templateId: "", repeat: false, recurrenceType: "daily",
    dayOfWeek: "1", dayOfMonth: "1", interval: "7",
  });
  const [submitting, setSubmitting] = useState(false);

  const canAssign = session?.permissions?.includes("tasks.assign");
  const canManage = session?.permissions?.includes("tasks.manage");

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((d) => setSession(d?.user || null));
    fetch("/api/v1/tasks/tags").then((r) => r.json()).then((d) => setTags(d?.data || []));
    fetch("/api/v1/tasks/templates").then((r) => r.json()).then((d) => setTemplates(d?.data || []));
  }, []);

  useEffect(() => { fetchTasks(); }, [selectedLocationId, priorityFilter, tagFilter]);

  useEffect(() => {
    const locId = selectedLocationId || (locations.length === 1 ? locations[0]?.id : "");
    if (locId) {
      fetch(`/api/v1/users?locationId=${locId}`).then((r) => r.json()).then((d) => setUsers(d?.data || []));
    }
  }, [selectedLocationId, locations]);

  async function fetchTasks() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
    if (tagFilter && tagFilter !== "all") params.set("tagId", tagFilter);
    const res = await fetch(`/api/v1/tasks?${params}`);
    if (res.ok) { const { data } = await res.json(); setTasks(data); }
    setLoading(false);
  }

  async function openTaskPanel(taskId: string) {
    const res = await fetch(`/api/v1/tasks/${taskId}`);
    if (res.ok) {
      const { data } = await res.json();
      setSelectedTask(data);
      setPanelOpen(true);
      setEditMode(false);
      setComment("");
      setNewSubtask("");
    }
  }

  async function refreshPanel() {
    if (!selectedTask) return;
    const res = await fetch(`/api/v1/tasks/${selectedTask.id}`);
    if (res.ok) { const { data } = await res.json(); setSelectedTask(data); }
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedTask(null);
    setEditMode(false);
  }

  // Quick add task
  async function handleQuickAdd(priority: string) {
    const title = quickAdd[priority]?.trim();
    if (!title) return;
    const locId = selectedLocationId || (locations.length === 1 ? locations[0]?.id : "");
    if (!locId) { toast.error("Select a location"); return; }
    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority, locationId: locId }),
    });
    if (res.ok) {
      setQuickAdd((q) => ({ ...q, [priority]: "" }));
      toast.success("Task created");
      fetchTasks();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed");
    }
  }

  // Toggle task complete
  async function handleToggleComplete(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "open" : "completed";
    const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { fetchTasks(); }
    else { const { error } = await res.json(); toast.error(error); }
  }

  // Status change
  async function handleStatusChange(taskId: string, newStatus: string) {
    setActionLoading(true);
    const res = await fetch(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success(newStatus === "in_progress" ? "Started" : "Completed");
      fetchTasks();
      if (selectedTask?.id === taskId) refreshPanel();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  // Comment
  async function handleComment() {
    if (!comment.trim() || !selectedTask) return;
    setSending(true);
    const res = await fetch(`/api/v1/tasks/${selectedTask.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    setSending(false);
    if (res.ok) { setComment(""); refreshPanel(); }
  }

  // Subtask toggle
  async function handleSubtaskToggle(subtaskId: string, currentStatus: string) {
    const res = await fetch(`/api/v1/tasks/subtasks/${subtaskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: currentStatus === "completed" ? "open" : "completed" }),
    });
    if (res.ok) { refreshPanel(); fetchTasks(); }
  }

  // Add subtask
  async function handleAddSubtask() {
    if (!newSubtask.trim() || !selectedTask) return;
    const res = await fetch(`/api/v1/tasks/${selectedTask.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() }),
    });
    if (res.ok) { setNewSubtask(""); refreshPanel(); fetchTasks(); }
  }

  // Edit save
  async function handleEditSave() {
    if (!selectedTask) return;
    setActionLoading(true);
    const isAssigned = selectedTask.assigneeId != null;
    const payload: any = {
      title: editForm.title,
      description: editForm.description || null,
      dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      tagIds: editForm.tagIds,
    };
    if (!isAssigned) payload.priority = editForm.priority;
    if (canAssign) payload.assigneeId = editForm.assigneeId || null;

    const res = await fetch(`/api/v1/tasks/${selectedTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActionLoading(false);
    if (res.ok) {
      toast.success("Updated");
      setEditMode(false);
      refreshPanel();
      fetchTasks();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function openEditMode() {
    if (!selectedTask) return;
    setEditForm({
      title: selectedTask.title,
      description: selectedTask.description || "",
      priority: selectedTask.priority,
      dueDate: selectedTask.dueDate ? selectedTask.dueDate.split("T")[0] : "",
      assigneeId: selectedTask.assigneeId || "",
      tagIds: selectedTask.tags.map((t) => t.tag.id),
    });
    setEditMode(true);
  }

  // Create from template
  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setCreateForm((f) => ({
      ...f, templateId, title: t.title, description: t.description || "",
      priority: t.priority, tagIds: t.tagIds || [],
      subtasks: (t.subtasks || []).map((s: any) => s.title || s),
      repeat: !!t.recurrenceRule,
      recurrenceType: t.recurrenceRule?.type || "daily",
      dayOfWeek: String(t.recurrenceRule?.dayOfWeek ?? 1),
      dayOfMonth: String(t.recurrenceRule?.dayOfMonth ?? 1),
      interval: String(t.recurrenceRule?.interval ?? 7),
    }));
  }

  async function handleCreateFull(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const f = createForm;
    const payload: any = { title: f.title, priority: f.priority, locationId: f.locationId };
    if (f.description) payload.description = f.description;
    if (f.assigneeId) payload.assigneeId = f.assigneeId;
    if (f.dueDate) payload.dueDate = new Date(f.dueDate).toISOString();
    if (f.tagIds.length) payload.tagIds = f.tagIds;
    if (f.subtasks.length) payload.subtasks = f.subtasks.map((t) => ({ title: t }));
    if (f.templateId) payload.templateId = f.templateId;
    if (f.repeat) {
      const rule: any = { type: f.recurrenceType };
      if (f.recurrenceType === "weekly" || f.recurrenceType === "biweekly") rule.dayOfWeek = parseInt(f.dayOfWeek);
      if (f.recurrenceType === "monthly") rule.dayOfMonth = parseInt(f.dayOfMonth);
      if (f.recurrenceType === "custom") rule.interval = parseInt(f.interval);
      payload.recurrenceRule = rule;
    }
    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) { toast.success("Task created"); setCreateOpen(false); fetchTasks(); }
    else { const { error } = await res.json(); toast.error(error || "Failed"); }
  }

  function openCreateFull() {
    const locId = selectedLocationId || (locations.length === 1 ? locations[0]?.id : "");
    setCreateForm({
      title: "", description: "", priority: "MEDIUM", locationId: locId,
      assigneeId: "", dueDate: "", tagIds: [], subtasks: [], newSubtask: "",
      templateId: "", repeat: false, recurrenceType: "daily",
      dayOfWeek: "1", dayOfMonth: "1", interval: "7",
    });
    setCreateOpen(true);
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const grouped = PRIORITY_GROUPS.map((g) => ({
    ...g,
    tasks: filteredTasks.filter((t) => t.priority === g.key && t.status !== "completed" && t.status !== "missed"),
  }));
  const completedTasks = filteredTasks.filter((t) => t.status === "completed" || t.status === "missed");

  const isOwner = (task: TaskItem | TaskDetail) => session?.id === task.createdById;
  const canEditTask = (task: TaskItem | TaskDetail) => isOwner(task) || canManage;

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

  return (
    <div className="space-y-3 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {templates.length > 0 && (
          <Button size="sm" variant="outline" onClick={openCreateFull}>
            <Plus className="mr-1 h-3 w-3" /> From Template
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {tags.length > 0 && (
          <Select value={tagFilter} onValueChange={(v) => setTagFilter(v || "")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by tag">
                {tagFilter && tagFilter !== "all" ? tags.find((t) => t.id === tagFilter)?.name || "Tag" : "Filter by tag"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const isCollapsed = collapsed[group.key] ?? false;
            return (
              <div key={group.key} className={cn("rounded-lg border", group.border, "border-l-4")}>
                {/* Group Header */}
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [group.key]: !isCollapsed }))}
                  className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold", group.headerBg, group.text, "rounded-t-lg")}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {group.label}
                  <span className="font-normal opacity-70">({group.tasks.length})</span>
                </button>

                {!isCollapsed && (
                  <div>
                    {/* Desktop Header Row */}
                    {group.tasks.length > 0 && (
                      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/30">
                        <span className="flex-1">Task</span>
                        <span className="w-20 text-center">Priority</span>
                        {canAssign && <span className="w-24 text-center">Assignee</span>}
                        <span className="w-24 text-center">Due Date</span>
                        <span className="w-28">Tags</span>
                      </div>
                    )}

                    {/* Task Rows */}
                    {group.tasks.map((task) => {
                      const isAssignedToMe = task.assigneeId && task.assigneeId !== session?.id && session?.id !== task.createdById;
                      return (
                        <div key={task.id}>
                          {/* Desktop Row */}
                          <div
                            className={cn(
                              "hidden md:flex items-center gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
                              isAssignedToMe && "bg-blue-50/50",
                              task.status === "completed" && "opacity-60"
                            )}
                            onClick={() => openTaskPanel(task.id)}
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" />
                            <button
                              className="shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }}
                            >
                              {task.status === "completed" ? (
                                <CheckSquare className="h-4 w-4 text-green-600" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                              {task.source === "checklist_failure" && <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                              {task.recurrenceRule && <Repeat className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                              <span className="text-sm truncate">{task.title}</span>
                              {task.subtaskTotal > 0 && (
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {task.subtaskCompleted}/{task.subtaskTotal}
                                </span>
                              )}
                            </div>
                            <div className="w-20 flex justify-center">
                              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", PRIORITY_COLORS[task.priority] || "bg-gray-200")}>
                                {task.priority}
                              </span>
                            </div>
                            {canAssign && (
                              <div className="w-24 flex justify-center">
                                {task.assigneeName ? (
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[9px]">{getInitials(task.assigneeName)}</AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30" />
                                )}
                              </div>
                            )}
                            <div className="w-24 text-center text-xs text-muted-foreground">
                              {task.dueDate ? formatDate(task.dueDate) : "—"}
                            </div>
                            <div className="w-28 flex gap-1 overflow-hidden">
                              {task.tags.slice(0, 2).map((t) => (
                                <Badge key={t.tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{t.tag.name}</Badge>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
                              )}
                            </div>
                          </div>

                          {/* Mobile Card */}
                          <div
                            className={cn(
                              "md:hidden px-3 py-2.5 border-b last:border-b-0 cursor-pointer active:bg-muted/50",
                              isAssignedToMe && "bg-blue-50/50",
                              task.status === "completed" && "opacity-60"
                            )}
                            onClick={() => openTaskPanel(task.id)}
                          >
                            <div className="flex items-start gap-2">
                              <button
                                className="shrink-0 mt-0.5"
                                onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }}
                              >
                                {task.status === "completed" ? (
                                  <CheckSquare className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-muted-foreground/50" />
                                )}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {task.source === "checklist_failure" && <ClipboardCheck className="h-3 w-3 text-blue-600 shrink-0" />}
                                  {task.recurrenceRule && <Repeat className="h-3 w-3 text-purple-600 shrink-0" />}
                                  <span className={cn("text-sm font-medium", task.status === "completed" && "line-through")}>{task.title}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", PRIORITY_COLORS[task.priority])}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                      <Clock className="h-3 w-3" />{formatDate(task.dueDate)}
                                    </span>
                                  )}
                                  {task.subtaskTotal > 0 && (
                                    <span className="text-[11px] text-muted-foreground">{task.subtaskCompleted}/{task.subtaskTotal}</span>
                                  )}
                                  {task.tags.slice(0, 2).map((t) => (
                                    <Badge key={t.tag.id} variant="secondary" className="text-[9px] px-1 py-0">{t.tag.name}</Badge>
                                  ))}
                                </div>
                              </div>
                              {canAssign && task.assigneeName && (
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarFallback className="text-[9px]">{getInitials(task.assigneeName)}</AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Row */}
                    {(
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          value={quickAdd[group.key] || ""}
                          onChange={(e) => setQuickAdd((q) => ({ ...q, [group.key]: e.target.value }))}
                          placeholder="Add item..."
                          className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 text-sm"
                          onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(group.key); }}
                        />
                      </div>
                    )}

                    {/* Empty state */}
                    {group.tasks.length === 0 && (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">No tasks</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Completed Section */}
          {completedTasks.length > 0 && (
            <div className={cn("rounded-lg border border-l-4 border-l-green-500")}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2.5 bg-green-50"
                onClick={() => setCollapsed((c) => ({ ...c, completed: !c.completed }))}
              >
                {collapsed.completed ? <ChevronRight className="h-4 w-4 text-green-700" /> : <ChevronDown className="h-4 w-4 text-green-700" />}
                <span className="text-sm font-semibold text-green-700">Completed</span>
                <span className="text-xs text-green-600 ml-1">({completedTasks.length})</span>
              </button>
              {!collapsed.completed && (
                <div>
                  {completedTasks.map((task) => (
                    <div key={task.id}>
                      {/* Desktop */}
                      <div
                        className="hidden md:flex items-center gap-2 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 opacity-60"
                        onClick={() => openTaskPanel(task.id)}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                        <button className="shrink-0" onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }}>
                          <CheckSquare className="h-4 w-4 text-green-600" />
                        </button>
                        <span className="text-sm truncate flex-1 line-through">{task.title}</span>
                        <div className="w-24 text-center text-xs text-muted-foreground">
                          {task.dueDate ? formatDate(task.dueDate) : "—"}
                        </div>
                      </div>
                      {/* Mobile */}
                      <div
                        className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b last:border-b-0 cursor-pointer opacity-60"
                        onClick={() => openTaskPanel(task.id)}
                      >
                        <button className="shrink-0" onClick={(e) => { e.stopPropagation(); handleToggleComplete(task.id, task.status); }}>
                          <CheckSquare className="h-5 w-5 text-green-600" />
                        </button>
                        <span className="text-sm line-through flex-1">{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Panel — Desktop: side panel, Mobile: sheet */}
      {/* Desktop Panel */}
      {panelOpen && selectedTask && (
        <div className="hidden md:block">
          <div className="fixed inset-0 z-40" onClick={closePanel} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-background border-l shadow-xl overflow-y-auto">
            <TaskPanelContent
              task={selectedTask}
              session={session}
              canAssign={canAssign}
              canManage={canManage}
              canEditTask={canEditTask(selectedTask)}
              isOwnerOrManager={isOwner(selectedTask) || canManage}
              allTags={tags}
              users={users}
              editMode={editMode}
              editForm={editForm}
              setEditForm={setEditForm}
              onClose={closePanel}
              onStatusChange={(s) => handleStatusChange(selectedTask.id, s)}
              onComment={handleComment}
              comment={comment}
              setComment={setComment}
              sending={sending}
              onSubtaskToggle={handleSubtaskToggle}
              onAddSubtask={handleAddSubtask}
              newSubtask={newSubtask}
              setNewSubtask={setNewSubtask}
              onEditMode={openEditMode}
              onEditSave={handleEditSave}
              actionLoading={actionLoading}
              formatRecurrence={formatRecurrence}
            />
          </div>
        </div>
      )}

      {/* Mobile Panel */}
      <Sheet open={panelOpen && !!selectedTask} onOpenChange={(open) => { if (!open) closePanel(); }}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto md:hidden p-0">
          {selectedTask && (
            <TaskPanelContent
              task={selectedTask}
              session={session}
              canAssign={canAssign}
              canManage={canManage}
              canEditTask={canEditTask(selectedTask)}
              isOwnerOrManager={isOwner(selectedTask) || canManage}
              allTags={tags}
              users={users}
              editMode={editMode}
              editForm={editForm}
              setEditForm={setEditForm}
              onClose={closePanel}
              onStatusChange={(s) => handleStatusChange(selectedTask.id, s)}
              onComment={handleComment}
              comment={comment}
              setComment={setComment}
              sending={sending}
              onSubtaskToggle={handleSubtaskToggle}
              onAddSubtask={handleAddSubtask}
              newSubtask={newSubtask}
              setNewSubtask={setNewSubtask}
              onEditMode={openEditMode}
              onEditSave={handleEditSave}
              actionLoading={actionLoading}
              formatRecurrence={formatRecurrence}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create from Template Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader><SheetTitle>New Task</SheetTitle></SheetHeader>
          <form onSubmit={handleCreateFull} className="mt-4 space-y-4">
            {templates.length > 0 && (
              <div>
                <label className="text-sm font-medium">From Template</label>
                <Select value={createForm.templateId} onValueChange={(v) => { const val = v || ""; setCreateForm((f) => ({ ...f, templateId: val })); if (val && val !== "none") applyTemplate(val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template (optional)">
                      {createForm.templateId ? templates.find((t) => t.id === createForm.templateId)?.name || "Select template" : "Select template (optional)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v || "MEDIUM" })}>
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
                <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location *</label>
              <Select value={createForm.locationId} onValueChange={(v) => setCreateForm({ ...createForm, locationId: v || "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location">
                    {locations.find((l) => l.id === createForm.locationId)?.name || "Select location"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {canAssign && (
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={createForm.assigneeId} onValueChange={(v) => setCreateForm({ ...createForm, assigneeId: v || "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned">
                      {createForm.assigneeId ? users.find((u) => u.id === createForm.assigneeId)?.name || "Select user" : "Unassigned"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((t) => (
                    <Badge key={t.id} variant={createForm.tagIds.includes(t.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setCreateForm((f) => ({ ...f, tagIds: f.tagIds.includes(t.id) ? f.tagIds.filter((x) => x !== t.id) : [...f.tagIds, t.id] }))}>
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Subtasks</label>
              {createForm.subtasks.map((st, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted px-2 py-1 rounded-md mt-1">
                  <span className="flex-1">{st}</span>
                  <button type="button" onClick={() => setCreateForm((f) => ({ ...f, subtasks: f.subtasks.filter((_, j) => j !== i) }))}><X className="h-3 w-3" /></button>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Input value={createForm.newSubtask} onChange={(e) => setCreateForm({ ...createForm, newSubtask: e.target.value })} placeholder="Add subtask..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (createForm.newSubtask.trim()) setCreateForm((f) => ({ ...f, subtasks: [...f.subtasks, f.newSubtask.trim()], newSubtask: "" })); } }} />
                <Button type="button" size="sm" variant="outline" onClick={() => { if (createForm.newSubtask.trim()) setCreateForm((f) => ({ ...f, subtasks: [...f.subtasks, f.newSubtask.trim()], newSubtask: "" })); }}>Add</Button>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={createForm.repeat} onChange={(e) => setCreateForm({ ...createForm, repeat: e.target.checked })} className="rounded" />
                <Repeat className="h-4 w-4" /><span className="text-sm font-medium">Repeat</span>
              </label>
              {createForm.repeat && (
                <div className="mt-2 space-y-2 rounded-md border p-3">
                  <Select value={createForm.recurrenceType} onValueChange={(v) => setCreateForm({ ...createForm, recurrenceType: v || "daily" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {(createForm.recurrenceType === "weekly" || createForm.recurrenceType === "biweekly") && (
                    <Select value={createForm.dayOfWeek} onValueChange={(v) => setCreateForm({ ...createForm, dayOfWeek: v || "1" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {createForm.recurrenceType === "monthly" && (
                    <Input type="number" min="1" max="28" value={createForm.dayOfMonth} onChange={(e) => setCreateForm({ ...createForm, dayOfMonth: e.target.value })} />
                  )}
                  {createForm.recurrenceType === "custom" && (
                    <Input type="number" min="1" value={createForm.interval} onChange={(e) => setCreateForm({ ...createForm, interval: e.target.value })} placeholder="Every N days" />
                  )}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !createForm.title || !createForm.locationId}>
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Detail Panel Content ──────────────────────────────
function TaskPanelContent({
  task, session, canAssign, canManage, canEditTask, isOwnerOrManager,
  allTags, users, editMode, editForm, setEditForm,
  onClose, onStatusChange, onComment, comment, setComment, sending,
  onSubtaskToggle, onAddSubtask, newSubtask, setNewSubtask,
  onEditMode, onEditSave, actionLoading, formatRecurrence,
}: {
  task: TaskDetail; session: any; canAssign: boolean; canManage: boolean;
  canEditTask: boolean; isOwnerOrManager: boolean;
  allTags: Tag[]; users: UserOption[];
  editMode: boolean; editForm: any; setEditForm: (f: any) => void;
  onClose: () => void; onStatusChange: (s: string) => void;
  onComment: () => void; comment: string; setComment: (s: string) => void; sending: boolean;
  onSubtaskToggle: (id: string, status: string) => void;
  onAddSubtask: () => void; newSubtask: string; setNewSubtask: (s: string) => void;
  onEditMode: () => void; onEditSave: () => void; actionLoading: boolean;
  formatRecurrence: (rule: any) => string;
}) {
  const isTerminal = ["completed", "missed"].includes(task.status);
  const isAssigned = task.assigneeId != null;
  const subtasksDone = task.subtasks.filter((s) => s.status === "completed").length;

  if (editMode) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Task</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div>
          <label className="text-sm font-medium">Title</label>
          <Input value={editForm.title} onChange={(e: any) => setEditForm({ ...editForm, title: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea value={editForm.description} onChange={(e: any) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Priority {isAssigned && <span className="text-xs text-muted-foreground">(locked)</span>}</label>
            <Select value={editForm.priority} onValueChange={(v: any) => setEditForm({ ...editForm, priority: v || "MEDIUM" })} disabled={isAssigned}>
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
            <Input type="date" value={editForm.dueDate} onChange={(e: any) => setEditForm({ ...editForm, dueDate: e.target.value })} />
          </div>
        </div>
        {canAssign && (
          <div>
            <label className="text-sm font-medium">Assignee</label>
            <Select value={editForm.assigneeId} onValueChange={(v: any) => setEditForm({ ...editForm, assigneeId: v || "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned">
                  {editForm.assigneeId ? users.find((u) => u.id === editForm.assigneeId)?.name || "Select" : "Unassigned"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {allTags.length > 0 && (
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {allTags.map((t) => (
                <Badge key={t.id} variant={editForm.tagIds.includes(t.id) ? "default" : "outline"} className="cursor-pointer text-xs"
                  onClick={() => setEditForm((f: any) => ({ ...f, tagIds: f.tagIds.includes(t.id) ? f.tagIds.filter((x: string) => x !== t.id) : [...f.tagIds, t.id] }))}>
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onEditSave} disabled={actionLoading}>{actionLoading ? "Saving..." : "Save"}</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {task.source === "checklist_failure" && <ClipboardCheck className="h-4 w-4 text-blue-600 shrink-0" />}
            {task.recurrenceRule && <Repeat className="h-4 w-4 text-purple-600 shrink-0" />}
            <h2 className="text-lg font-semibold">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
            <span className="text-xs text-muted-foreground">{task.locationName}</span>
            <span className="text-xs text-muted-foreground">by {task.createdByName}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {/* Status + Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {(() => {
          const s: Record<string, { label: string; bg: string; text: string }> = {
            open: { label: "Open", bg: "bg-blue-50", text: "text-blue-700" },
            in_progress: { label: "In Progress", bg: "bg-amber-50", text: "text-amber-700" },
            completed: { label: "Completed", bg: "bg-green-50", text: "text-green-700" },
            missed: { label: "Missed", bg: "bg-red-50", text: "text-red-700" },
          };
          const st = s[task.status] || s.open;
          return <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", st.bg, st.text)}>{st.label}</span>;
        })()}
        {!isTerminal && task.status === "open" && (
          <Button size="sm" variant="outline" onClick={() => onStatusChange("in_progress")} disabled={actionLoading}>
            <Play className="mr-1 h-3 w-3" />Start
          </Button>
        )}
        {!isTerminal && task.status === "in_progress" && (
          <Button size="sm" variant="outline" onClick={() => onStatusChange("completed")} disabled={actionLoading}>
            <CheckCircle2 className="mr-1 h-3 w-3" />Complete
          </Button>
        )}
        {canEditTask && !isTerminal && (
          <Button size="sm" variant="ghost" onClick={onEditMode}><Pencil className="h-3 w-3" /></Button>
        )}
      </div>

      {/* Assigned badge */}
      {task.assigneeName && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 flex items-center gap-1.5">
          <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{getInitials(task.assigneeName)}</AvatarFallback></Avatar>
          {task.assigneeId === session?.id ? "Assigned to you" : `Assigned to ${task.assigneeName}`}
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {formatDate(task.dueDate)}</span>}
        {task.completedAt && <span>Completed {formatDate(task.completedAt)}</span>}
        <span>Created {formatDate(task.createdAt)}</span>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((t) => <Badge key={t.tag.id} variant="secondary" className="text-xs">{t.tag.name}</Badge>)}
        </div>
      )}

      {/* Recurrence */}
      {task.recurrenceRule && (
        <p className="text-xs flex items-center gap-1 text-purple-600"><Repeat className="h-3 w-3" />{formatRecurrence(task.recurrenceRule)}</p>
      )}

      {/* Source */}
      {task.source === "checklist_failure" && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">From Checklist Failure</div>
      )}

      <Separator />

      {/* Subtasks */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
          <CheckSquare className="h-3.5 w-3.5" />Subtasks ({subtasksDone}/{task.subtasks.length})
        </h3>
        {task.subtasks.map((st) => (
          <div key={st.id} className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted">
            <button onClick={() => onSubtaskToggle(st.id, st.status)} className="shrink-0 touch-target" disabled={isTerminal}>
              {st.status === "completed" ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-muted-foreground" />}
            </button>
            <span className={cn("text-sm flex-1", st.status === "completed" && "line-through text-muted-foreground")}>{st.title}</span>
            {st.assigneeName && <span className="text-[11px] text-muted-foreground">{st.assigneeName}</span>}
          </div>
        ))}
        {!isTerminal && canEditTask && (
          <div className="flex gap-2 mt-1">
            <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add subtask..." className="h-8 text-sm" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddSubtask(); } }} />
            <Button size="sm" variant="ghost" onClick={onAddSubtask} disabled={!newSubtask.trim()}><Plus className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Comments */}
      <div>
        <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />Activity ({task.comments.length})
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {task.comments.map((c) => (
            <div key={c.id} className="text-sm">
              {c.statusChange ? (
                <div className="flex items-center gap-2 py-1 text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] italic">{c.content}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : (
                <div className="rounded-md bg-muted p-2">
                  <p className="text-xs">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c.userName} · {formatDateTime(c.createdAt)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {isOwnerOrManager && !isTerminal && (
          <div className="flex gap-2 mt-2">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment..." className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && onComment()} />
            <Button size="icon" className="h-8 w-8" onClick={onComment} disabled={sending || !comment.trim()}><Send className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
