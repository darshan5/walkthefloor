"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data/status-badge";
import { Printer, CheckCircle, XCircle } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

type DailyInstance = {
  id: string;
  status: string;
  windowLabel: string | null;
  windowStart: string | null;
  template: { name: string; category: string | null };
  completions: {
    task: { title: string; taskType: string; sortOrder: number };
    user: { name: string };
    value: any;
    isCompliant: boolean;
    completedAt: string;
  }[];
};

export default function DailyTasksPage() {
  const [instances, setInstances] = useState<DailyInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/reports/daily")
      .then((r) => r.json())
      .then(({ data }) => setInstances(data || []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = new Map<string, DailyInstance[]>();
  for (const inst of instances) {
    const cat = inst.template.category || "General";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(inst);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Tasks</h1>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : instances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks scheduled for today.
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([category, insts]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Category: {category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insts.map((inst) => (
                <div key={inst.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{inst.template.name}</span>
                      {inst.windowLabel && <Badge variant="outline" className="text-xs">{inst.windowLabel}</Badge>}
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                  {inst.completions.length > 0 ? (
                    <div className="space-y-1">
                      {inst.completions.map((c, i) => {
                        let display = "";
                        if (c.task.taskType === "TEMPERATURE") display = `${c.value?.temp ?? "—"}°F`;
                        else if (c.task.taskType === "YES_NO") display = c.value?.answer ? "Yes" : "No";
                        else display = JSON.stringify(c.value);

                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {c.isCompliant
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            }
                            <span className="flex-1 text-muted-foreground">{c.task.title}</span>
                            <span className={cn("font-mono text-xs", !c.isCompliant && "text-red-600")}>{display}</span>
                            <span className="text-xs text-muted-foreground">{c.user.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No readings recorded</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
