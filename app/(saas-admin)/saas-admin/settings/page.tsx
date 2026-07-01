"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { toast } from "sonner";

const lateOptions = [
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "1 day" },
  { value: 2880, label: "2 days" },
  { value: 4320, label: "3 days" },
  { value: 10080, label: "1 week" },
];

const earlyOptions = [
  { value: 0, label: "No early window" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
];

export default function SettingsPage() {
  const [disableLogin, setDisableLogin] = useState(false);
  const [earlyMinutes, setEarlyMinutes] = useState(60);
  const [lateMinutes, setLateMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/saas-admin/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setDisableLogin(data.disableLogin);
          setEarlyMinutes(data.complianceEarlyMinutes ?? 60);
          setLateMinutes(data.complianceLateMinutes ?? 60);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/saas-admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disableLogin,
        complianceEarlyMinutes: earlyMinutes,
        complianceLateMinutes: lateMinutes,
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("Settings saved");
    else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Compliance Windows</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Controls how much time before and after a checklist&apos;s scheduled window a store can complete it.
            Tenants can override these defaults in their Organization Settings.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Early Window</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={earlyMinutes}
                onChange={(e) => setEarlyMinutes(Number(e.target.value))}
              >
                {earlyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">How early before the window opens a checklist can be started</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Late Window</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={lateMinutes}
                onChange={(e) => setLateMinutes(Number(e.target.value))}
              >
                {lateOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">How long after the window closes before it&apos;s marked as missed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Maintenance Mode</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={disableLogin}
              onChange={(e) => setDisableLogin(e.target.checked)}
              className="rounded"
            />
            <div>
              <p className="text-sm font-medium">Disable tenant login</p>
              <p className="text-xs text-muted-foreground">
                Prevents all tenant users from logging in. SaaS admins can still access the platform.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
