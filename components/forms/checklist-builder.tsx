"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Pencil, Thermometer, CheckCircle, Type, Hash, List, Camera, PenTool } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  taskType: string;
  config: any;
  equipmentTypeId: string | null;
  equipmentType: { id: string; name: string; category: string | null } | null;
  scheduledTime: string | null;
  isRequired: boolean;
  isCritical: boolean;
  requiresPhoto: boolean;
  sortOrder: number;
};

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
};

type ChecklistBuilderProps = {
  templateId: string;
  tasks: Task[];
  equipmentTypes: EquipmentType[];
  onTasksChange: () => void;
};

const taskTypeIcons: Record<string, React.ElementType> = {
  YES_NO: CheckCircle,
  TEMPERATURE: Thermometer,
  NUMERIC: Hash,
  TEXT: Type,
  SELECT: List,
  MULTI_SELECT: List,
  PHOTO_ONLY: Camera,
  SIGNATURE_ONLY: PenTool,
};

const taskTypeLabels: Record<string, string> = {
  YES_NO: "Yes / No",
  TEMPERATURE: "Temperature",
  NUMERIC: "Number",
  TEXT: "Text",
  SELECT: "Select",
  MULTI_SELECT: "Multi-Select",
  PHOTO_ONLY: "Photo Only",
  SIGNATURE_ONLY: "Signature Only",
};

export function ChecklistBuilder({ templateId, tasks, equipmentTypes, onTasksChange }: ChecklistBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("YES_NO");
  const [equipmentTypeId, setEquipmentTypeId] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [isCritical, setIsCritical] = useState(false);
  const [requiresPhoto, setRequiresPhoto] = useState(false);
  const [configMin, setConfigMin] = useState("");
  const [configMax, setConfigMax] = useState("");
  const [configTarget, setConfigTarget] = useState("");
  const [configUnit, setConfigUnit] = useState("F");
  const [configExpected, setConfigExpected] = useState("no");
  const [configChoices, setConfigChoices] = useState("");

  function resetForm() {
    setTitle("");
    setTaskType("YES_NO");
    setEquipmentTypeId("");
    setScheduledTime("");
    setIsRequired(true);
    setIsCritical(false);
    setRequiresPhoto(false);
    setConfigMin("");
    setConfigMax("");
    setConfigTarget("");
    setConfigUnit("F");
    setConfigExpected("no");
    setConfigChoices("");
  }

  function openCreate() {
    setEditingTask(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setTaskType(task.taskType);
    setEquipmentTypeId(task.equipmentTypeId || "");
    setScheduledTime(task.scheduledTime || "");
    setIsRequired(task.isRequired);
    setIsCritical(task.isCritical);
    setRequiresPhoto(task.requiresPhoto);
    if (task.config) {
      setConfigMin(task.config.min?.toString() || "");
      setConfigMax(task.config.max?.toString() || "");
      setConfigTarget(task.config.target?.toString() || "");
      setConfigUnit(task.config.unit || "F");
      setConfigExpected(task.config.expectedAnswer || "no");
      setConfigChoices(task.config.choices?.join(", ") || "");
    }
    setDialogOpen(true);
  }

  function buildConfig() {
    switch (taskType) {
      case "TEMPERATURE":
      case "NUMERIC":
        return {
          ...(configMin && { min: parseFloat(configMin) }),
          ...(configMax && { max: parseFloat(configMax) }),
          ...(configTarget && { target: parseFloat(configTarget) }),
          ...(taskType === "TEMPERATURE" && { unit: configUnit }),
        };
      case "YES_NO":
        return { expectedAnswer: configExpected };
      case "SELECT":
      case "MULTI_SELECT":
        return {
          choices: configChoices.split(",").map((c) => c.trim()).filter(Boolean),
        };
      default:
        return {};
    }
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      title,
      taskType,
      config: buildConfig(),
      equipmentTypeId: equipmentTypeId || undefined,
      scheduledTime: scheduledTime || undefined,
      isRequired,
      isCritical,
      requiresPhoto,
    };

    const url = editingTask
      ? `/api/v1/checklists/${templateId}/tasks/${editingTask.id}`
      : `/api/v1/checklists/${templateId}/tasks`;
    const method = editingTask ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      toast.success(editingTask ? "Task updated" : "Task added");
      setDialogOpen(false);
      onTasksChange();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to save");
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/v1/checklists/${templateId}/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Task deleted");
      onTasksChange();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Tasks ({tasks.length})</h3>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No tasks yet. Add tasks to define what needs to be completed.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const Icon = taskTypeIcons[task.taskType] || CheckCircle;
            return (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{task.title}</span>
                      {task.isCritical && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>}
                      {task.requiresPhoto && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Photo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{taskTypeLabels[task.taskType]}</span>
                      {task.equipmentType && (
                        <>
                          <span>·</span>
                          <span>{task.equipmentType.name}</span>
                        </>
                      )}
                      {task.scheduledTime && (
                        <>
                          <span>·</span>
                          <span>@ {task.scheduledTime}</span>
                        </>
                      )}
                      {task.taskType === "TEMPERATURE" && task.config?.min != null && (
                        <>
                          <span>·</span>
                          <span>Range: {task.config.min}–{task.config.max}°{task.config.unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {/* Task Category: Equipment or Question */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setTaskType("TEMPERATURE"); setEquipmentTypeId(equipmentTypes[0]?.id || ""); }}
                  className={cn("rounded-lg border p-3 text-left transition-colors", equipmentTypeId ? "border-primary bg-primary/5" : "hover:bg-accent")}
                >
                  <p className="font-medium text-sm">Equipment</p>
                  <p className="text-xs text-muted-foreground">Temperature, calibration check</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setTaskType("YES_NO"); setEquipmentTypeId(""); }}
                  className={cn("rounded-lg border p-3 text-left transition-colors", !equipmentTypeId && taskType === "YES_NO" ? "border-primary bg-primary/5" : "hover:bg-accent")}
                >
                  <p className="font-medium text-sm">Question</p>
                  <p className="text-xs text-muted-foreground">Yes/No, text answer</p>
                </button>
              </div>
            </div>

            {/* Equipment mode */}
            {equipmentTypeId || (taskType === "TEMPERATURE" && equipmentTypes.length > 0) ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Equipment</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={equipmentTypeId} onChange={(e) => {
                    setEquipmentTypeId(e.target.value);
                    const et = equipmentTypes.find((t) => t.id === e.target.value);
                    if (et) setTitle(et.name);
                  }}>
                    <option value="">Select equipment...</option>
                    {equipmentTypes.map((et) => (
                      <option key={et.id} value={et.id}>{et.name} {et.category && `(${et.category})`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input placeholder="e.g., Walkin Freezer Temperature" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reading Type</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                    <option value="TEMPERATURE">Temperature</option>
                    <option value="NUMERIC">Numeric / Calibration</option>
                  </select>
                </div>

                {(taskType === "TEMPERATURE" || taskType === "NUMERIC") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Compliant Range</label>
                    <div className="grid grid-cols-4 gap-2">
                      <Input placeholder="Min" type="number" value={configMin} onChange={(e) => setConfigMin(e.target.value)} />
                      <Input placeholder="Max" type="number" value={configMax} onChange={(e) => setConfigMax(e.target.value)} />
                      <Input placeholder="Target" type="number" value={configTarget} onChange={(e) => setConfigTarget(e.target.value)} />
                      {taskType === "TEMPERATURE" && (
                        <select className="w-full rounded-md border px-3 py-2 text-sm" value={configUnit} onChange={(e) => setConfigUnit(e.target.value)}>
                          <option value="F">°F</option>
                          <option value="C">°C</option>
                        </select>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded" />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} className="rounded" />
                    Notification
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} className="rounded" />
                    Require Photo
                  </label>
                </div>
              </>
            ) : (
              /* Question mode */
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question</label>
                  <Input placeholder="e.g., Is equipment clean and sanitized?" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Answer Type</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                    <option value="YES_NO">Yes / No</option>
                    <option value="TEXT">Text Answer</option>
                    <option value="SELECT">Multiple Choice</option>
                  </select>
                </div>

                {taskType === "YES_NO" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expected Answer</label>
                    <select className="w-full rounded-md border px-3 py-2 text-sm" value={configExpected} onChange={(e) => setConfigExpected(e.target.value)}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <p className="text-xs text-muted-foreground">Flagged if answer doesn&apos;t match</p>
                  </div>
                )}

                {taskType === "SELECT" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Choices (comma-separated)</label>
                    <Input placeholder="Clean, Dirty, N/A" value={configChoices} onChange={(e) => setConfigChoices(e.target.value)} />
                  </div>
                )}

                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded" />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} className="rounded" />
                    Notification
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} className="rounded" />
                    Require Photo
                  </label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? "Saving..." : editingTask ? "Update" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
