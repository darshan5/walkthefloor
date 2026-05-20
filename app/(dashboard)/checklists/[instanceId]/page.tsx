"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { TaskFieldRenderer } from "@/components/forms/task-field-renderer";
import { StatusBadge } from "@/components/data/status-badge";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { cn } from "@/lib/utils";

type Instance = {
  id: string;
  status: string;
  windowLabel: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  isCompliant: boolean | null;
  completedAt: string | null;
  template: {
    id: string;
    name: string;
    category: string | null;
    tasks: any[];
  };
  location: { id: string; name: string; timezone: string };
  completions: any[];
};

export default function ChecklistExecutionPage() {
  const params = useParams();
  const instanceId = params.instanceId as string;
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const fetchInstance = useCallback(async () => {
    const res = await fetch(`/api/v1/instances/${instanceId}`);
    if (res.ok) {
      const { data } = await res.json();
      setInstance(data);
    }
    setLoading(false);
  }, [instanceId]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  async function handleComplete(taskId: string, value: any) {
    if (!instance) return;
    setSavingTaskId(taskId);

    const res = await fetch("/api/v1/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: instance.id, taskId, value }),
    });

    setSavingTaskId(null);

    if (res.ok) {
      const { data } = await res.json();
      if (!data.isCompliant) {
        toast.warning("Non-compliant reading — Corrective Action created");
      }
      fetchInstance();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to save");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  }

  if (!instance) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Checklist not found</p>
        <Link href="/checklists"><Button variant="link">Back</Button></Link>
      </div>
    );
  }

  const tasks = instance.template.tasks;
  const completionMap = new Map(instance.completions.map((c: any) => [c.taskId, c]));
  const requiredTasks = tasks.filter((t: any) => t.isRequired);
  const completedRequired = requiredTasks.filter((t: any) => completionMap.has(t.id));
  const isFinished = instance.status === "COMPLETED" || instance.status === "COMPLETED_LATE" || instance.status === "MISSED";

  const windowEndTime = instance.windowEnd ? new Date(instance.windowEnd) : null;
  const timeRemaining = windowEndTime ? windowEndTime.getTime() - Date.now() : null;
  const isUrgent = timeRemaining != null && timeRemaining > 0 && timeRemaining < 60 * 60 * 1000;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-14 z-30 -mx-4 bg-background border-b px-4 py-3 md:-mx-6 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/checklists">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold truncate">{instance.template.name}</h1>
              {instance.windowLabel && (
                <Badge variant="outline" className="text-xs shrink-0">{instance.windowLabel}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{instance.location.name}</span>
              {windowEndTime && (
                <>
                  <span>·</span>
                  <span className={cn("flex items-center gap-1", isUrgent && "text-red-600 font-medium")}>
                    <Clock className="h-3 w-3" />
                    Due by {windowEndTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </>
              )}
            </div>
          </div>
          <StatusBadge status={instance.status} />
        </div>
        <div className="mt-2">
          <ComplianceBar
            value={completedRequired.length}
            max={requiredTasks.length}
            label={`${completedRequired.length}/${requiredTasks.length}`}
            size="sm"
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3 pb-20 md:pb-4">
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

      {isFinished && (
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-sm font-medium">
              {instance.status === "COMPLETED" && "Checklist completed on time"}
              {instance.status === "COMPLETED_LATE" && "Checklist completed late"}
              {instance.status === "MISSED" && "Checklist was missed"}
            </p>
            {instance.completedAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(instance.completedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
