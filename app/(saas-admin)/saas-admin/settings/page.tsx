"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [disableLogin, setDisableLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/saas-admin/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setDisableLogin(data.disableLogin);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/saas-admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disableLogin }),
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
