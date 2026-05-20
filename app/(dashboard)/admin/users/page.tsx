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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, MapPin, UserX } from "lucide-react";
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
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newManagerId, setNewManagerId] = useState("");
  const [newHomeLocationId, setNewHomeLocationId] = useState("");

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
        appAccess: ["checklists", "documents", "support"],
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

  async function handleDeactivate(userId: string, name: string) {
    if (!confirm(`Deactivate ${name}? Their PIN will be cleared and they won't be able to log in.`)) return;
    const res = await fetch(`/api/v1/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deactivated");
      fetchAll();
    }
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
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{u.name}</span>
                            {u.isConfirmed && <Badge variant="outline" className="text-[10px] px-1 py-0">Confirmed</Badge>}
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
                      {u._count.userLocations > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          +{u._count.userLocations} assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {(u._count.userLocations + (u.homeLocation ? 1 : 0)) || "—"}
                    </TableCell>
                    <TableCell>
                      {u.isActive && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivate(u.id, u.name)} title="Deactivate">
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
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
                <Select value={newRoleId} onValueChange={(v: any) => v && setNewRoleId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Manager</label>
                <Select value={newManagerId || "none"} onValueChange={(v: any) => setNewManagerId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {users.filter((u) => u.isActive).map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.role.name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Home Location</label>
              <Select value={newHomeLocationId || "none"} onValueChange={(v: any) => setNewHomeLocationId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
    </div>
  );
}
