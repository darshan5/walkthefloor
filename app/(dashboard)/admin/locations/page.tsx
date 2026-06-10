"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Pencil, Trash2, MapPin, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LocationSummary = {
  id: string;
  name: string;
  storeNumber: string | null;
  isActive: boolean;
  _count: { locationEquipment: number; homeUsers: number };
};

type LocationDetail = {
  id: string;
  name: string;
  storeNumber: string | null;
  address: string | null;
  timezone: string;
  complianceStartDate: string | null;
  isActive: boolean;
  locationEquipment: {
    id: string;
    instanceName: string;
    sortOrder: number;
    equipmentType: { id: string; name: string; category: string | null };
  }[];
};

type EquipmentType = {
  id: string;
  name: string;
  category: string | null;
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState("");
  const [newTimezone, setNewTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);
  const [equipTypes, setEquipTypes] = useState<EquipmentType[]>([]);
  const [addEquipOpen, setAddEquipOpen] = useState(false);
  const [addEquipTypeId, setAddEquipTypeId] = useState("");
  const [addEquipName, setAddEquipName] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStore, setEditStore] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTimezone, setEditTimezone] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function fetchLocations() {
    const res = await fetch("/api/v1/locations");
    if (res.ok) {
      const { data } = await res.json();
      setLocations(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchDetail(id: string) {
    const res = await fetch(`/api/v1/locations/${id}`);
    if (res.ok) {
      const { data } = await res.json();
      setDetail(data);
    }
  }

  async function fetchEquipTypes() {
    const res = await fetch("/api/v1/equipment-types");
    if (res.ok) {
      const { data } = await res.json();
      setEquipTypes(data);
    }
  }

  useEffect(() => {
    fetchLocations();
    fetchEquipTypes();
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId]);

  async function handleCreateLocation() {
    setSaving(true);
    const res = await fetch("/api/v1/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, storeNumber: newStore || undefined, timezone: newTimezone }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Location created");
      setCreateOpen(false);
      setNewName("");
      setNewStore("");
      const { data } = await res.json();
      fetchLocations();
      setSelectedId(data.id);
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleAddEquipment() {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch(`/api/v1/locations/${selectedId}/equipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentTypeId: addEquipTypeId, instanceName: addEquipName }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Equipment added");
      setAddEquipOpen(false);
      setAddEquipTypeId("");
      setAddEquipName("");
      fetchDetail(selectedId);
      fetchLocations();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function openEditLocation() {
    if (!detail) return;
    setEditName(detail.name);
    setEditStore(detail.storeNumber || "");
    setEditAddress(detail.address || "");
    setEditTimezone(detail.timezone);
    setEditActive(detail.isActive);
    setEditOpen(true);
  }

  async function handleEditLocation() {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch(`/api/v1/locations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        storeNumber: editStore || undefined,
        address: editAddress || undefined,
        timezone: editTimezone,
        isActive: editActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Location updated");
      setEditOpen(false);
      fetchDetail(selectedId);
      fetchLocations();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleUpdateHours(day: string, open: string, close: string, closed?: boolean) {
    if (!selectedId || !detail) return;
    const currentHours = (detail as any).operatingHours || {};
    const updated = { ...currentHours, [day]: closed ? { closed: true } : { open, close } };
    const res = await fetch(`/api/v1/locations/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatingHours: updated }),
    });
    if (res.ok) {
      toast.success(closed ? `${day}: Closed` : `${day} hours updated`);
      fetchDetail(selectedId);
    }
  }

  async function handleQuantityChange(equipmentTypeId: string, quantity: number) {
    if (!selectedId) return;
    const res = await fetch(`/api/v1/locations/${selectedId}/equipment/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentTypeId, quantity }),
    });
    if (res.ok) {
      fetchDetail(selectedId);
      fetchLocations();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleRemoveEquipment(equipmentId: string) {
    if (!selectedId || !confirm("Remove this equipment?")) return;
    const res = await fetch(`/api/v1/locations/${selectedId}/equipment/${equipmentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Equipment removed");
      fetchDetail(selectedId);
      fetchLocations();
    }
  }

  async function handleClone() {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch(`/api/v1/locations/${selectedId}/clone-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceLocationId: cloneSourceId }),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      toast.success(`Cloned ${data.clonedEquipment} equipment, ${data.clonedConfigs} configs`);
      setCloneOpen(false);
      fetchDetail(selectedId);
      fetchLocations();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  const selectedType = equipTypes.find((t) => t.id === addEquipTypeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Left: Location list */}
        <Card>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-2 space-y-1">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading...</p>
              ) : locations.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No locations</p>
              ) : (
                locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedId(loc.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                      selectedId === loc.id && "bg-accent font-medium"
                    )}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{loc.name}</div>
                      {loc.storeNumber && (
                        <div className="text-xs text-muted-foreground">#{loc.storeNumber}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {loc._count.locationEquipment}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right: Detail panel */}
        {detail ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{detail.name}</CardTitle>
                  {detail.storeNumber && (
                    <p className="text-sm text-muted-foreground">Store #{detail.storeNumber}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={detail.isActive ? "default" : "outline"}>
                    {detail.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEditLocation()}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="location">
                <TabsList>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="book">
                    Book ({detail.locationEquipment.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="location" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p className="text-sm">{detail.address || "Not set"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                      <p className="text-sm">{detail.timezone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Compliance Start</label>
                      <p className="text-sm">
                        {detail.complianceStartDate
                          ? new Date(detail.complianceStartDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Operating Hours</label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Checklists will only be scheduled during operating hours. Outside these hours, no instances are generated.
                    </p>
                    <div className="grid gap-2">
                      {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                        const hours = (detail as any).operatingHours?.[day];
                        const isClosed = hours?.closed === true;
                        return (
                          <div key={day} className="flex items-center gap-3 text-sm">
                            <span className={cn("w-10 font-medium capitalize", isClosed && "text-muted-foreground")}>{day}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer w-20">
                              <input
                                type="checkbox"
                                checked={isClosed}
                                onChange={(e) => handleUpdateHours(day, hours?.open || "05:00", hours?.close || "23:00", e.target.checked)}
                                className="rounded"
                              />
                              <span className="text-xs text-muted-foreground">Closed</span>
                            </label>
                            {!isClosed && (
                              <>
                                <Input
                                  type="time"
                                  className="w-28 h-8 text-xs"
                                  defaultValue={hours?.open || "05:00"}
                                  onBlur={(e) => handleUpdateHours(day, e.target.value, hours?.close || "23:00", false)}
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  className="w-28 h-8 text-xs"
                                  defaultValue={hours?.close || "23:00"}
                                  onBlur={(e) => handleUpdateHours(day, hours?.open || "05:00", e.target.value, false)}
                                />
                              </>
                            )}
                            {isClosed && <span className="text-xs text-muted-foreground italic">No checklists generated</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="book" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {detail.locationEquipment.length} equipment assigned
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)} className="gap-1">
                        <Copy className="h-3.5 w-3.5" />
                        Clone
                      </Button>
                    </div>
                  </div>

                  {/* Quantity controls per equipment type */}
                  <div className="space-y-2">
                    {equipTypes.map((et) => {
                      const count = detail.locationEquipment.filter(
                        (eq) => eq.equipmentType.id === et.id
                      ).length;
                      return (
                        <div key={et.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <span className="font-medium text-sm">{et.name}</span>
                            {et.category && (
                              <span className="text-xs text-muted-foreground ml-2">{et.category}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={count === 0}
                              onClick={() => handleQuantityChange(et.id, count - 1)}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="w-8 text-center font-mono text-sm font-medium">{count}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantityChange(et.id, count + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Instance names list */}
                  {detail.locationEquipment.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Equipment instances:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.locationEquipment.map((eq) => (
                          <Badge key={eq.id} variant="outline" className="text-xs">
                            {eq.instanceName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              Select a location to view details
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Location Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g., Main" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Store Number</label>
              <Input placeholder="e.g., 001" value={newStore} onChange={(e) => setNewStore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input value={newTimezone} onChange={(e) => setNewTimezone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateLocation} disabled={saving || !newName.trim()}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Equipment Dialog */}
      <Dialog open={addEquipOpen} onOpenChange={setAddEquipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Equipment to {detail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Equipment Type</label>
              <Select value={addEquipTypeId} onValueChange={(v: any) => {
                if (!v) return;
                setAddEquipTypeId(v);
                const t = equipTypes.find((t) => t.id === v);
                if (t) setAddEquipName(`${t.name} 1`);
              }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {equipTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.category && `(${t.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instance Name</label>
              <Input
                placeholder="e.g., Walkin Freezer 1"
                value={addEquipName}
                onChange={(e) => setAddEquipName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddEquipment} disabled={saving || !addEquipTypeId || !addEquipName.trim()}>
              {saving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Store Number</label>
                <Input value={editStore} onChange={(e) => setEditStore(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <Input value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="rounded" />
              Active
            </label>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleEditLocation} disabled={saving || !editName.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Config Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Configuration to {detail?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will copy all equipment and template window overrides from the source location.
            Existing equipment at this location will be deactivated.
          </p>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Source Location</label>
            <Select value={cloneSourceId} onValueChange={(v: any) => v && setCloneSourceId(v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {locations
                  .filter((l) => l.id !== selectedId)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l._count.locationEquipment} equipment)
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleClone} disabled={saving || !cloneSourceId}>
              {saving ? "Cloning..." : "Clone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
