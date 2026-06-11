"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Box } from "lucide-react";
import { toast } from "sonner";

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
  organizationId: string;
  organization: { name: string };
  _count: { locationEquipment: number };
};

const CATEGORIES = ["Refrigeration", "Cooking", "Beverage", "General", "Cleaning", "HVAC", "Plumbing", "Safety"];

export default function SaasEquipmentPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchTypes() {
    const res = await fetch("/api/saas-admin/equipment-types");
    if (res.ok) setTypes((await res.json()).data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTypes(); }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory("");
    setDialogOpen(true);
  }

  function openEdit(type: EquipmentType) {
    setEditing(type);
    setName(type.name);
    setCategory(type.category || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const url = editing
      ? `/api/saas-admin/equipment-types/${editing.id}`
      : "/api/saas-admin/equipment-types";
    const method = editing ? "PATCH" : "POST";

    const body: any = { name, category: category || undefined };
    if (!editing) {
      body.organizationId = types[0]?.organizationId || "";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Updated" : "Created");
      setDialogOpen(false);
      fetchTypes();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleDelete(type: EquipmentType) {
    if (!confirm(`Delete "${type.name}"?`)) return;
    const res = await fetch(`/api/saas-admin/equipment-types/${type.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      fetchTypes();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Equipment Types</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Type
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Global equipment catalog. Tenants select from this list when configuring their locations.
      </p>

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
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : types.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No equipment types.</TableCell></TableRow>
              ) : (
                types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.organization.name}</TableCell>
                    <TableCell className="text-center">{t._count.locationEquipment}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(t)} disabled={t._count.locationEquipment > 0}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Equipment Type" : "Add Equipment Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g., Walkin Freezer" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
