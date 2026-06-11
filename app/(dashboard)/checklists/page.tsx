"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/data/status-badge";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { TaskFieldRenderer } from "@/components/forms/task-field-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle, AlertTriangle, XCircle, MessageSquare } from "lucide-react";
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
  const [tab, setTab] = useState<"open" | "missed" | "all">("open");
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
      body: JSON.stringify({ instanceId: detail.id, taskId, value }),
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

  const filtered = tab === "open"
    ? instances.filter((i) => i.status === "PENDING" || i.status === "IN_PROGRESS")
    : tab === "missed"
    ? instances.filter((i) => i.status === "MISSED")
    : instances;

  const completionMap = detail ? new Map(detail.completions.map((c: any) => [c.taskId, c])) : new Map();
  const tasks = detail?.template?.tasks || [];
  const requiredTasks = tasks.filter((t: any) => t.isRequired);
  const completedRequired = requiredTasks.filter((t: any) => completionMap.has(t.id));

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Book</h1>

      <div className="grid gap-4 md:grid-cols-[340px_1fr] h-[calc(100vh-12rem)]">
        {/* Left: Checklist list */}
        <div className="flex flex-col border rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b text-sm">
            <button
              onClick={() => setTab("open")}
              className={cn("flex-1 py-2.5 text-center transition-colors", tab === "open" ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground")}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setTab("missed")}
              className={cn("flex-1 py-2.5 text-center transition-colors", tab === "missed" ? "border-b-2 border-destructive text-destructive font-medium" : "text-muted-foreground")}
            >
              Missed ({missedCount})
            </button>
            <button
              onClick={() => setTab("all")}
              className={cn("flex-1 py-2.5 text-center transition-colors", tab === "all" ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground")}
            >
              All ({instances.length})
            </button>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {tab === "open" ? "No open checklists" : tab === "missed" ? "No missed checklists" : "No checklists for today"}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((inst) => {
                  const windowStart = inst.windowStart ? new Date(inst.windowStart) : null;
                  const windowEnd = inst.windowEnd ? new Date(inst.windowEnd) : null;
                  const isSelected = selectedId === inst.id;

                  return (
                    <button
                      key={inst.id}
                      onClick={() => setSelectedId(inst.id)}
                      className={cn(
                        "w-full text-left p-3 transition-colors hover:bg-accent",
                        isSelected && "bg-accent border-l-2 border-primary"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-medium text-sm">{inst.template.name}</span>
                          {inst.windowLabel && (
                            <span className="text-xs text-muted-foreground ml-1">({inst.windowLabel})</span>
                          )}
                        </div>
                        <StatusBadge status={inst.status} />
                      </div>
                      {inst.template.category && (
                        <Badge variant="outline" className="text-[10px] mt-1">{inst.template.category}</Badge>
                      )}
                      {windowStart && windowEnd && (
                        <p className="text-xs text-green-600 mt-1" suppressHydrationWarning>
                          {windowStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          {" - "}
                          {windowEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Checklist detail */}
        {detail ? (
          <div className="border rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-semibold text-lg">{detail.template.name}</h2>
                {detail.windowLabel && (
                  <span className="text-sm text-muted-foreground">{detail.windowLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={detail.status} />
                {detail.status === "COMPLETED" && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" /> Submitted
                  </Badge>
                )}
              </div>
            </div>

            {/* Time window */}
            {detail.windowStart && detail.windowEnd && (
              <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between" suppressHydrationWarning>
                <span className="text-sm text-red-600 font-medium">
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

            {/* Tasks */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 pb-4">
                {tasks.map((task: any) => (
                  <TaskFieldRenderer
                    key={task.id}
                    task={task}
                    completion={completionMap.get(task.id)}
                    onComplete={handleComplete}
                    saving={savingTaskId === task.id}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="border rounded-lg flex items-center justify-center text-muted-foreground">
            {instances.length === 0
              ? "No checklists for today. Assign checklists to this location in Admin → Checklists."
              : "Select a checklist to view"}
          </div>
        )}
      </div>
    </div>
  );
}
