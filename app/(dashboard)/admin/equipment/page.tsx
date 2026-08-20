"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Wrench, MapPin, AlertTriangle, Copy, Search, DollarSign, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useLocation } from "@/components/layout/location-context";

type EquipmentInstance = {
  id: string;
  instanceName: string;
  model: string | null;
  serialNumber: string | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  purchaseCost: number | null;
  condition: string | null;
  trackingCode: string | null;
  notes: string | null;
  isActive: boolean;
  equipmentType: { id: string; name: string; category: string | null };
  location: { id: string; name: string };
  _count: { workOrders: number };
};

type WorkOrderHistory = {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimatedCost: number | null;
  actualCost: number | null;
  createdAt: string;
  completedAt: string | null;
};

type EquipmentDetail = EquipmentInstance & {
  maintenanceHistory: WorkOrderHistory[];
  totalEstimatedCost: number;
  totalActualCost: number;
};

const CONDITION_COLORS: Record<string, string> = {
  GOOD: "bg-green-50 text-green-700 border-green-200",
  FAIR: "bg-yellow-50 text-yellow-700 border-yellow-200",
  POOR: "bg-orange-50 text-orange-700 border-orange-200",
  OUT_OF_SERVICE: "bg-red-50 text-red-700 border-red-200",
};

export default function EquipmentPage() {
  const { selectedLocationId } = useLocation();
  const [instances, setInstances] = useState<EquipmentInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    model: "", serialNumber: "", installDate: "", warrantyExpiry: "",
    purchaseCost: "", condition: "GOOD", notes: "",
  });

  useEffect(() => { fetchInstances(); }, [selectedLocationId]);

  async function fetchInstances() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    const res = await fetch(`/api/v1/equipment-instances?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setInstances(data || []);
    }
    setLoading(false);
  }

  async function openDetail(id: string) {
    const res = await fetch(`/api/v1/equipment-instances/${id}`);
    if (res.ok) {
      const { data } = await res.json();
      setSelectedEquipment(data);
      setDetailOpen(true);
      setEditMode(false);
    }
  }

  function openEdit() {
    if (!selectedEquipment) return;
    setEditForm({
      model: selectedEquipment.model || "",
      serialNumber: selectedEquipment.serialNumber || "",
      installDate: selectedEquipment.installDate ? selectedEquipment.installDate.split("T")[0] : "",
      warrantyExpiry: selectedEquipment.warrantyExpiry ? selectedEquipment.warrantyExpiry.split("T")[0] : "",
      purchaseCost: selectedEquipment.purchaseCost?.toString() || "",
      condition: selectedEquipment.condition || "GOOD",
      notes: selectedEquipment.notes || "",
    });
    setEditMode(true);
  }

  async function handleSave() {
    if (!selectedEquipment) return;
    setSaving(true);
    const payload: any = {
      model: editForm.model || null,
      serialNumber: editForm.serialNumber || null,
      installDate: editForm.installDate || null,
      warrantyExpiry: editForm.warrantyExpiry || null,
      purchaseCost: editForm.purchaseCost ? parseFloat(editForm.purchaseCost) : null,
      condition: editForm.condition,
      notes: editForm.notes || null,
    };
    const res = await fetch(`/api/v1/equipment-instances/${selectedEquipment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Equipment updated");
      setEditMode(false);
      openDetail(selectedEquipment.id);
      fetchInstances();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function copyTrackingUrl(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/equipment/${code}`);
    toast.success("Tracking URL copied");
  }

  function getWarrantyStatus(expiryDate: string | null): { label: string; color: string } | null {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", color: "text-red-600" };
    if (daysLeft <= 30) return { label: `Expiring in ${daysLeft} days`, color: "text-amber-600" };
    return { label: "Active", color: "text-green-600" };
  }

  const filtered = instances.filter((eq) =>
    !search ||
    eq.instanceName.toLowerCase().includes(search.toLowerCase()) ||
    eq.equipmentType.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    eq.location.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Equipment & Assets</h1>
        <p className="text-sm text-muted-foreground">
          Track equipment details, maintenance history, and costs across locations.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, type, serial, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No equipment found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead className="text-center">Work Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((eq) => {
                  const warranty = getWarrantyStatus(eq.warrantyExpiry);
                  return (
                    <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(eq.id)}>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{eq.instanceName}</span>
                          <p className="text-xs text-muted-foreground">{eq.equipmentType.name}{eq.model ? ` · ${eq.model}` : ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {eq.location.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{eq.serialNumber || "—"}</TableCell>
                      <TableCell>
                        {eq.condition && (
                          <Badge variant="outline" className={CONDITION_COLORS[eq.condition] || ""}>
                            {eq.condition === "OUT_OF_SERVICE" ? "Out of Service" : eq.condition}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {warranty ? (
                          <span className={`text-xs font-medium ${warranty.color}`}>{warranty.label}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{eq._count.workOrders}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Equipment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedEquipment && !editMode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  {selectedEquipment.instanceName}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedEquipment.equipmentType.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedEquipment.location.name}
                    </p>
                  </div>
                  {selectedEquipment.model && (
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="font-medium">{selectedEquipment.model}</p>
                    </div>
                  )}
                  {selectedEquipment.serialNumber && (
                    <div>
                      <p className="text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{selectedEquipment.serialNumber}</p>
                    </div>
                  )}
                  {selectedEquipment.installDate && (
                    <div>
                      <p className="text-muted-foreground">Install Date</p>
                      <p className="font-medium">{formatDate(selectedEquipment.installDate)}</p>
                    </div>
                  )}
                  {selectedEquipment.purchaseCost != null && (
                    <div>
                      <p className="text-muted-foreground">Purchase Cost</p>
                      <p className="font-medium">${selectedEquipment.purchaseCost.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Condition</p>
                    <Badge variant="outline" className={CONDITION_COLORS[selectedEquipment.condition || "GOOD"] || ""}>
                      {selectedEquipment.condition === "OUT_OF_SERVICE" ? "Out of Service" : selectedEquipment.condition || "GOOD"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warranty</p>
                    {(() => {
                      const w = getWarrantyStatus(selectedEquipment.warrantyExpiry);
                      if (!w) return <p className="text-muted-foreground">Not set</p>;
                      return (
                        <div>
                          <span className={`font-medium ${w.color}`}>{w.label}</span>
                          <p className="text-xs text-muted-foreground">{formatDate(selectedEquipment.warrantyExpiry!)}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Tracking Code */}
                {selectedEquipment.trackingCode && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1"><Shield className="h-3 w-3" /> Tracking Code</p>
                        <p className="text-lg font-mono font-bold mt-0.5">{selectedEquipment.trackingCode}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyTrackingUrl(selectedEquipment.trackingCode!)}>
                        <Copy className="mr-1 h-3 w-3" /> Copy URL
                      </Button>
                    </div>
                  </div>
                )}

                {selectedEquipment.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedEquipment.notes}</p>
                  </div>
                )}

                <Separator />

                {/* Maintenance Cost Summary */}
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">
                    <DollarSign className="h-4 w-4" /> Maintenance Costs
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Total Spend</p>
                        <p className="text-xl font-bold">${selectedEquipment.totalActualCost.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Work Orders</p>
                        <p className="text-xl font-bold">{selectedEquipment.maintenanceHistory.length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Repair vs Replace Warning */}
                  {selectedEquipment.purchaseCost && selectedEquipment.totalActualCost > selectedEquipment.purchaseCost * 0.5 && (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Consider Replacement</p>
                        <p className="text-xs text-amber-700">
                          Maintenance costs (${selectedEquipment.totalActualCost.toFixed(2)}) have exceeded {Math.round(selectedEquipment.totalActualCost / selectedEquipment.purchaseCost * 100)}% of purchase price (${selectedEquipment.purchaseCost.toFixed(2)}).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Maintenance History */}
                {selectedEquipment.maintenanceHistory.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">
                      <Clock className="h-4 w-4" /> Maintenance History
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedEquipment.maintenanceHistory.map((wo) => (
                        <div key={wo.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <p className="font-medium">{wo.title}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(wo.createdAt)} · {wo.status}</p>
                          </div>
                          <div className="text-right">
                            {wo.actualCost != null && (
                              <p className="font-medium">${wo.actualCost.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={openEdit}>Edit Details</Button>
                </DialogFooter>
              </div>
            </>
          )}

          {/* Edit Mode */}
          {selectedEquipment && editMode && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Equipment — {selectedEquipment.instanceName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Model</label>
                    <Input value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Serial Number</label>
                    <Input value={editForm.serialNumber} onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Install Date</label>
                    <Input type="date" value={editForm.installDate} onChange={(e) => setEditForm({ ...editForm, installDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Warranty Expiry</label>
                    <Input type="date" value={editForm.warrantyExpiry} onChange={(e) => setEditForm({ ...editForm, warrantyExpiry: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Purchase Cost</label>
                    <Input type="number" min="0" step="0.01" placeholder="$0.00" value={editForm.purchaseCost} onChange={(e) => setEditForm({ ...editForm, purchaseCost: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Condition</label>
                    <Select value={editForm.condition} onValueChange={(v) => setEditForm({ ...editForm, condition: v || "GOOD" })}>
                      <SelectTrigger>
                        <SelectValue>
                          {editForm.condition === "OUT_OF_SERVICE" ? "Out of Service" : editForm.condition}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="FAIR">Fair</SelectItem>
                        <SelectItem value="POOR">Poor</SelectItem>
                        <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
