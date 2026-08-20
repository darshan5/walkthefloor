"use client";

import { useEffect, useState, useRef } from "react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/data/status-badge";
import { QRCodeSVG } from "@/components/data/qr-code";
import { Wrench, MapPin, AlertTriangle, Copy, Search, DollarSign, Shield, Clock, X, Pencil, Printer, QrCode } from "lucide-react";
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [editForm, setEditForm] = useState({
    model: "", serialNumber: "", installDate: "", warrantyExpiry: "",
    purchaseCost: "", condition: "GOOD", trackingCode: "", notes: "",
  });
  const printRef = useRef<HTMLDivElement>(null);

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
      setPanelOpen(true);
      setEditMode(false);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setSelectedEquipment(null);
    setEditMode(false);
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
      trackingCode: selectedEquipment.trackingCode || "",
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
      trackingCode: editForm.trackingCode || null,
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
    if (daysLeft < 0) return { label: "Expired", color: "bg-red-50 text-red-700 border-red-200" };
    if (daysLeft <= 30) return { label: `Expiring in ${daysLeft}d`, color: "bg-amber-50 text-amber-700 border-amber-200" };
    return { label: "Active", color: "bg-green-50 text-green-700 border-green-200" };
  }

  function handlePrintBatch() {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 500);
  }

  function handlePrintSingle(eq: EquipmentDetail) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const url = `${window.location.origin}/equipment/${eq.trackingCode}`;
    printWindow.document.write(`
      <html><head><title>QR Code - ${eq.instanceName}</title>
      <style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
      .card{text-align:center;padding:24px;border:1px solid #ddd;border-radius:8px;max-width:300px}
      .name{font-size:18px;font-weight:bold;margin-top:12px}.type{color:#666;font-size:14px}
      .loc{color:#999;font-size:12px;margin-top:4px}.code{font-family:monospace;font-size:11px;color:#999;margin-top:8px}
      </style></head><body><div class="card">
      <div id="qr"></div>
      <p class="name">${eq.instanceName}</p>
      <p class="type">${eq.equipmentType.name}</p>
      <p class="loc">${eq.location.name}</p>
      <p class="code">${eq.trackingCode}</p>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
      <script>
        QRCode.toCanvas(document.createElement('canvas'),${JSON.stringify(url)},{width:200,margin:1},function(err,canvas){
          if(!err)document.getElementById('qr').appendChild(canvas);
          setTimeout(function(){window.print();window.close()},300);
        });
      </script>
      </body></html>
    `);
  }

  const filtered = instances.filter((eq) =>
    !search ||
    eq.instanceName.toLowerCase().includes(search.toLowerCase()) ||
    eq.equipmentType.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    eq.location.name.toLowerCase().includes(search.toLowerCase())
  );

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://walkthefloor.com";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Equipment & Assets</h1>
        <p className="text-sm text-muted-foreground">
          Track equipment details, maintenance history, and costs across locations.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, type, serial, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handlePrintBatch} disabled={filtered.length === 0}>
          <Printer className="mr-1 h-4 w-4" />
          Print QR Codes
        </Button>
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
                          <Badge variant="outline" className={warranty.color}>{warranty.label}</Badge>
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

      {/* Print-friendly QR batch view */}
      {printMode && (
        <div className="fixed inset-0 z-[100] bg-white p-8 overflow-auto print:static print:p-0" ref={printRef}>
          <style>{`
            @media print {
              body > *:not(.print-qr-batch) { display: none !important; }
              .print-qr-batch { display: block !important; }
            }
          `}</style>
          <div className="print-qr-batch">
            <h2 className="text-lg font-bold mb-4 print:text-base">Equipment QR Codes {selectedLocationId ? "" : "— All Locations"}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2">
              {filtered.map((eq) => (
                <div key={eq.id} className="border rounded-lg p-3 text-center break-inside-avoid">
                  {eq.trackingCode && (
                    <QRCodeSVG value={`${baseUrl}/equipment/${eq.trackingCode}`} size={120} />
                  )}
                  <p className="font-bold text-sm mt-2">{eq.instanceName}</p>
                  <p className="text-xs text-muted-foreground">{eq.equipmentType.name}</p>
                  <p className="text-xs text-muted-foreground">{eq.location.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{eq.trackingCode || "—"}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 print:hidden">
              <Button variant="outline" onClick={() => setPrintMode(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Side Panel */}
      {panelOpen && selectedEquipment && (
        <>
          <div className="fixed inset-0 z-40 md:bg-transparent bg-background/80" onClick={closePanel} />
          <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 md:w-full md:max-w-xl bg-background md:border-l md:shadow-xl overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    {selectedEquipment.instanceName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedEquipment.equipmentType.name}
                    {selectedEquipment.model ? ` · ${selectedEquipment.model}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!editMode && (
                    <Button variant="ghost" size="icon" onClick={openEdit} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={closePanel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {!editMode ? (
                <>
                  {/* QR Code */}
                  {selectedEquipment.trackingCode && (
                    <div className="rounded-lg border p-4 flex flex-col items-center gap-2">
                      <QRCodeSVG value={`${baseUrl}/equipment/${selectedEquipment.trackingCode}`} size={160} />
                      <p className="text-xs font-mono text-muted-foreground">{selectedEquipment.trackingCode}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyTrackingUrl(selectedEquipment.trackingCode!)}>
                          <Copy className="mr-1 h-3 w-3" /> Copy URL
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handlePrintSingle(selectedEquipment)}>
                          <Printer className="mr-1 h-3 w-3" /> Print
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{selectedEquipment.location.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Condition</p>
                      <Badge variant="outline" className={CONDITION_COLORS[selectedEquipment.condition || "GOOD"] || ""}>
                        {selectedEquipment.condition === "OUT_OF_SERVICE" ? "Out of Service" : selectedEquipment.condition || "GOOD"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{selectedEquipment.serialNumber || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="font-medium">{selectedEquipment.model || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Install Date</p>
                      <p className="font-medium">{selectedEquipment.installDate ? formatDate(selectedEquipment.installDate) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Cost</p>
                      <p className="font-medium">{selectedEquipment.purchaseCost != null ? `$${selectedEquipment.purchaseCost.toFixed(2)}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Warranty</p>
                      {(() => {
                        const w = getWarrantyStatus(selectedEquipment.warrantyExpiry);
                        if (!w) return <p className="font-medium">—</p>;
                        return (
                          <div>
                            <Badge variant="outline" className={w.color}>{w.label}</Badge>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(selectedEquipment.warrantyExpiry!)}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

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

                    {selectedEquipment.purchaseCost && selectedEquipment.totalActualCost > selectedEquipment.purchaseCost * 0.5 && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Consider Replacement</p>
                          <p className="text-xs text-amber-700">
                            Maintenance costs (${selectedEquipment.totalActualCost.toFixed(2)}) have exceeded{" "}
                            {Math.round(selectedEquipment.totalActualCost / selectedEquipment.purchaseCost * 100)}% of purchase price (${selectedEquipment.purchaseCost.toFixed(2)}).
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
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedEquipment.maintenanceHistory.map((wo) => (
                          <div key={wo.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                            <div>
                              <p className="font-medium">{wo.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <StatusBadge status={wo.status} />
                                <span className="text-xs text-muted-foreground">{formatDate(wo.createdAt)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {wo.actualCost != null ? (
                                <p className="font-medium">${wo.actualCost.toFixed(2)}</p>
                              ) : wo.estimatedCost != null ? (
                                <p className="text-muted-foreground text-xs">Est. ${wo.estimatedCost.toFixed(2)}</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Edit Mode */
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
                    <label className="text-sm font-medium">Tracking Code</label>
                    <Input value={editForm.trackingCode} onChange={(e) => setEditForm({ ...editForm, trackingCode: e.target.value })} placeholder="Auto-generated if empty" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
