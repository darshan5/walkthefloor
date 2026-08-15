"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Power } from "lucide-react";
import { toast } from "sonner";

type Vendor = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  notes: string | null;
  isActive: boolean;
};

const emptyForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  specialty: "",
  notes: "",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchVendors() {
    const res = await fetch("/api/v1/vendors");
    if (res.ok) {
      const { data } = await res.json();
      setVendors(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchVendors();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name,
      contactName: vendor.contactName || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      specialty: vendor.specialty || "",
      notes: vendor.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: any = { name: form.name };
    if (form.contactName) payload.contactName = form.contactName;
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone;
    if (form.specialty) payload.specialty = form.specialty;
    if (form.notes) payload.notes = form.notes;

    const url = editingId ? `/api/v1/vendors/${editingId}` : "/api/v1/vendors";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.ok) {
      toast.success(editingId ? "Vendor updated" : "Vendor created");
      setDialogOpen(false);
      fetchVendors();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function toggleActive(vendor: Vendor) {
    const res = await fetch(`/api/v1/vendors/${vendor.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(vendor.isActive ? "Vendor deactivated" : "Vendor activated");
      fetchVendors();
    }
  }

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.specialty && v.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Input
        placeholder="Search by name or specialty..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No vendors found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Contact</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{vendor.contactName || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{vendor.phone || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{vendor.email || "—"}</TableCell>
                  <TableCell>{vendor.specialty || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.isActive ? "outline" : "secondary"}>
                      {vendor.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(vendor)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(vendor)}
                        title={vendor.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Contact Name</label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Specialty</label>
                <Input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g. HVAC, Plumbing"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !form.name}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
