"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { ArrowLeft, Key, Webhook, Pause, Play, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  users: { id: string; name: string; email: string | null; title: string | null; isActive: boolean; role: { name: string } }[];
  locations: { id: string; name: string; storeNumber: string | null; isActive: boolean }[];
  subscription: { status: string; plan: { name: string }; trialEndsAt: string | null } | null;
  webhooks: { id: string; channel: string; secret: string; isActive: boolean; lastReceivedAt: string | null }[];
  apiKeys: { id: string; name: string; keyPrefix: string; scopes: string[]; isActive: boolean; lastUsedAt: string | null; createdAt: string }[];
};

export default function OrgDetailPage() {
  const { orgId } = useParams() as { orgId: string };
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newChannel, setNewChannel] = useState("complaints");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function fetchOrg() {
    const res = await fetch(`/api/saas-admin/organizations/${orgId}`);
    if (res.ok) setOrg((await res.json()).data);
    setLoading(false);
  }

  useEffect(() => { fetchOrg(); }, [orgId]);

  async function handleSuspend() {
    if (!confirm("Suspend this organization? Users will not be able to log in.")) return;
    await fetch(`/api/saas-admin/organizations/${orgId}/suspend`, { method: "POST" });
    toast.success("Organization suspended");
    fetchOrg();
  }

  async function handleReactivate() {
    await fetch(`/api/saas-admin/organizations/${orgId}/reactivate`, { method: "POST" });
    toast.success("Organization reactivated");
    fetchOrg();
  }

  async function handleCreateWebhook() {
    setSaving(true);
    const res = await fetch(`/api/saas-admin/organizations/${orgId}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: newChannel }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Webhook endpoint created");
      setWebhookOpen(false);
      fetchOrg();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleCreateApiKey() {
    setSaving(true);
    const res = await fetch(`/api/saas-admin/organizations/${orgId}/api-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newKeyName,
        scopes: ["checklists.read", "completions.read", "corrective-actions.read", "temperature.read", "reports.read"],
      }),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      setCreatedKey(data.rawKey);
      toast.success("API key created — copy it now, it won't be shown again");
      fetchOrg();
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm("Revoke this API key?")) return;
    await fetch(`/api/saas-admin/organizations/${orgId}/api-keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    toast.success("API key revoked");
    fetchOrg();
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!org) return <div className="text-center py-8 text-muted-foreground">Organization not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/saas-admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-muted-foreground">{org.slug}</p>
        </div>
        {org.subscription?.status === "SUSPENDED" ? (
          <Button onClick={handleReactivate} className="gap-2"><Play className="h-4 w-4" />Reactivate</Button>
        ) : (
          <Button variant="destructive" onClick={handleSuspend} className="gap-2"><Pause className="h-4 w-4" />Suspend</Button>
        )}
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Plan</p><p className="text-xl font-bold">{org.subscription?.plan.name || "None"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Status</p><div className="mt-1">{org.subscription ? <StatusBadge status={org.subscription.status} /> : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Users</p><p className="text-xl font-bold">{org.users.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Locations</p><p className="text-xl font-bold">{org.locations.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="users">Users ({org.users.length})</TabsTrigger>
          <TabsTrigger value="locations">Locations ({org.locations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Webhooks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Webhook className="h-4 w-4" />Webhook Endpoints</CardTitle>
                <Button size="sm" onClick={() => setWebhookOpen(true)}>Add Endpoint</Button>
              </div>
            </CardHeader>
            <CardContent>
              {org.webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No webhook endpoints configured.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>URL</TableHead><TableHead>Secret</TableHead><TableHead>Last Received</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {org.webhooks.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell><Badge variant="outline">{wh.channel}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">/api/webhooks/{org.slug}/{wh.channel}</TableCell>
                        <TableCell className="font-mono text-xs">{wh.secret.substring(0, 8)}...</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{wh.lastReceivedAt ? formatDateTime(wh.lastReceivedAt) : "Never"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />API Keys</CardTitle>
                <Button size="sm" onClick={() => { setApiKeyOpen(true); setCreatedKey(null); setNewKeyName(""); }}>Generate Key</Button>
              </div>
            </CardHeader>
            <CardContent>
              {org.apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys generated.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Prefix</TableHead><TableHead>Status</TableHead><TableHead>Last Used</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
                  <TableBody>
                    {org.apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="font-mono text-xs">{key.keyPrefix}...</TableCell>
                        <TableCell><StatusBadge status={key.isActive ? "ACTIVE" : "CANCELED"} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Never"}</TableCell>
                        <TableCell>
                          {key.isActive && (
                            <Button variant="ghost" size="sm" onClick={() => handleRevokeKey(key.id)}>Revoke</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {org.users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "PIN only"}</TableCell>
                    <TableCell>{u.role.name}</TableCell>
                    <TableCell><StatusBadge status={u.isActive ? "ACTIVE" : "CANCELED"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Store #</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {org.locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.storeNumber || "—"}</TableCell>
                    <TableCell><StatusBadge status={l.isActive ? "ACTIVE" : "CANCELED"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Dialog */}
      <Dialog open={webhookOpen} onOpenChange={setWebhookOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Webhook Endpoint</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={newChannel} onChange={(e) => setNewChannel(e.target.value)}>
                <option value="complaints">Complaints</option>
                <option value="sales">Sales</option>
                <option value="generic">Generic</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              URL: <span className="font-mono">/api/webhooks/{org.slug}/{newChannel}</span>
            </p>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreateWebhook} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={apiKeyOpen} onOpenChange={setApiKeyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{createdKey ? "API Key Created" : "Generate API Key"}</DialogTitle></DialogHeader>
          {createdKey ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-destructive font-medium">Copy this key now — it will not be shown again.</p>
              <div className="flex gap-2">
                <Input value={createdKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Key Name</label>
                <Input placeholder="e.g., POS Integration" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Key will have read-only access to checklists, completions, CAs, temperature, and reports.</p>
            </div>
          )}
          <DialogFooter>
            {createdKey ? (
              <Button onClick={() => setApiKeyOpen(false)}>Done</Button>
            ) : (
              <>
                <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreateApiKey} disabled={saving || !newKeyName.trim()}>{saving ? "Generating..." : "Generate"}</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
