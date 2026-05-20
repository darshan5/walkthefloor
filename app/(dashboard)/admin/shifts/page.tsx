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
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchShifts() {
    const res = await fetch("/api/v1/shifts");
    if (res.ok) {
      const { data } = await res.json();
      setShifts(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchShifts();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setStartTime("");
    setEndTime("");
    setDialogOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditing(shift);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = { name, startTime, endTime };
    const url = editing ? `/api/v1/shifts/${editing.id}` : "/api/v1/shifts";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      toast.success(editing ? "Shift updated" : "Shift created");
      setDialogOpen(false);
      fetchShifts();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to save");
    }
  }

  async function handleDelete(shift: Shift) {
    if (!confirm(`Delete "${shift.name}" shift?`)) return;
    const res = await fetch(`/api/v1/shifts/${shift.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Shift deleted");
      fetchShifts();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to delete");
    }
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-sm text-muted-foreground">
            Define shift schedules. Compliance windows and checklist instances are generated based on these shifts.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Shift
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
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
              ) : shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No shifts defined. Click &quot;Add Shift&quot; to create one.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => {
                  const [sh, sm] = shift.startTime.split(":").map(Number);
                  const [eh, em] = shift.endTime.split(":").map(Number);
                  let hours = eh - sh;
                  if (hours < 0) hours += 24;
                  return (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shift.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(shift.startTime)}</TableCell>
                      <TableCell>{formatTime(shift.endTime)}</TableCell>
                      <TableCell className="text-muted-foreground">{hours}h</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(shift)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(shift)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Shift" : "Add Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., AM"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !startTime || !endTime}
            >
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
