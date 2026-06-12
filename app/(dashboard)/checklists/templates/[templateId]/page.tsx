"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Box, Thermometer, Scale, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  categoryFilters: any[];
  version: number;
  tasks: any[];
};

type EquipmentType = { id: string; name: string; category: string | null };
type Location = { id: string; name: string; storeNumber: string | null };
type EqCategory = { id: string; name: string; checkTypes: string[]; complianceRules: any };
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
  const [eqCategories, setEqCategories] = useState<EqCategory[]>([]);
  const [catFilters, setCatFilters] = useState<any[]>([]);
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
      setCatFilters(data.categoryFilters || []);
      setIsActive(data.isActive);
    }
    setLoading(false);
  }

  async function fetchAll() {
    const [eRes, cRes, lRes, aRes] = await Promise.all([
      fetch("/api/v1/equipment-types"),
      fetch("/api/v1/equipment-categories"),
      fetch("/api/v1/locations"),
      fetch(`/api/v1/checklists/${templateId}/assignments`),
    ]);
    if (eRes.ok) setEquipmentTypes((await eRes.json()).data || []);
    if (cRes.ok) setEqCategories((await cRes.json()).data || []);
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
        categoryFilters: catFilters,
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

      {/* Equipment Categories — what equipment checks this template covers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            Equipment Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Select which equipment categories this checklist covers. At each location, tasks will be auto-generated for every piece of equipment in the selected categories.
          </p>
          {eqCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No equipment categories defined. Ask your platform administrator to set them up.</p>
          ) : (
            <div className="space-y-3">
              {eqCategories.map((cat) => {
                const filter = catFilters.find((f: any) => f.categoryId === cat.id);
                const isSelected = !!filter;
                const selectedChecks = filter?.checkTypes || [];
                const rules = cat.complianceRules as any;

                return (
                  <div key={cat.id} className={cn("rounded-lg border p-3 transition-colors", isSelected && "border-primary bg-primary/5")}>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCatFilters([...catFilters, { categoryId: cat.id, checkTypes: cat.checkTypes }]);
                          } else {
                            setCatFilters(catFilters.filter((f: any) => f.categoryId !== cat.id));
                          }
                          setDirty(true);
                        }}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{cat.name}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(cat.checkTypes as string[]).map((ct) => (
                            <Badge key={ct} variant="outline" className="text-[10px]">
                              {ct === "temperature" ? "🌡️ Temperature" : ct === "calibration" ? "⚖️ Calibration" : "✅ Yes/No"}
                            </Badge>
                          ))}
                        </div>
                        {rules.temperature && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Temp: flag if {rules.temperature.direction === "below" ? "<" : ">"} {rules.temperature.threshold ?? rules.temperature.maxTemp}°{rules.temperature.unit}
                          </p>
                        )}
                      </div>
                    </label>

                    {isSelected && (cat.checkTypes as string[]).length > 1 && (
                      <div className="mt-2 ml-7 flex flex-wrap gap-3">
                        <span className="text-xs text-muted-foreground">Include:</span>
                        {(cat.checkTypes as string[]).map((ct) => (
                          <label key={ct} className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedChecks.includes(ct)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...selectedChecks, ct]
                                  : selectedChecks.filter((c: string) => c !== ct);
                                setCatFilters(catFilters.map((f: any) =>
                                  f.categoryId === cat.id ? { ...f, checkTypes: updated } : f
                                ));
                                setDirty(true);
                              }}
                              className="rounded"
                            />
                            {ct}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
