"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ChecklistBuilder } from "@/components/forms/checklist-builder";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isBuiltIn: boolean;
  isActive: boolean;
  schedule: any;
  version: number;
  tasks: any[];
};

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  every_4h: "Every 4 hours",
  every_8h: "Every 8 hours",
  every_12h: "Every 12 hours",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function fetchTemplate() {
    const res = await fetch(`/api/v1/checklists/${templateId}`);
    if (res.ok) {
      const { data } = await res.json();
      setTemplate(data);
      setName(data.name);
      setDescription(data.description || "");
      setCategory(data.category || "");
      setIsActive(data.isActive);
    }
    setLoading(false);
  }

  async function fetchEquipmentTypes() {
    const res = await fetch("/api/v1/equipment-types");
    if (res.ok) {
      const { data } = await res.json();
      setEquipmentTypes(data);
    }
  }

  useEffect(() => {
    fetchTemplate();
    fetchEquipmentTypes();
  }, [templateId]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/v1/checklists/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        category: category || undefined,
        isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Template updated");
      setDirty(false);
      fetchTemplate();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Template not found</p>
        <Link href="/checklists/templates">
          <Button variant="link">Back to templates</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/checklists/templates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{frequencyLabels[template.schedule?.frequency] || template.schedule?.frequency}</span>
            <span>·</span>
            <span>v{template.version}</span>
            {template.isBuiltIn && <Badge variant="outline" className="text-xs">Built-in</Badge>}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input value={category} onChange={(e) => { setCategory(e.target.value); setDirty(true); }} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => { setIsActive(e.target.checked); setDirty(true); }}
                className="rounded"
              />
              Active
            </label>
            {dirty && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <ChecklistBuilder
        templateId={templateId}
        tasks={template.tasks}
        equipmentTypes={equipmentTypes}
        onTasksChange={fetchTemplate}
      />
    </div>
  );
}
