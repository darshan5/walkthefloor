"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/data/status-badge";
import { MapPin, Clock, Plus, Wrench, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, getInitials } from "@/lib/utils";

type WorkOrder = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  location: { id: string; name: string };
  createdBy: { id: string; name: string; title: string | null };
  assignee: { id: string; name: string; title: string | null } | null;
  vendor: { id: string; name: string; specialty: string | null } | null;
  equipment: { id: string; instanceName: string; equipmentType: { name: string } } | null;
  _count: { comments: number };
};

type Counts = {
  pendingApproval: number;
  approved: number;
  inProgress: number;
  completed: number;
};

type Location = { id: string; name: string };
type Equipment = { id: string; instanceName: string; equipmentType: { name: string } };
type UserOption = { id: string; name: string; title: string | null };
type Vendor = { id: string; name: string; specialty: string | null };

export default function MaintenancePage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [counts, setCounts] = useState<Counts>({ pendingApproval: 0, approved: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [session, setSession] = useState<any>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    locationId: "",
    equipmentId: "",
    dueDate: "",
    assignType: "user" as "user" | "vendor",
    assigneeId: "",
    vendorId: "",
    estimatedCost: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const canApprove = session?.permissions?.includes("maintenance.approve");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data?.user || null));
    fetch("/api/v1/locations")
      .then((r) => r.json())
      .then((data) => setLocations(data?.data || []));
    fetch("/api/v1/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(data?.data || []));
  }, []);

  useEffect(() => {
    fetchWorkOrders();
    fetchCounts();
  }, [tab, statusFilter, priorityFilter, locationFilter]);

  useEffect(() => {
    if (form.locationId) {
      fetch(`/api/v1/equipment?locationId=${form.locationId}`)
        .then((r) => r.json())
        .then((data) => setEquipment(data?.data || []));
      fetch(`/api/v1/users?locationId=${form.locationId}`)
        .then((r) => r.json())
        .then((data) => setUsers(data?.data || []));
    }
  }, [form.locationId]);

  async function fetchWorkOrders() {
    setLoading(true);
    const params = new URLSearchParams({ tab });
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
    if (locationFilter && locationFilter !== "all") params.set("locationId", locationFilter);
    const res = await fetch(`/api/v1/work-orders?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setWorkOrders(data);
    }
    setLoading(false);
  }

  async function fetchCounts() {
    const res = await fetch("/api/v1/work-orders/counts");
    if (res.ok) {
      const { data } = await res.json();
      setCounts(data);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload: any = {
      title: form.title,
      priority: form.priority,
      locationId: form.locationId,
    };
    if (form.description) payload.description = form.description;
    if (form.equipmentId) payload.equipmentId = form.equipmentId;
    if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
    if (canApprove) {
      if (form.assignType === "user" && form.assigneeId) payload.assigneeId = form.assigneeId;
      if (form.assignType === "vendor" && form.vendorId) payload.vendorId = form.vendorId;
      if (form.estimatedCost) payload.estimatedCost = parseFloat(form.estimatedCost);
    }

    const res = await fetch("/api/v1/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (res.ok) {
      toast.success("Work order created");
      setCreateOpen(false);
      resetForm();
      fetchWorkOrders();
      fetchCounts();
    } else {
      const { error } = await res.json();
      toast.error(error || "Failed to create work order");
    }
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      priority: "MEDIUM",
      locationId: locations.length === 1 ? locations[0].id : "",
      equipmentId: "",
      dueDate: "",
      assignType: "user",
      assigneeId: "",
      vendorId: "",
      estimatedCost: "",
    });
  }

  function openCreate() {
    resetForm();
    if (locations.length === 1) {
      setForm((f) => ({ ...f, locationId: locations[0].id }));
    }
    setCreateOpen(true);
  }

  const kpiCards = [
    { label: "Pending Approval", count: counts.pendingApproval, color: "bg-amber-500" },
    { label: "Approved", count: counts.approved, color: "bg-blue-500" },
    { label: "In Progress", count: counts.inProgress, color: "bg-indigo-500" },
    { label: "Completed", count: counts.completed, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Maintenance</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.count}</p>
              <div className={`mt-1 h-1 w-8 rounded ${kpi.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="my">My Requests</TabsTrigger>
            {canApprove && (
              <TabsTrigger value="needs_approval">
                Needs Approval
                {counts.pendingApproval > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {counts.pendingApproval}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v || "")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          {locations.length > 1 && (
            <Select value={locationFilter} onValueChange={(v) => setLocationFilter(v || "")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Work Order List */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" />
            {tab === "my"
              ? "You haven't created any work orders yet."
              : tab === "needs_approval"
                ? "No work orders pending approval."
                : "No work orders found."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {workOrders.map((wo) => (
            <Card
              key={wo.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/maintenance/${wo.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{wo.title}</span>
                      <StatusBadge status={wo.status} />
                      <Badge
                        variant={wo.priority === "CRITICAL" || wo.priority === "HIGH" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {wo.priority}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {wo.location.name}
                      </span>
                      {wo.equipment && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {wo.equipment.equipmentType.name}
                          {wo.equipment.instanceName !== wo.equipment.equipmentType.name && ` - ${wo.equipment.instanceName}`}
                        </span>
                      )}
                      <span>{formatDate(wo.createdAt)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {(wo.assignee || wo.vendor) && (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                          {wo.assignee
                            ? getInitials(wo.assignee.name)
                            : wo.vendor?.name.charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {wo.assignee?.name || wo.vendor?.name}
                        </span>
                      </div>
                    )}
                    {wo.dueDate && (
                      <p className="mt-0.5 flex items-center gap-1 justify-end text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due {formatDate(wo.dueDate)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto sm:max-w-lg sm:mx-auto">
          <SheetHeader>
            <SheetTitle>New Work Order</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Walk-in cooler not cooling"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Details about the issue..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Priority *</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v || "MEDIUM" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Location *</label>
              <Select
                value={form.locationId}
                onValueChange={(v) => setForm({ ...form, locationId: v || "", equipmentId: "", assigneeId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.locationId && equipment.length > 0 && (
              <div>
                <label className="text-sm font-medium">Equipment</label>
                <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v || "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.equipmentType.name} - {eq.instanceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assignment fields for Multi-unit Manager+ */}
            {canApprove && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Assignment (auto-approved)
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.assignType === "user" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, assignType: "user", vendorId: "" })}
                  >
                    <User className="mr-1 h-3 w-3" />
                    Internal User
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.assignType === "vendor" ? "default" : "outline"}
                    onClick={() => setForm({ ...form, assignType: "vendor", assigneeId: "" })}
                  >
                    <Building2 className="mr-1 h-3 w-3" />
                    Vendor
                  </Button>
                </div>
                {form.assignType === "user" ? (
                  <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v || "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}{u.title ? ` (${u.title})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v || "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}{v.specialty ? ` (${v.specialty})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div>
                  <label className="text-sm font-medium">Estimated Cost</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$0.00"
                    value={form.estimatedCost}
                    onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting || !form.title || !form.locationId}>
              {submitting ? "Creating..." : canApprove ? "Create & Approve" : "Submit for Approval"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
