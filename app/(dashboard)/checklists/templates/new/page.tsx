"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const frequencies = [
  { value: "daily", label: "Daily", description: "1x or 2x per day" },
  { value: "every_4h", label: "Every 4 hours", description: "6 times per day" },
  { value: "every_8h", label: "Every 8 hours", description: "3 times per day" },
  { value: "every_12h", label: "Every 12 hours", description: "2 times per day" },
  { value: "weekly", label: "Weekly", description: "Specific days of the week" },
  { value: "monthly", label: "Monthly", description: "Once per month" },
  { value: "custom", label: "Custom interval", description: "Every N days" },
];

const defaultWindows: Record<string, any> = {
  daily: { timesPerDay: 1, windows: [{ start: "05:00", end: "23:00", label: "" }] },
  every_4h: { windows: [
    { start: "05:00", end: "09:00" }, { start: "09:00", end: "13:00" },
    { start: "13:00", end: "17:00" }, { start: "17:00", end: "21:00" },
    { start: "21:00", end: "01:00" }, { start: "01:00", end: "05:00" },
  ]},
  every_8h: { windows: [
    { start: "05:00", end: "13:00" }, { start: "13:00", end: "21:00" },
    { start: "21:00", end: "05:00" },
  ]},
  every_12h: { windows: [
    { start: "05:00", end: "17:00", label: "AM" },
    { start: "17:00", end: "05:00", label: "PM" },
  ]},
  weekly: { days: ["mon", "wed", "fri"], windows: [{ start: "05:00", end: "23:00" }] },
  monthly: { dayOfMonth: 1, windows: [{ start: "00:00", end: "23:59" }] },
  custom: { intervalDays: 14, windows: [{ start: "00:00", end: "23:59" }] },
};

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    const schedule = { frequency, ...defaultWindows[frequency] };

    const res = await fetch("/api/v1/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined, category: category || undefined, schedule }),
    });

    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      toast.success("Template created — now add tasks");
      router.push(`/checklists/templates/${data.id}`);
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/checklists/templates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">New Checklist Template</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Template Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input placeholder="e.g., Daily Temperature Logs" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input placeholder="e.g., Book Logs" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {frequencies.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {frequencies.find((f) => f.value === frequency)?.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/checklists/templates">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Creating..." : "Create & Add Tasks"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
