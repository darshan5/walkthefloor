"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/data/status-badge";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Instance = {
  id: string;
  status: string;
  windowLabel: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  completedAt: string | null;
  template: { id: string; name: string; category: string | null; schedule: any };
  completions: { id: string; taskId: string }[];
  _count: { completions: number };
};

type Dashboard = {
  today: { total: number; completed: number; missed: number; inProgress: number; pending: number };
  openCAs: number;
};

export default function ChecklistsPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      const [instRes, dashRes] = await Promise.all([
        fetch("/api/v1/instances"),
        fetch("/api/v1/dashboard"),
      ]);
      if (instRes.ok) {
        const { data } = await instRes.json();
        setInstances(data);
      }
      if (dashRes.ok) {
        const { data } = await dashRes.json();
        setDashboard(data);
      }
      setLoading(false);
    }
    fetch_data();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Book Dashboard</h1>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Checklists"
            value={`${dashboard.today.completed} / ${dashboard.today.total}`}
            subtitle={dashboard.today.pending > 0 ? `${dashboard.today.pending} pending` : "All done"}
            icon={ClipboardCheck}
            variant={dashboard.today.pending === 0 && dashboard.today.total > 0 ? "success" : "default"}
          />
          <StatsCard
            title="In Progress"
            value={dashboard.today.inProgress}
            icon={Clock}
            variant={dashboard.today.inProgress > 0 ? "warning" : "default"}
          />
          <StatsCard
            title="Missed"
            value={dashboard.today.missed}
            icon={XCircle}
            variant={dashboard.today.missed > 0 ? "danger" : "success"}
          />
          <StatsCard
            title="Open CAs"
            value={dashboard.openCAs}
            icon={AlertTriangle}
            variant={dashboard.openCAs > 0 ? "warning" : "success"}
          />
        </div>
      )}

      {/* Today's Checklists */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Today&apos;s Checklists</h2>
        {instances.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No checklists scheduled for today. Checklists are generated automatically based on template schedules.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {instances.map((inst) => {
              const totalTasks = (inst.template as any)?.tasks?.length || 0;
              const completedTasks = inst._count.completions;
              const windowEnd = inst.windowEnd ? new Date(inst.windowEnd) : null;
              const timeLeft = windowEnd ? windowEnd.getTime() - Date.now() : null;
              const isUrgent = timeLeft != null && timeLeft > 0 && timeLeft < 60 * 60 * 1000;
              const isClickable = inst.status !== "MISSED";

              const content = (
                <Card className={cn(
                  "transition-shadow",
                  isClickable && "hover:shadow-md cursor-pointer",
                  inst.status === "MISSED" && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{inst.template.name}</span>
                          {inst.windowLabel && (
                            <Badge variant="outline" className="text-xs">{inst.windowLabel}</Badge>
                          )}
                        </div>
                        {inst.template.category && (
                          <p className="text-xs text-muted-foreground mt-0.5">{inst.template.category}</p>
                        )}
                      </div>
                      <StatusBadge status={inst.status} />
                    </div>

                    <div className="mt-3">
                      <ComplianceBar
                        value={completedTasks}
                        max={totalTasks || 1}
                        label={totalTasks > 0 ? `${completedTasks}/${totalTasks}` : undefined}
                        size="sm"
                      />
                    </div>

                    {windowEnd && inst.status !== "COMPLETED" && inst.status !== "COMPLETED_LATE" && inst.status !== "MISSED" && (
                      <p className={cn(
                        "text-xs mt-2 flex items-center gap-1",
                        isUrgent ? "text-red-600 font-medium" : "text-muted-foreground"
                      )}>
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
    </div>
  );
}
