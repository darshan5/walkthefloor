"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, MapPin, Box } from "lucide-react";
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
    }
    setLoading(false);
  }

  useEffect(() => { fetchOrg(); }, []);

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
      </Tabs>
    </div>
  );
}
