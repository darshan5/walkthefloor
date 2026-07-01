"use client";

import { useEffect, useState, useRef, useCallback, createRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data/status-badge";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { TaskFieldRenderer } from "@/components/forms/task-field-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Instance = {
  id: string;
  status: string;
  windowLabel: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  completedAt: string | null;
  template: { id: string; name: string; category: string | null; assignmentType: string };
  completions: any[];
  _count: { completions: number };
};

type InstanceDetail = Instance & {
  template: {
    id: string;
    name: string;
    category: string | null;
    assignmentType: string;
    tasks: any[];
  };
  location: { id: string; name: string; timezone: string };
};

export default function BookPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  async function fetchInstances() {
    const res = await fetch("/api/v1/instances");
    if (res.ok) {
      const { data } = await res.json();
      setInstances(data || []);
      if (!selectedId && data?.length > 0) {
        const firstOpen = data.find((i: Instance) => i.status === "PENDING" || i.status === "IN_PROGRESS");
        setSelectedId(firstOpen?.id || data[0].id);
      }
    }
    setLoading(false);
  }

  async function fetchDetail(id: string) {
    const res = await fetch(`/api/v1/instances/${id}`);
    if (res.ok) {
      const { data } = await res.json();
      setDetail(data);
    }
  }

  useEffect(() => { fetchInstances(); }, []);
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId]);

  async function handleComplete(taskId: string, value: any) {
    if (!detail) return;
    setSavingTaskId(taskId);
    const res = await fetch("/api/v1/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: detail.id, instanceTaskId: taskId, value }),
    });
    setSavingTaskId(null);
    if (res.ok) {
      const { data } = await res.json();
      if (!data.isCompliant) toast.warning("Non-compliant — Corrective Action created");
      fetchDetail(detail.id);
      fetchInstances();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  const openCount = instances.filter((i) => i.status === "PENDING" || i.status === "IN_PROGRESS").length;
  const missedCount = instances.filter((i) => i.status === "MISSED").length;
  const completedCount = instances.filter((i) => i.status === "COMPLETED" || i.status === "COMPLETED_LATE").length;

  const completionMap = detail ? new Map(detail.completions.map((c: any) => [c.instanceTaskId || c.taskId, c])) : new Map();
  const tasks = (detail as any)?.instanceTasks || [];
  const requiredTasks = tasks.filter((t: any) => t.isRequired);
  const completedRequired = requiredTasks.filter((t: any) => completionMap.has(t.id));

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Book</h1>

      {/* Status summary */}
      <div className="flex gap-3 text-base">
        <Badge variant="outline" className={cn("gap-1 text-sm px-3 py-1", openCount > 0 && "border-blue-300 text-blue-700")}>
          {openCount} Open
        </Badge>
        <Badge variant="outline" className={cn("gap-1 text-sm px-3 py-1", missedCount > 0 && "border-red-300 text-red-700")}>
          {missedCount} Missed
        </Badge>
        <Badge variant="outline" className={cn("gap-1 text-sm px-3 py-1", completedCount > 0 && "border-green-300 text-green-700")}>
          {completedCount} Done
        </Badge>
      </div>

      {/* Checklist selector */}
      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-lg text-muted-foreground">
            No checklists for today. Assign checklists to this location in Admin → Checklists.
          </CardContent>
        </Card>
      ) : (
        <>
          <select
            className="w-full rounded-md border px-4 py-3.5 text-base font-medium touch-target"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {instances.map((inst) => {
              const statusLabel =
                inst.status === "COMPLETED" || inst.status === "COMPLETED_LATE" ? "[Done]"
                : inst.status === "MISSED" ? "[Miss]"
                : inst.status === "PENDING" ? "[Pend]"
                : "[Open]";
              const windowEnd = inst.windowEnd ? new Date(inst.windowEnd) : null;
              const timeStr = windowEnd ? windowEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
              return (
                <option key={inst.id} value={inst.id}>
                  {statusLabel} {inst.template.name} ({inst.windowLabel}) {timeStr && `— due ${timeStr}`}
                </option>
              );
            })}
          </select>

          {/* Selected checklist detail */}
          {detail && (
            <Card>
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="text-lg font-semibold">{detail.template.name}</h2>
                    {detail.windowLabel && (
                      <span className="text-base text-muted-foreground">{detail.windowLabel}</span>
                    )}
                  </div>
                  <StatusBadge status={detail.status} />
                </div>

                {/* Time window + progress */}
                {detail.windowStart && detail.windowEnd && (
                  <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between" suppressHydrationWarning>
                    <span className="text-base text-red-600 font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {new Date(detail.windowStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {" - "}
                      {new Date(detail.windowEnd).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                    <ComplianceBar
                      value={completedRequired.length}
                      max={requiredTasks.length}
                      label={`${completedRequired.length}/${requiredTasks.length}`}
                      size="sm"
                    />
                  </div>
                )}

                {/* Completed indicator */}
                {detail.status === "COMPLETED" && (
                  <div className="px-4 py-2.5 bg-green-50 border-b flex items-center gap-2 text-green-700 text-base">
                    <CheckCircle className="h-5 w-5" />
                    Completed {detail.completedAt && new Date(detail.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                )}

                {/* Tasks */}
                <TaskList
                  tasks={tasks}
                  completionMap={completionMap}
                  onComplete={handleComplete}
                  savingTaskId={savingTaskId}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TaskList({
  tasks,
  completionMap,
  onComplete,
  savingTaskId,
}: {
  tasks: any[];
  completionMap: Map<string, any>;
  onComplete: (taskId: string, value: any) => Promise<void>;
  savingTaskId: string | null;
}) {
  const inputRefs = useRef<Map<number, React.RefObject<HTMLInputElement | null>>>(new Map());
  const taskDivRefs = useRef<Map<number, React.RefObject<HTMLDivElement | null>>>(new Map());

  function getInputRef(idx: number) {
    if (!inputRefs.current.has(idx)) inputRefs.current.set(idx, createRef());
    return inputRefs.current.get(idx)!;
  }

  function getTaskDivRef(idx: number) {
    if (!taskDivRefs.current.has(idx)) taskDivRefs.current.set(idx, createRef());
    return taskDivRefs.current.get(idx)!;
  }

  const advanceTo = useCallback((nextIdx: number) => {
    if (nextIdx >= tasks.length) return;
    const divRef = taskDivRefs.current.get(nextIdx);
    if (divRef?.current) {
      divRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      divRef.current.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => divRef.current?.classList.remove("ring-2", "ring-primary/50"), 1500);
    }
    const isMobile = "ontouchstart" in window;
    if (!isMobile) {
      setTimeout(() => {
        const ref = inputRefs.current.get(nextIdx);
        if (ref?.current) ref.current.focus();
      }, 100);
    }
  }, [tasks.length]);

  if (tasks.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground text-center py-4">
          No tasks in this checklist. Add tasks in Admin → Checklists.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {tasks.map((task: any, idx: number) => (
        <div key={task.id} ref={getTaskDivRef(idx)}>
          <TaskFieldRenderer
            task={task}
            completion={completionMap.get(task.id)}
            onComplete={onComplete}
            saving={savingTaskId === task.id}
            onAdvance={() => advanceTo(idx + 1)}
            inputRef={getInputRef(idx)}
          />
        </div>
      ))}
    </div>
  );
}
