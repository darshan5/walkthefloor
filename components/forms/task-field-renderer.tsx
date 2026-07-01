"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  taskType: string;
  config: any;
  equipmentType?: { id: string; name: string } | null;
  locationEquipment?: { instanceName: string; equipmentType: { name: string } } | null;
  isRequired: boolean;
  isCritical: boolean;
  requiresPhoto: boolean;
  helpText?: string | null;
};

type Completion = {
  id: string;
  taskId: string;
  value: any;
  isCompliant: boolean;
  completedAt: string;
};

type TaskFieldRendererProps = {
  task: Task;
  completion?: Completion;
  onComplete: (taskId: string, value: any) => Promise<void>;
  saving?: boolean;
  onAdvance?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function TaskFieldRenderer({ task, completion, onComplete, saving, onAdvance, inputRef }: TaskFieldRendererProps) {
  const isCompleted = !!completion;
  const isNonCompliant = completion && !completion.isCompliant;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isNonCompliant && "border-red-200 bg-red-50/50",
        isCompleted && completion.isCompliant && "border-green-200 bg-green-50/50",
        !isCompleted && "hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isCompleted && (
              completion.isCompliant
                ? <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
                : <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            )}
            <span className={cn("font-medium text-base", isCompleted && "text-muted-foreground")}>
              {task.title}
            </span>
            {task.isCritical && <Badge variant="destructive" className="text-xs px-1.5 py-0">Critical</Badge>}
          </div>
          {(task.locationEquipment || task.equipmentType) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {task.locationEquipment?.equipmentType?.name || task.equipmentType?.name}
            </p>
          )}
          {task.config?.min != null && task.config?.max != null && (
            <p className="text-sm text-muted-foreground">
              Range: {task.config.min}–{task.config.max}{task.config.unit ? `°${task.config.unit}` : ""}
              {task.config.target != null && ` · Target: ${task.config.target}`}
            </p>
          )}
          {task.helpText && <p className="text-sm text-muted-foreground mt-1">{task.helpText}</p>}
        </div>
        {task.requiresPhoto && (
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <Camera className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="mt-3">
        <TaskInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} inputRef={inputRef} />
      </div>

      {isNonCompliant && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          Non-compliant — Corrective Action created
        </p>
      )}
    </div>
  );
}

function TaskInput({ task, completion, onComplete, saving, onAdvance, inputRef }: TaskFieldRendererProps) {
  switch (task.taskType) {
    case "YES_NO":
      return <YesNoInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} />;
    case "TEMPERATURE":
      return <TemperatureInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} inputRef={inputRef} />;
    case "NUMERIC":
      return <NumericInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} inputRef={inputRef} />;
    case "TEXT":
      return <TextInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} inputRef={inputRef} />;
    case "SELECT":
      return <SelectInput task={task} completion={completion} onComplete={onComplete} saving={saving} onAdvance={onAdvance} />;
    default:
      return <p className="text-sm text-muted-foreground">Unsupported type: {task.taskType}</p>;
  }
}

function YesNoInput({ task, completion, onComplete, saving, onAdvance }: TaskFieldRendererProps) {
  const current = completion?.value?.answer;
  async function handleClick(answer: boolean) {
    await onComplete(task.id, { answer });
    onAdvance?.();
  }
  return (
    <div className="flex gap-2">
      <Button
        variant={current === true ? "default" : "outline"}
        size="sm"
        className="flex-1 touch-target"
        onClick={() => handleClick(true)}
        disabled={saving}
      >
        Yes
      </Button>
      <Button
        variant={current === false ? "default" : "outline"}
        size="sm"
        className="flex-1 touch-target"
        onClick={() => handleClick(false)}
        disabled={saving}
      >
        No
      </Button>
    </div>
  );
}

function TemperatureInput({ task, completion, onComplete, saving, onAdvance, inputRef }: TaskFieldRendererProps) {
  const [value, setValue] = useState(completion?.value?.temp?.toString() || "");
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;
  const unit = task.config?.unit || "F";

  async function handleSubmit() {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await onComplete(task.id, { temp: num });
    onAdvance?.();
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          placeholder={`°${unit}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="pr-8"
          disabled={saving}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          °{unit}
        </span>
      </div>
    </div>
  );
}

function NumericInput({ task, completion, onComplete, saving, onAdvance, inputRef }: TaskFieldRendererProps) {
  const [value, setValue] = useState(completion?.value?.value?.toString() || "");
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

  async function handleSubmit() {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    await onComplete(task.id, { value: num });
    onAdvance?.();
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      placeholder="Enter value"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      disabled={saving}
    />
  );
}

function TextInput({ task, completion, onComplete, saving, onAdvance, inputRef }: TaskFieldRendererProps) {
  const [value, setValue] = useState(completion?.value?.text || "");
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

  async function handleSubmit() {
    if (!value.trim()) return;
    await onComplete(task.id, { text: value });
    onAdvance?.();
  }

  return (
    <Input
      ref={ref}
      placeholder="Enter text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      disabled={saving}
    />
  );
}

function SelectInput({ task, completion, onComplete, saving, onAdvance }: TaskFieldRendererProps) {
  const choices = task.config?.choices || [];
  const current = completion?.value?.selected;

  return (
    <select
      className="w-full rounded-md border px-3 py-2 text-sm"
      value={current || ""}
      onChange={async (e) => {
        if (!e.target.value) return;
        await onComplete(task.id, { selected: e.target.value });
        onAdvance?.();
      }}
      disabled={saving}
    >
      <option value="">Select...</option>
      {choices.map((c: string) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
