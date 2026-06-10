"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/data/status-badge";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { ListChecks, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Instance = {
  id: string;
  status: string;
  windowLabel: string | null;
  windowEnd: string | null;
  completedAt: string | null;
  template: { id: string; name: string; category: string | null };
  _count: { completions: number };
};

export default function TasksPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/instances?type=task")
      .then((r) => r.json())
      .then(({ data }) => setInstances(data || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Tasks</h1>
      </div>

      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tasks assigned for today. Tasks are assigned by admin from the Templates section.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {instances.map((inst) => {
            const windowEnd = inst.windowEnd ? new Date(inst.windowEnd) : null;
            const isClickable = inst.status !== "MISSED";

            const content = (
              <Card className={cn("transition-shadow", isClickable && "hover:shadow-md cursor-pointer", inst.status === "MISSED" && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium">{inst.template.name}</span>
                      {inst.windowLabel && <Badge variant="outline" className="text-xs ml-2">{inst.windowLabel}</Badge>}
                      {inst.template.category && <p className="text-xs text-muted-foreground mt-0.5">{inst.template.category}</p>}
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                  <div className="mt-3">
                    <ComplianceBar value={inst._count.completions} max={1} size="sm" />
                  </div>
                  {windowEnd && inst.status === "PENDING" && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due by {windowEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );

            return isClickable ? (
              <Link key={inst.id} href={`/checklists/${inst.id}`}>{content}</Link>
            ) : (
              <div key={inst.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
