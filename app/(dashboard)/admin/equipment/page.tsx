"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
  _count: { locationEquipment: number; checklistTasks: number };
};

export default function EquipmentPage() {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchTypes() {
    const res = await fetch("/api/v1/equipment-types");
    if (res.ok) {
      const { data } = await res.json();
      setTypes(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTypes();
  }, []);

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
    const body = { name, category: category || undefined };
    const url = editing
      ? `/api/v1/equipment-types/${editing.id}`
      : "/api/v1/equipment-types";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Equipment type updated" : "Equipment type created");
      setDialogOpen(false);
      fetchTypes();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to save");
    }
  }

  async function handleDelete(type: EquipmentType) {
    if (!confirm(`Delete "${type.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/v1/equipment-types/${type.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Equipment type deleted");
      fetchTypes();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Types</h1>
          <p className="text-sm text-muted-foreground">
            Define equipment types for your organization. Assign them to locations in Location settings.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Locations</TableHead>
                <TableHead className="text-center">Tasks</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No equipment types yet. Click &quot;Add Type&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">{type.category || "—"}</TableCell>
                    <TableCell className="text-center">{type._count.locationEquipment}</TableCell>
                    <TableCell className="text-center">{type._count.checklistTasks}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(type)}
                          disabled={type._count.locationEquipment > 0}
                        >
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
              <Input
                placeholder="e.g., Walkin Freezer"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                <option value="Refrigeration">Refrigeration</option>
                <option value="Cooking">Cooking</option>
                <option value="Beverage">Beverage</option>
                <option value="General">General</option>
                <option value="Cleaning">Cleaning</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Safety">Safety</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
