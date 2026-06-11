"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Box, Thermometer, Scale, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  checkTypes: string[];
  complianceRules: any;
  _count: { equipmentTypes: number };
};

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
  categoryId: string | null;
  organizationId: string;
  organization: { name: string };
  _count: { locationEquipment: number };
};

const CHECK_TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  temperature: { label: "Temperature", icon: Thermometer },
  calibration: { label: "Calibration", icon: Scale },
  yes_no: { label: "Yes/No", icon: CheckCircle },
};

export default function SaasEquipmentPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Category dialog
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catChecks, setCatChecks] = useState<string[]>([]);
  const [tempMax, setTempMax] = useState("");
  const [tempUnit, setTempUnit] = useState("F");
  const [calTarget, setCalTarget] = useState("");
  const [calTolerance, setCalTolerance] = useState("");
  const [calUnit, setCalUnit] = useState("g");
  const [saving, setSaving] = useState(false);

  // Type dialog
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeCatId, setTypeCatId] = useState("");

  async function fetchAll() {
    const [cRes, tRes] = await Promise.all([
      fetch("/api/saas-admin/equipment-categories"),
      fetch("/api/saas-admin/equipment-types"),
    ]);
    if (cRes.ok) setCategories((await cRes.json()).data || []);
    if (tRes.ok) setTypes((await tRes.json()).data || []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  // Category handlers
  function openCreateCat() {
    setEditingCat(null);
    setCatName(""); setCatChecks(["temperature"]); setTempMax(""); setTempUnit("F");
    setCalTarget(""); setCalTolerance(""); setCalUnit("g");
    setCatOpen(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatChecks(cat.checkTypes || []);
    const rules = cat.complianceRules || {};
    setTempMax(rules.temperature?.maxTemp?.toString() || "");
    setTempUnit(rules.temperature?.unit || "F");
    setCalTarget(rules.calibration?.target?.toString() || "");
    setCalTolerance(rules.calibration?.tolerance?.toString() || "");
    setCalUnit(rules.calibration?.unit || "g");
    setCatOpen(true);
  }

  async function handleSaveCat() {
    setSaving(true);
    const complianceRules: any = {};
    if (catChecks.includes("temperature") && tempMax) {
      complianceRules.temperature = { maxTemp: parseFloat(tempMax), unit: tempUnit, label: "Temperature" };
    }
    if (catChecks.includes("calibration") && calTarget) {
      complianceRules.calibration = { target: parseFloat(calTarget), tolerance: parseFloat(calTolerance) || 1, unit: calUnit, label: "Calibration" };
    }

    const url = editingCat ? `/api/saas-admin/equipment-categories/${editingCat.id}` : "/api/saas-admin/equipment-categories";
    const res = await fetch(url, {
      method: editingCat ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName, checkTypes: catChecks, complianceRules }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editingCat ? "Category updated" : "Category created");
      setCatOpen(false);
      fetchAll();
    } else {
      toast.error((await res.json()).error);
    }
  }

  async function handleDeleteCat(cat: Category) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const res = await fetch(`/api/saas-admin/equipment-categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchAll(); }
    else toast.error((await res.json()).error);
  }

  // Type handlers
  function openCreateType() {
    setEditingType(null); setTypeName(""); setTypeCatId(""); setTypeOpen(true);
  }

  function openEditType(t: EquipmentType) {
    setEditingType(t); setTypeName(t.name); setTypeCatId(t.categoryId || ""); setTypeOpen(true);
  }

  async function handleSaveType() {
    setSaving(true);
    const cat = categories.find((c) => c.id === typeCatId);
    const body: any = { name: typeName, categoryId: typeCatId || undefined, category: cat?.name || undefined };
    if (!editingType) body.organizationId = types[0]?.organizationId || "";

    const url = editingType ? `/api/saas-admin/equipment-types/${editingType.id}` : "/api/saas-admin/equipment-types";
    const res = await fetch(url, {
      method: editingType ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { toast.success(editingType ? "Updated" : "Created"); setTypeOpen(false); fetchAll(); }
    else toast.error((await res.json()).error);
  }

  async function handleDeleteType(t: EquipmentType) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const res = await fetch(`/api/saas-admin/equipment-types/${t.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchAll(); }
    else toast.error((await res.json()).error);
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Box className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Equipment Management</h1>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="types">Equipment Types ({types.length})</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Categories define what checks are required and their compliance thresholds.
            </p>
            <Button onClick={openCreateCat} className="gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{cat._count.equipmentTypes} equipment types</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCat(cat)} disabled={cat._count.equipmentTypes > 0}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(cat.checkTypes as string[]).map((ct) => {
                      const info = CHECK_TYPE_LABELS[ct];
                      const Icon = info?.icon || CheckCircle;
                      return (
                        <Badge key={ct} variant="outline" className="text-xs gap-1">
                          <Icon className="h-3 w-3" /> {info?.label || ct}
                        </Badge>
                      );
                    })}
                  </div>
                  {cat.complianceRules && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {(cat.complianceRules as any).temperature && (
                        <p>Temp: flag if &gt; {(cat.complianceRules as any).temperature.maxTemp}°{(cat.complianceRules as any).temperature.unit}</p>
                      )}
                      {(cat.complianceRules as any).calibration && (
                        <p>Calibration: target {(cat.complianceRules as any).calibration.target}{(cat.complianceRules as any).calibration.unit} ±{(cat.complianceRules as any).calibration.tolerance}{(cat.complianceRules as any).calibration.unit}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <div className="col-span-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No categories yet. Create categories to define compliance rules for equipment.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Equipment types that tenants assign to their locations.</p>
            <Button onClick={openCreateType} className="gap-2"><Plus className="h-4 w-4" /> Add Type</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-center">In Use</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.organization.name}</TableCell>
                      <TableCell className="text-center">{t._count.locationEquipment}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditType(t)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteType(t)} disabled={t._count.locationEquipment > 0}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Equipment Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <Input placeholder="e.g., Freezer" value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Check Types</label>
              <div className="flex flex-wrap gap-3">
                {Object.entries(CHECK_TYPE_LABELS).map(([key, { label }]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catChecks.includes(key)}
                      onChange={(e) => setCatChecks(e.target.checked ? [...catChecks, key] : catChecks.filter((c) => c !== key))}
                      className="rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {catChecks.includes("temperature") && (
              <div className="rounded-lg border p-3 space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Thermometer className="h-4 w-4" /> Temperature Rule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Flag if above</label>
                    <Input type="number" placeholder="e.g., 0" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <select className="w-full rounded-md border px-3 py-2 text-sm" value={tempUnit} onChange={(e) => setTempUnit(e.target.value)}>
                      <option value="F">°F</option>
                      <option value="C">°C</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {catChecks.includes("calibration") && (
              <div className="rounded-lg border p-3 space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Scale className="h-4 w-4" /> Calibration Rule
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Target</label>
                    <Input type="number" placeholder="e.g., 25" value={calTarget} onChange={(e) => setCalTarget(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tolerance ±</label>
                    <Input type="number" step="0.1" placeholder="e.g., 1" value={calTolerance} onChange={(e) => setCalTolerance(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <Input placeholder="e.g., g" value={calUnit} onChange={(e) => setCalUnit(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Flag if reading is not within target ± tolerance</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveCat} disabled={saving || !catName.trim() || catChecks.length === 0}>
              {saving ? "Saving..." : editingCat ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Type Dialog */}
      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Equipment Type" : "Add Equipment Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g., Walkin Freezer" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={typeCatId} onChange={(e) => setTypeCatId(e.target.value)}>
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {typeCatId && (() => {
                const cat = categories.find((c) => c.id === typeCatId);
                if (!cat) return null;
                return (
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    <p>Checks: {(cat.checkTypes as string[]).join(", ")}</p>
                    {(cat.complianceRules as any).temperature && (
                      <p>Temp: flag if &gt; {(cat.complianceRules as any).temperature.maxTemp}°{(cat.complianceRules as any).temperature.unit}</p>
                    )}
                    {(cat.complianceRules as any).calibration && (
                      <p>Cal: {(cat.complianceRules as any).calibration.target} ±{(cat.complianceRules as any).calibration.tolerance}{(cat.complianceRules as any).calibration.unit}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveType} disabled={saving || !typeName.trim()}>
              {saving ? "Saving..." : editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
