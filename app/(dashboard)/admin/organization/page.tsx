"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { Building2, Users, MapPin, Box, Trash2, Plus, X, RefreshCw, Pencil, Repeat } from "lucide-react";
import { toast } from "sonner";

type OrgData = {
  id: string;
  name: string;
  slug: string;
  settings: any;
  _count: { users: number; locations: number; equipmentTypes: number };
};

export default function OrganizationPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [taskExpiry, setTaskExpiry] = useState("15");
  const [dailyEmails, setDailyEmails] = useState(false);
  const [defaultDueDays, setDefaultDueDays] = useState("2");
  const [retakeOnCA, setRetakeOnCA] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [compEarly, setCompEarly] = useState("");
  const [compLate, setCompLate] = useState("");
  const [infoTags, setInfoTags] = useState<{ id: string; name: string }[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [gsConfig, setGsConfig] = useState<{ isEnabled: boolean; hasApiKey: boolean; lastSyncAt: string | null; lastSyncError: string | null } | null>(null);
  const [gsApiKey, setGsApiKey] = useState("");
  const [gsEnabled, setGsEnabled] = useState(false);
  const [gsSaving, setGsSaving] = useState(false);
  const [gsSyncing, setGsSyncing] = useState(false);
  const [gsTestResult, setGsTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [taskTags, setTaskTags] = useState<{ id: string; name: string }[]>([]);
  const [newTaskTagName, setNewTaskTagName] = useState("");
  const [taskTagSaving, setTaskTagSaving] = useState(false);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", title: "", description: "", priority: "MEDIUM", tagIds: [] as string[], subtasks: [] as string[], newSubtask: "", repeat: false, recurrenceType: "daily", dayOfWeek: "1", dayOfMonth: "1", interval: "7" });
  const [templateSaving, setTemplateSaving] = useState(false);

  async function fetchOrg() {
    const res = await fetch("/api/v1/organization");
    if (res.ok) {
      const { data } = await res.json();
      setOrg(data);
      setOrgName(data.name);
      const s = data.settings || {};
      const book = s.book || {};
      setTaskExpiry(String(book.taskExpiryMinutes ?? 15));
      setDailyEmails(book.sendDailySummaryEmails ?? false);
      setDefaultDueDays(String(book.ca?.defaultDueDays ?? 2));
      setRetakeOnCA(book.ca?.retakeReadingOnCA ?? false);
      setTimezone(s.general?.timezone ?? "America/New_York");
      const comp = s.compliance || {};
      setCompEarly(comp.earlyMinutes !== undefined ? String(comp.earlyMinutes) : "");
      setCompLate(comp.lateMinutes !== undefined ? String(comp.lateMinutes) : "");
    }
    setLoading(false);
  }

  async function fetchTags() {
    const res = await fetch("/api/v1/info/tags");
    if (res.ok) {
      const { data } = await res.json();
      setInfoTags(data || []);
    }
  }

  async function fetchGsConfig() {
    const res = await fetch("/api/v1/guest-service/config");
    if (res.ok) {
      const { data } = await res.json();
      setGsConfig(data);
      setGsEnabled(data.isEnabled);
    }
  }

  async function fetchTaskTags() {
    const res = await fetch("/api/v1/tasks/tags");
    if (res.ok) {
      const { data } = await res.json();
      setTaskTags(data || []);
    }
  }

  async function fetchTaskTemplates() {
    const res = await fetch("/api/v1/tasks/templates");
    if (res.ok) {
      const { data } = await res.json();
      setTaskTemplates(data || []);
    }
  }

  useEffect(() => { fetchOrg(); fetchTags(); fetchGsConfig(); fetchTaskTags(); fetchTaskTemplates(); }, []);

  async function handleSaveGeneral() {
    setSaving(true);
    const res = await fetch("/api/v1/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgName,
        settings: { general: { timezone } },
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Organization updated");
      fetchOrg();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleSaveBook() {
    setSaving(true);
    const res = await fetch("/api/v1/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          book: {
            taskExpiryMinutes: parseInt(taskExpiry) || 15,
            sendDailySummaryEmails: dailyEmails,
            ca: {
              defaultDueDays: parseInt(defaultDueDays) || 2,
              retakeReadingOnCA: retakeOnCA,
            },
          },
        },
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Book settings saved");
      fetchOrg();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!org) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Organization Settings</h1>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{org._count.users}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{org._count.locations}</p>
              <p className="text-xs text-muted-foreground">Locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Box className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{org._count.equipmentTypes}</p>
              <p className="text-xs text-muted-foreground">Equipment Types</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="book">Book / Checklists</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="guest-service">Guest Service</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-base">Organization Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input value={org.slug} disabled className="text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Timezone</label>
                <select className="w-full rounded-md border px-3 py-2 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="America/New_York">Eastern (ET) — America/New_York</option>
                  <option value="America/Chicago">Central (CT) — America/Chicago</option>
                  <option value="America/Denver">Mountain (MT) — America/Denver</option>
                  <option value="America/Los_Angeles">Pacific (PT) — America/Los_Angeles</option>
                  <option value="America/Anchorage">Alaska (AKT) — America/Anchorage</option>
                  <option value="Pacific/Honolulu">Hawaii (HT) — Pacific/Honolulu</option>
                  <option value="America/Phoenix">Arizona (no DST) — America/Phoenix</option>
                  <option value="America/Puerto_Rico">Atlantic (AST) — America/Puerto_Rico</option>
                </select>
                <p className="text-xs text-muted-foreground">Used as the default for new locations</p>
              </div>
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving ? "Saving..." : "Save General Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="book">
          <Card>
            <CardHeader><CardTitle className="text-base">Book / Checklist Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Task Expiration</label>
                <select
                  className="w-48 rounded-md border px-3 py-2 text-sm"
                  value={taskExpiry}
                  onChange={(e) => setTaskExpiry(e.target.value)}
                >
                  <option value="60">1 Hour</option>
                  <option value="1440">1 Day (24 hours)</option>
                  <option value="10080">1 Week (7 days)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  How long after the compliance window opens before an incomplete checklist is marked as missed
                </p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={dailyEmails} onChange={(e) => setDailyEmails(e.target.checked)} className="rounded" />
                  <div>
                    <p className="text-sm font-medium">Send Daily Book Task Summary Emails</p>
                    <p className="text-xs text-muted-foreground">Email managers a summary of the day&apos;s checklist compliance</p>
                  </div>
                </label>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Corrective Action Settings</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Due Days for Corrective Action</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={defaultDueDays}
                      onChange={(e) => setDefaultDueDays(e.target.value)}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">Number of days until a CA is due after creation</p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={retakeOnCA} onChange={(e) => setRetakeOnCA(e.target.checked)} className="rounded" />
                    <div>
                      <p className="text-sm font-medium">Re-Take Reading If CA Is Generated</p>
                      <p className="text-xs text-muted-foreground">Prompt the user to re-record the reading when a non-compliant value triggers a corrective action</p>
                    </div>
                  </label>
                </div>
              </div>

              <Button onClick={handleSaveBook} disabled={saving}>
                {saving ? "Saving..." : "Save Book Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader><CardTitle className="text-base">Compliance Window Override</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Override the platform default compliance windows for your organization. Leave as &quot;Use platform default&quot; to inherit the SaaS-level setting.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Early Window</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={compEarly}
                    onChange={(e) => setCompEarly(e.target.value)}
                  >
                    <option value="">Use platform default</option>
                    <option value="0">No early window</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                  <p className="text-xs text-muted-foreground">How early before the window opens a checklist can be started</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Late Window</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={compLate}
                    onChange={(e) => setCompLate(e.target.value)}
                  >
                    <option value="">Use platform default</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                    <option value="480">8 hours</option>
                    <option value="720">12 hours</option>
                    <option value="1440">1 day</option>
                    <option value="2880">2 days</option>
                    <option value="4320">3 days</option>
                    <option value="10080">1 week</option>
                  </select>
                  <p className="text-xs text-muted-foreground">How long after the window closes before it&apos;s marked as missed</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  setSaving(true);
                  const compliance: any = {};
                  if (compEarly !== "") compliance.earlyMinutes = parseInt(compEarly);
                  if (compLate !== "") compliance.lateMinutes = parseInt(compLate);
                  const res = await fetch("/api/v1/organization", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ settings: { compliance: Object.keys(compliance).length > 0 ? compliance : null } }),
                  });
                  setSaving(false);
                  if (res.ok) { toast.success("Compliance settings saved"); fetchOrg(); }
                  else { const { error } = await res.json(); toast.error(error); }
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Compliance Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle className="text-base">Info Tags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Tags help organize Info items. Users can filter by tags when browsing.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newTagName.trim()) {
                      e.preventDefault();
                      setTagSaving(true);
                      const res = await fetch("/api/v1/info/tags", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newTagName.trim() }),
                      });
                      setTagSaving(false);
                      if (res.ok) {
                        setNewTagName("");
                        fetchTags();
                        toast.success("Tag created");
                      } else {
                        const { error } = await res.json();
                        toast.error(error);
                      }
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={tagSaving || !newTagName.trim()}
                  onClick={async () => {
                    setTagSaving(true);
                    const res = await fetch("/api/v1/info/tags", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newTagName.trim() }),
                    });
                    setTagSaving(false);
                    if (res.ok) {
                      setNewTagName("");
                      fetchTags();
                      toast.success("Tag created");
                    } else {
                      const { error } = await res.json();
                      toast.error(error);
                    }
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
              {infoTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags defined yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {infoTags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="gap-1 pr-1">
                      {tag.name}
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/v1/info/tags/${tag.id}`, { method: "DELETE" });
                          if (res.ok) {
                            fetchTags();
                            toast.success("Tag deleted");
                          } else {
                            const { error } = await res.json();
                            toast.error(error);
                          }
                        }}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Task Tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTaskTagName}
                  onChange={(e) => setNewTaskTagName(e.target.value)}
                  placeholder="New tag name..."
                  className="max-w-xs"
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newTaskTagName.trim()) {
                      setTaskTagSaving(true);
                      const res = await fetch("/api/v1/tasks/tags", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newTaskTagName.trim() }),
                      });
                      setTaskTagSaving(false);
                      if (res.ok) { setNewTaskTagName(""); fetchTaskTags(); toast.success("Tag created"); }
                      else { const { error } = await res.json(); toast.error(error); }
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={taskTagSaving || !newTaskTagName.trim()}
                  onClick={async () => {
                    setTaskTagSaving(true);
                    const res = await fetch("/api/v1/tasks/tags", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newTaskTagName.trim() }),
                    });
                    setTaskTagSaving(false);
                    if (res.ok) { setNewTaskTagName(""); fetchTaskTags(); toast.success("Tag created"); }
                    else { const { error } = await res.json(); toast.error(error); }
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />Add
                </Button>
              </div>
              {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {taskTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                      {tag.name}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={async () => {
                          const res = await fetch(`/api/v1/tasks/tags/${tag.id}`, { method: "DELETE" });
                          if (res.ok) { fetchTaskTags(); toast.success("Tag deleted"); }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Task Templates</CardTitle>
                <Button size="sm" onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({ name: "", title: "", description: "", priority: "MEDIUM", tagIds: [], subtasks: [], newSubtask: "", repeat: false, recurrenceType: "daily", dayOfWeek: "1", dayOfMonth: "1", interval: "7" });
                  setTemplateDialogOpen(true);
                }}>
                  <Plus className="mr-1 h-3 w-3" />Add Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {taskTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet.</p>
              ) : (
                <div className="space-y-2">
                  {taskTemplates.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.title} — {t.priority} — {(t.subtasks || []).length} subtasks</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingTemplate(t);
                          setTemplateForm({
                            name: t.name, title: t.title, description: t.description || "",
                            priority: t.priority, tagIds: t.tagIds || [],
                            subtasks: (t.subtasks || []).map((s: any) => s.title || s),
                            newSubtask: "", repeat: !!t.recurrenceRule,
                            recurrenceType: t.recurrenceRule?.type || "daily",
                            dayOfWeek: String(t.recurrenceRule?.dayOfWeek ?? 1),
                            dayOfMonth: String(t.recurrenceRule?.dayOfMonth ?? 1),
                            interval: String(t.recurrenceRule?.interval ?? 7),
                          });
                          setTemplateDialogOpen(true);
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={async () => {
                          const res = await fetch(`/api/v1/tasks/templates/${t.id}`, { method: "DELETE" });
                          if (res.ok) { fetchTaskTemplates(); toast.success("Template deleted"); }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guest-service">
          <Card>
            <CardHeader><CardTitle className="text-base">Guest Service — InboxClerk Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Connect to InboxClerk to sync guest survey data and complaint cases daily.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">InboxClerk API Key</label>
                {gsConfig?.hasApiKey && !gsApiKey.trim() && (
                  <p className="text-xs text-green-600">API key is saved and configured</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={gsConfig?.hasApiKey ? "Enter new key to replace..." : "Enter API key..."}
                    value={gsApiKey}
                    onChange={(e) => { setGsApiKey(e.target.value); setGsTestResult(null); }}
                    className="max-w-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={(!gsApiKey.trim() && !gsConfig?.hasApiKey) || gsSaving}
                    onClick={async () => {
                      setGsSaving(true);
                      setGsTestResult(null);
                      const payload: any = { testOnly: true };
                      if (gsApiKey.trim()) payload.inboxClerkApiKey = gsApiKey;
                      const res = await fetch("/api/v1/guest-service/config", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      setGsSaving(false);
                      if (res.ok) {
                        const { data } = await res.json();
                        setGsTestResult(data);
                      }
                    }}
                  >
                    Test Connection
                  </Button>
                </div>
                {gsTestResult && (
                  <p className={`text-sm ${gsTestResult.ok ? "text-green-600" : "text-red-600"}`}>
                    {gsTestResult.ok ? "Connection successful" : gsTestResult.error}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gsEnabled}
                    onChange={(e) => setGsEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <p className="text-sm font-medium">Enable Daily Sync</p>
                    <p className="text-xs text-muted-foreground">Automatically pull survey and complaint data at 4am daily</p>
                  </div>
                </label>
              </div>
              <Button
                disabled={gsSaving}
                onClick={async () => {
                  setGsSaving(true);
                  const payload: any = { isEnabled: gsEnabled };
                  if (gsApiKey.trim()) payload.inboxClerkApiKey = gsApiKey;
                  const res = await fetch("/api/v1/guest-service/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  setGsSaving(false);
                  if (res.ok) {
                    toast.success("Guest service settings saved");
                    setGsApiKey("");
                    fetchGsConfig();
                  } else {
                    const { error } = await res.json();
                    toast.error(error);
                  }
                }}
              >
                {gsSaving ? "Saving..." : "Save Settings"}
              </Button>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">Sync Status</p>
                  <p className="text-xs text-muted-foreground">
                    {gsConfig?.hasApiKey ? "API key configured" : "No API key configured"}
                    {" — "}
                    {gsConfig?.isEnabled ? "Sync enabled" : "Sync disabled"}
                  </p>
                  {gsConfig?.lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {new Date(gsConfig.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                  {gsConfig?.lastSyncError && (
                    <p className="text-xs text-red-600">Last error: {gsConfig.lastSyncError}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  disabled={gsSyncing || !gsConfig?.hasApiKey}
                  onClick={async () => {
                    setGsSyncing(true);
                    const res = await fetch("/api/v1/guest-service/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ daysBack: 60 }),
                    });
                    setGsSyncing(false);
                    if (res.ok) {
                      const { data } = await res.json();
                      toast.success(`Synced: ${data.surveysSynced || 0} surveys, ${data.complaintsSynced || 0} complaints`);
                      fetchGsConfig();
                    } else {
                      const { error } = await res.json();
                      toast.error(error);
                    }
                  }}
                >
                  <RefreshCw className={`mr-1 h-4 w-4 ${gsSyncing ? "animate-spin" : ""}`} />
                  Sync Last 60 Days
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear All Corrective Actions</p>
              <p className="text-xs text-muted-foreground">Permanently delete all corrective actions and their comments. This cannot be undone.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (!confirm("Clear ALL corrective actions? This cannot be undone.")) return;
                const res = await fetch("/api/v1/corrective-actions/clear", { method: "POST" });
                if (res.ok) {
                  const { data } = await res.json();
                  toast.success(`Cleared ${data.cleared} corrective actions`);
                } else {
                  toast.error("Failed to clear");
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setTemplateSaving(true);
            const payload: any = {
              name: templateForm.name,
              title: templateForm.title,
              priority: templateForm.priority,
              tagIds: templateForm.tagIds,
              subtasks: templateForm.subtasks.map((s) => ({ title: s })),
            };
            if (templateForm.description) payload.description = templateForm.description;
            if (templateForm.repeat) {
              const rule: any = { type: templateForm.recurrenceType };
              if (templateForm.recurrenceType === "weekly" || templateForm.recurrenceType === "biweekly") rule.dayOfWeek = parseInt(templateForm.dayOfWeek);
              if (templateForm.recurrenceType === "monthly") rule.dayOfMonth = parseInt(templateForm.dayOfMonth);
              if (templateForm.recurrenceType === "custom") rule.interval = parseInt(templateForm.interval);
              payload.recurrenceRule = rule;
            }
            const url = editingTemplate ? `/api/v1/tasks/templates/${editingTemplate.id}` : "/api/v1/tasks/templates";
            const method = editingTemplate ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            setTemplateSaving(false);
            if (res.ok) {
              toast.success(editingTemplate ? "Template updated" : "Template created");
              setTemplateDialogOpen(false);
              fetchTaskTemplates();
            } else {
              const { error } = await res.json();
              toast.error(error);
            }
          }} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Template Name *</label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Default Title *</label>
              <Input value={templateForm.title} onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={templateForm.priority} onValueChange={(v) => setTemplateForm({ ...templateForm, priority: v || "MEDIUM" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskTags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {taskTags.map((t) => (
                    <Badge
                      key={t.id}
                      variant={templateForm.tagIds.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setTemplateForm((f) => ({ ...f, tagIds: f.tagIds.includes(t.id) ? f.tagIds.filter((x) => x !== t.id) : [...f.tagIds, t.id] }))}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Subtasks</label>
              {templateForm.subtasks.length > 0 && (
                <div className="space-y-1 mt-1 mb-2">
                  {templateForm.subtasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm rounded-md bg-muted px-2 py-1">
                      <span className="flex-1">{st}</span>
                      <button type="button" onClick={() => setTemplateForm((f) => ({ ...f, subtasks: f.subtasks.filter((_, idx) => idx !== i) }))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={templateForm.newSubtask}
                  onChange={(e) => setTemplateForm({ ...templateForm, newSubtask: e.target.value })}
                  placeholder="Add subtask..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && templateForm.newSubtask.trim()) {
                      e.preventDefault();
                      setTemplateForm((f) => ({ ...f, subtasks: [...f.subtasks, f.newSubtask.trim()], newSubtask: "" }));
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => {
                  if (templateForm.newSubtask.trim()) {
                    setTemplateForm((f) => ({ ...f, subtasks: [...f.subtasks, f.newSubtask.trim()], newSubtask: "" }));
                  }
                }}>Add</Button>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={templateForm.repeat} onChange={(e) => setTemplateForm({ ...templateForm, repeat: e.target.checked })} className="rounded" />
                <Repeat className="h-4 w-4" />
                <span className="text-sm font-medium">Recurrence</span>
              </label>
              {templateForm.repeat && (
                <div className="mt-2 space-y-2 rounded-md border p-3">
                  <Select value={templateForm.recurrenceType} onValueChange={(v) => setTemplateForm({ ...templateForm, recurrenceType: v || "daily" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom interval</SelectItem>
                    </SelectContent>
                  </Select>
                  {(templateForm.recurrenceType === "weekly" || templateForm.recurrenceType === "biweekly") && (
                    <Select value={templateForm.dayOfWeek} onValueChange={(v) => setTemplateForm({ ...templateForm, dayOfWeek: v || "1" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {templateForm.recurrenceType === "monthly" && (
                    <Input type="number" min="1" max="28" value={templateForm.dayOfMonth} onChange={(e) => setTemplateForm({ ...templateForm, dayOfMonth: e.target.value })} placeholder="Day of month" />
                  )}
                  {templateForm.recurrenceType === "custom" && (
                    <Input type="number" min="1" value={templateForm.interval} onChange={(e) => setTemplateForm({ ...templateForm, interval: e.target.value })} placeholder="Every N days" />
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={templateSaving || !templateForm.name || !templateForm.title}>
                {templateSaving ? "Saving..." : editingTemplate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
