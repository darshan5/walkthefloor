"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

type Org = { id: string; name: string; slug: string };
type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  assignmentType: string;
  isBuiltIn: boolean;
  isActive: boolean;
  schedule: any;
  organizationId: string;
  _count: { instances: number; tasks: number };
};

export default function SaasChecklistsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [assignmentType, setAssignmentType] = useState("book");
  const [frequency, setFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  async function fetchOrgs() {
    const res = await fetch("/api/saas-admin/organizations");
    if (res.ok) {
      const { data } = await res.json();
      setOrgs(data || []);
      if (data?.length > 0 && !selectedOrg) setSelectedOrg(data[0].id);
    }
  }

  async function fetchTemplates() {
    if (!selectedOrg) return;
    const res = await fetch(`/api/saas-admin/checklists?orgId=${selectedOrg}`);
    if (res.ok) {
      const { data } = await res.json();
      setTemplates(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchOrgs(); }, []);
  useEffect(() => { if (selectedOrg) { setLoading(true); fetchTemplates(); } }, [selectedOrg]);

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("");
    setAssignmentType("book");
    setFrequency("daily");
  }

  function openEdit(t: Template) {
    setEditTemplate(t);
    setName(t.name);
    setDescription(t.description || "");
    setCategory(t.category || "");
    setAssignmentType(t.assignmentType);
    setFrequency(t.schedule?.frequency || "daily");
  }

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/saas-admin/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        category: category || undefined,
        assignmentType,
        schedule: { frequency },
        isBuiltIn: true,
        organizationId: selectedOrg,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Template created");
      setCreateOpen(false);
      resetForm();
      fetchTemplates();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleUpdate() {
    if (!editTemplate) return;
    setSaving(true);
    const res = await fetch(`/api/saas-admin/checklists/${editTemplate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || null,
        category: category || null,
        assignmentType,
        schedule: { frequency },
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Template updated");
      setEditTemplate(null);
      resetForm();
      fetchTemplates();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`Delete "${t.name}"? This will remove all instances, completions, and related data. This cannot be undone.`)) return;
    const res = await fetch(`/api/saas-admin/checklists/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      fetchTemplates();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  const orgName = orgs.find((o) => o.id === selectedOrg)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Checklist Templates</h1>
        </div>
        <Button size="sm" className="gap-1" onClick={() => { resetForm(); setCreateOpen(true); }} disabled={!selectedOrg}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization</label>
        <select
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name} ({org.slug})</option>
          ))}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Templates for {orgName} ({templates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No templates for this organization.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Instances</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.isBuiltIn && <Badge variant="outline" className="text-[10px]">Built-in</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{t.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.assignmentType === "book" ? "default" : "outline"} className="text-xs">
                        {t.assignmentType === "book" ? "Book" : "Task"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.schedule?.frequency || "daily"}</TableCell>
                    <TableCell className="text-sm">{t._count.instances}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "outline"} className="text-xs">
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Temperature Log" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Food Safety" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
                  <option value="book">Book (Mandatory)</option>
                  <option value="task">Task</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="every_4h">Every 4 hours</option>
                <option value="every_8h">Every 8 hours</option>
                <option value="every_12h">Every 12 hours</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) { setEditTemplate(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
                  <option value="book">Book (Mandatory)</option>
                  <option value="task">Task</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="every_4h">Every 4 hours</option>
                <option value="every_8h">Every 8 hours</option>
                <option value="every_12h">Every 12 hours</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdate} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
