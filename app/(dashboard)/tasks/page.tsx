"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StatusBadge } from "@/components/data/status-badge";
import {
  CheckSquare, Plus, MapPin, Clock, User, ClipboardCheck, X, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getInitials } from "@/lib/utils";
import { useLocation } from "@/components/layout/location-context";
import { cn } from "@/lib/utils";

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
  tags: { tag: { id: string; name: string } }[];
  _count: { subtasks: number; comments: number };
  subtaskTotal: number;
  subtaskCompleted: number;
  recurrenceRule: any;
};

type Counts = { open: number; inProgress: number; completed: number; overdue: number };
type Tag = { id: string; name: string };
type Template = { id: string; name: string; title: string; description: string | null; priority: string; tagIds: string[]; subtasks: { title: string }[]; recurrenceRule: any };
type UserOption = { id: string; name: string; title: string | null };

export default function TasksPage() {
  const router = useRouter();
  const { selectedLocationId, locations } = useLocation();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ open: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [session, setSession] = useState<any>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    locationId: "",
    assigneeId: "",
    dueDate: "",
    tagIds: [] as string[],
    subtasks: [] as string[],
    newSubtask: "",
    templateId: "",
    repeat: false,
    recurrenceType: "daily",
    dayOfWeek: "1",
    dayOfMonth: "1",
    interval: "7",
  });
  const [submitting, setSubmitting] = useState(false);

  const canAssign = session?.permissions?.includes("tasks.assign");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data?.user || null));
    fetch("/api/v1/tasks/tags")
      .then((r) => r.json())
      .then((data) => setTags(data?.data || []));
    fetch("/api/v1/tasks/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data?.data || []));
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchCounts();
  }, [tab, statusFilter, priorityFilter, tagFilter, selectedLocationId]);

  useEffect(() => {
    const locId = form.locationId;
    if (locId) {
      fetch(`/api/v1/users?locationId=${locId}`)
        .then((r) => r.json())
        .then((data) => setUsers(data?.data || []));
    }
  }, [form.locationId]);

  async function fetchTasks() {
    setLoading(true);
    const params = new URLSearchParams({ tab });
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
    if (tagFilter && tagFilter !== "all") params.set("tagId", tagFilter);
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    const res = await fetch(`/api/v1/tasks?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setTasks(data);
    }
    setLoading(false);
  }

  async function fetchCounts() {
    const params = new URLSearchParams();
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    const res = await fetch(`/api/v1/tasks/counts?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setCounts(data);
    }
  }

  function resetForm() {
    const defaultLoc = selectedLocationId || (locations.length === 1 ? locations[0].id : "");
    setForm({
      title: "", description: "", priority: "MEDIUM", locationId: defaultLoc,
      assigneeId: "", dueDate: "", tagIds: [], subtasks: [], newSubtask: "",
      templateId: "", repeat: false, recurrenceType: "daily",
      dayOfWeek: "1", dayOfMonth: "1", interval: "7",
    });
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setForm((f) => ({
      ...f,
      templateId,
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      tagIds: t.tagIds || [],
      subtasks: (t.subtasks || []).map((s: any) => s.title || s),
      repeat: !!t.recurrenceRule,
      recurrenceType: t.recurrenceRule?.type || "daily",
      dayOfWeek: String(t.recurrenceRule?.dayOfWeek ?? 1),
      dayOfMonth: String(t.recurrenceRule?.dayOfMonth ?? 1),
      interval: String(t.recurrenceRule?.interval ?? 7),
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const payload: any = {
      title: form.title,
      priority: form.priority,
      locationId: form.locationId,
    };
    if (form.description) payload.description = form.description;
    if (form.assigneeId) payload.assigneeId = form.assigneeId;
    if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
    if (form.tagIds.length) payload.tagIds = form.tagIds;
    if (form.subtasks.length) payload.subtasks = form.subtasks.map((t) => ({ title: t }));
    if (form.templateId) payload.templateId = form.templateId;
    if (form.repeat) {
      const rule: any = { type: form.recurrenceType };
      if (form.recurrenceType === "weekly" || form.recurrenceType === "biweekly") rule.dayOfWeek = parseInt(form.dayOfWeek);
      if (form.recurrenceType === "monthly") rule.dayOfMonth = parseInt(form.dayOfMonth);
      if (form.recurrenceType === "custom") rule.interval = parseInt(form.interval);
      payload.recurrenceRule = rule;
    }

    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Task created");
      setCreateOpen(false);
      fetchTasks();
      fetchCounts();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to create task");
    }
  }

  function addSubtask() {
    if (!form.newSubtask.trim()) return;
    setForm((f) => ({
      ...f,
      subtasks: [...f.subtasks, f.newSubtask.trim()],
      newSubtask: "",
    }));
  }

  function removeSubtask(idx: number) {
    setForm((f) => ({ ...f, subtasks: f.subtasks.filter((_, i) => i !== idx) }));
  }

  function toggleTag(tagId: string) {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter((t) => t !== tagId) : [...f.tagIds, tagId],
    }));
  }

  const kpiCards = [
    { label: "Open", count: counts.open, color: "bg-blue-500" },
    { label: "In Progress", count: counts.inProgress, color: "bg-indigo-500" },
    { label: "Completed", count: counts.completed, color: "bg-green-500" },
    { label: "Overdue", count: counts.overdue, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Tasks</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.count}</p>
              <div className={`mt-1 h-1 w-8 rounded ${kpi.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="my">My Tasks</TabsTrigger>
            {canAssign && <TabsTrigger value="assigned">Assigned by Me</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || "")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={(v) => setTagFilter(v || "")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Tag" />
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
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
            {tab === "my" ? "No tasks created by or assigned to you." : tab === "assigned" ? "No tasks assigned by you." : "No tasks found."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isAssignedToMe = task.assigneeId && task.assigneeId !== session?.id && session?.id !== task.createdById;
            return (
              <Card
                key={task.id}
                className={cn(
                  "cursor-pointer transition-shadow hover:shadow-md",
                  isAssignedToMe && "border-l-4 border-l-blue-500"
                )}
                onClick={() => router.push(`/tasks/${task.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.source === "checklist_failure" && (
                          <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        )}
                        {task.recurrenceRule && (
                          <Repeat className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        )}
                        <span className="font-medium text-sm">{task.title}</span>
                        <StatusBadge status={task.status} />
                        <Badge
                          variant={task.priority === "CRITICAL" || task.priority === "HIGH" ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.locationName}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.subtaskTotal > 0 && (
                          <span className="text-xs">
                            {task.subtaskCompleted}/{task.subtaskTotal} subtasks
                          </span>
                        )}
                        {task.tags.map((t) => (
                          <Badge key={t.tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t.tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {task.assigneeName && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                            {getInitials(task.assigneeName || "")}
                          </div>
                          <span className="text-xs text-muted-foreground">{task.assigneeName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Task Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>New Task</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            {/* Template */}
            {templates.length > 0 && (
              <div>
                <label className="text-sm font-medium">From Template</label>
                <Select value={form.templateId} onValueChange={(v) => { const val = v || ""; setForm((f) => ({ ...f, templateId: val })); if (val) applyTemplate(val); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template (optional)">
                      {form.templateId ? templates.find((t) => t.id === form.templateId)?.name || "Select template" : "Select template (optional)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v || "MEDIUM" })}>
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
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location *</label>
              <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v || "", assigneeId: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location">
                    {locations.find((l) => l.id === form.locationId)?.name || "Select location"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.locationId && (
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v || "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned (self)">
                      {form.assigneeId ? users.find((u) => u.id === form.assigneeId)?.name || "Select user" : "Unassigned (self)"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned (self)</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}{u.title ? ` (${u.title})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((t) => (
                    <Badge
                      key={t.id}
                      variant={form.tagIds.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleTag(t.id)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <label className="text-sm font-medium">Subtasks</label>
              {form.subtasks.length > 0 && (
                <div className="space-y-1 mt-1 mb-2">
                  {form.subtasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm rounded-md bg-muted px-2 py-1">
                      <span className="flex-1">{st}</span>
                      <button type="button" onClick={() => removeSubtask(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={form.newSubtask}
                  onChange={(e) => setForm({ ...form, newSubtask: e.target.value })}
                  placeholder="Add subtask..."
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                />
                <Button type="button" size="sm" variant="outline" onClick={addSubtask}>Add</Button>
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.checked })} className="rounded" />
                <Repeat className="h-4 w-4" />
                <span className="text-sm font-medium">Repeat</span>
              </label>
              {form.repeat && (
                <div className="mt-2 space-y-2 rounded-md border p-3">
                  <Select value={form.recurrenceType} onValueChange={(v) => setForm({ ...form, recurrenceType: v || "daily" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom interval</SelectItem>
                    </SelectContent>
                  </Select>
                  {(form.recurrenceType === "weekly" || form.recurrenceType === "biweekly") && (
                    <Select value={form.dayOfWeek} onValueChange={(v) => setForm({ ...form, dayOfWeek: v || "1" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {form.recurrenceType === "monthly" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Day of month</label>
                      <Input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} />
                    </div>
                  )}
                  {form.recurrenceType === "custom" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Every N days</label>
                      <Input type="number" min="1" value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !form.title || !form.locationId}>
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
