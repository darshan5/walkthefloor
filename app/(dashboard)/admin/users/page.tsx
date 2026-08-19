"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, MapPin, UserX, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  isActive: boolean;
  isConfirmed: boolean;
  userType: string;
  role: { id: string; name: string };
  manager: { id: string; name: string; title: string | null } | null;
  homeLocation: { id: string; name: string } | null;
  _count: { userLocations: number; directReports: number };
};

type Role = { id: string; name: string; _count: { users: number } };
type Location = { id: string; name: string; storeNumber: string | null };

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newManagerId, setNewManagerId] = useState("");
  const [newHomeLocationId, setNewHomeLocationId] = useState("");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editHomeLocationId, setEditHomeLocationId] = useState("");
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);

  async function fetchAll() {
    const [uRes, rRes, lRes] = await Promise.all([
      fetch("/api/v1/users"),
      fetch("/api/v1/roles"),
      fetch("/api/v1/locations"),
    ]);
    if (uRes.ok) setUsers((await uRes.json()).data || []);
    if (rRes.ok) setRoles((await rRes.json()).data || []);
    if (lRes.ok) setLocations((await lRes.json()).data || []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  const filtered = users.filter((u) =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.title?.toLowerCase().includes(search.toLowerCase()) ||
    u.role.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail || undefined,
        password: newPassword || undefined,
        title: newTitle || undefined,
        roleId: newRoleId,
        managerId: newManagerId || undefined,
        homeLocationId: newHomeLocationId || undefined,
        appAccess: ["checklists", "tasks", "maintenance", "guest_service", "documents", "support"],
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("User created");
      setCreateOpen(false);
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewTitle("");
      setNewRoleId(""); setNewManagerId(""); setNewHomeLocationId("");
      fetchAll();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email || "");
    setEditTitle(u.title || "");
    setEditRoleId(u.role.id);
    setEditManagerId(u.manager?.id || "");
    setEditHomeLocationId(u.homeLocation?.id || "");
    // Fetch assigned locations
    fetch(`/api/v1/users/${u.id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        const locs = data?.userLocations?.map((ul: any) => ul.locationId) || [];
        setEditLocationIds(locs);
      });
  }

  async function handleEdit() {
    if (!editUser) return;
    setSaving(true);

    // Update user fields
    const res = await fetch(`/api/v1/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        email: editEmail || undefined,
        title: editTitle || undefined,
        roleId: editRoleId,
        managerId: editManagerId || null,
        homeLocationId: editHomeLocationId || null,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      const { error } = await res.json();
      toast.error(error);
      return;
    }

    // Update assigned locations
    await fetch(`/api/v1/users/${editUser.id}/locations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationIds: editLocationIds }),
    });

    setSaving(false);
    toast.success("User updated");
    setEditUser(null);
    fetchAll();
  }

  async function handleDeactivate(userId: string, name: string) {
    setEditUser(null);
    const res = await fetch(`/api/v1/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${name} deactivated`);
      fetchAll();
    }
  }

  function toggleLocation(locId: string) {
    setEditLocationIds((prev) =>
      prev.includes(locId) ? prev.filter((id) => id !== locId) : [...prev, locId]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      <Input
        placeholder="Search by name, email, title, or role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Home Location</TableHead>
                <TableHead className="text-center">Locations</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className={`${!u.isActive ? "opacity-50" : ""} cursor-pointer hover:bg-muted/50`} onClick={() => openEdit(u)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.name}</span>
                            {!u.isActive && <Badge variant="destructive" className="text-[10px] px-1 py-0">Inactive</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {u.userType === "full" ? "Full Account" : "PIN Only"} · {u.role.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.manager ? (
                        <div className="text-sm">
                          <div>{u.manager.name}</div>
                          <div className="text-xs text-muted-foreground">{u.manager.title}</div>
                        </div>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell>
                      {u.homeLocation ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {u.homeLocation.name}
                        </span>
                      ) : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {(u._count.userLocations + (u.homeLocation ? 1 : 0)) || "—"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {u.isActive && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeactivate(u.id, u.name)} title="Deactivate">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input placeholder="e.g., Restaurant General Manager" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role *</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={newRoleId} onChange={(e) => setNewRoleId(e.target.value)}>
                  <option value="">Select role...</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Manager</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={newManagerId} onChange={(e) => setNewManagerId(e.target.value)}>
                  <option value="">None</option>
                  {users.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.name})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Home Location</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={newHomeLocationId} onChange={(e) => setNewHomeLocationId(e.target.value)}>
                <option value="">None</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.storeNumber ? ` #${l.storeNumber}` : ""}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !newName.trim() || !newRoleId}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role *</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Manager</label>
                  <select className="w-full rounded-md border px-3 py-2 text-sm" value={editManagerId} onChange={(e) => setEditManagerId(e.target.value)}>
                    <option value="">None</option>
                    {users.filter((u) => u.isActive && u.id !== editUser.id).map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role.name})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Home Location</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={editHomeLocationId} onChange={(e) => setEditHomeLocationId(e.target.value)}>
                  <option value="">None</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.storeNumber ? ` #${l.storeNumber}` : ""}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned Locations</label>
                <p className="text-xs text-muted-foreground">Select locations this user can access (in addition to home location)</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                        editLocationIds.includes(loc.id)
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        editLocationIds.includes(loc.id) ? "border-primary bg-primary text-primary-foreground" : ""
                      }`}>
                        {editLocationIds.includes(loc.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{loc.name}</span>
                      {loc.storeNumber && <span className="text-xs text-muted-foreground">#{loc.storeNumber}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {editUser.isActive && (
                <div className="border-t pt-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeactivate(editUser.id, editUser.name)}
                  >
                    <UserX className="mr-1 h-3 w-3" /> Deactivate User
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim() || !editRoleId}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
