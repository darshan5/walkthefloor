"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ChecklistBuilder } from "@/components/forms/checklist-builder";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  assignmentType: string;
  isBuiltIn: boolean;
  isActive: boolean;
  schedule: any;
  version: number;
  tasks: any[];
};

type EquipmentType = { id: string; name: string; category: string | null };
type Location = { id: string; name: string; storeNumber: string | null };
type Assignment = { locationId: string; location: Location };

const frequencies = [
  { value: "daily", label: "Daily" },
  { value: "every_4h", label: "Every 4 hours" },
  { value: "every_8h", label: "Every 8 hours" },
  { value: "every_12h", label: "Every 12 hours" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom interval" },
];

export default function EditTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const [template, setTemplate] = useState<Template | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [assignmentType, setAssignmentType] = useState("book");
  const [frequency, setFrequency] = useState("daily");
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
      setAssignmentType(data.assignmentType || "book");
      setFrequency(data.schedule?.frequency || "daily");
      setIsActive(data.isActive);
    }
    setLoading(false);
  }

  async function fetchAll() {
    const [eRes, lRes, aRes] = await Promise.all([
      fetch("/api/v1/equipment-types"),
      fetch("/api/v1/locations"),
      fetch(`/api/v1/checklists/${templateId}/assignments`),
    ]);
    if (eRes.ok) setEquipmentTypes((await eRes.json()).data || []);
    if (lRes.ok) setLocations((await lRes.json()).data || []);
    if (aRes.ok) setAssignments((await aRes.json()).data || []);
  }

  useEffect(() => { fetchTemplate(); fetchAll(); }, [templateId]);

  async function handleSave() {
    setSaving(true);
    const scheduleUpdate = frequency !== template?.schedule?.frequency
      ? { schedule: { ...template?.schedule, frequency } }
      : {};

    const res = await fetch(`/api/v1/checklists/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        category: category || undefined,
        assignmentType,
        isActive,
        ...scheduleUpdate,
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

  async function handleToggleLocation(locationId: string) {
    const current = assignments.map((a) => a.locationId);
    const updated = current.includes(locationId)
      ? current.filter((id) => id !== locationId)
      : [...current, locationId];

    const res = await fetch(`/api/v1/checklists/${templateId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationIds: updated }),
    });
    if (res.ok) {
      toast.success(current.includes(locationId) ? "Location removed" : "Location assigned");
      fetchAll();
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!template) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Template not found</p>
      <Link href="/checklists/templates"><Button variant="link">Back to templates</Button></Link>
    </div>
  );

  const assignedIds = new Set(assignments.map((a) => a.locationId));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/checklists/templates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={assignmentType === "book" ? "default" : "outline"}>{assignmentType === "book" ? "Book (Mandatory)" : "Task"}</Badge>
            <span>·</span>
            <span>{frequencies.find((f) => f.value === frequency)?.label || frequency}</span>
            <span>·</span>
            <span>v{template.version}</span>
            {template.isBuiltIn && <Badge variant="outline" className="text-xs">Built-in</Badge>}
          </div>
        </div>
      </div>

      {/* Details */}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={assignmentType} onChange={(e) => { setAssignmentType(e.target.value); setDirty(true); }}>
                <option value="book">Book (Mandatory)</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={frequency} onChange={(e) => { setFrequency(e.target.value); setDirty(true); }}>
                {frequencies.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => { setIsActive(e.target.checked); setDirty(true); }} className="rounded" />
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

      {/* Location Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Assigned Locations ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            This checklist will only be generated for the selected locations.
          </p>
          <div className="space-y-2">
            {locations.map((loc: any) => (
              <label key={loc.id} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent transition-colors">
                <input
                  type="checkbox"
                  checked={assignedIds.has(loc.id)}
                  onChange={() => handleToggleLocation(loc.id)}
                  className="rounded"
                />
                <span className="font-medium text-sm">{loc.name}</span>
                {loc.storeNumber && <span className="text-xs text-muted-foreground">#{loc.storeNumber}</span>}
              </label>
            ))}
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
