"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Org = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; locations: number };
  subscription: { status: string; plan: { name: string }; trialEndsAt: string | null } | null;
};

type Plan = { id: string; name: string; slug: string };

export default function SaasAdminPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [planId, setPlanId] = useState("");

  async function fetchData() {
    const [oRes, pRes] = await Promise.all([
      fetch("/api/saas-admin/organizations"),
      fetch("/api/saas-admin/plans"),
    ]);
    if (oRes.ok) setOrgs((await oRes.json()).data || []);
    if (pRes.ok) setPlans((await pRes.json()).data || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleProvision() {
    setSaving(true);
    const res = await fetch("/api/saas-admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, adminName, adminEmail, adminPassword, planId }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Organization provisioned");
      setCreateOpen(false);
      setName(""); setSlug(""); setAdminName(""); setAdminEmail(""); setAdminPassword(""); setPlanId("");
      fetchData();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">{orgs.length} organizations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Provision Org
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Locations</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : orgs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No organizations yet.</TableCell></TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link href={`/saas-admin/organizations/${org.id}`} className="hover:underline">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{org.name}</span>
                            <p className="text-xs text-muted-foreground">{org.slug}</p>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{org.subscription?.plan.name || "—"}</TableCell>
                    <TableCell>
                      {org.subscription ? <StatusBadge status={org.subscription.status} /> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">{org._count.users}</TableCell>
                    <TableCell className="text-center">{org._count.locations}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Provision Organization</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Org Name</label>
                <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")); }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Name</label>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Email</label>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Password</label>
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                  <option value="">Select plan...</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleProvision} disabled={saving || !name || !slug || !adminName || !adminEmail || !adminPassword || !planId}>
              {saving ? "Provisioning..." : "Provision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
