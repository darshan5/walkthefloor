"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

type CAStats = {
  open: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  total: number;
};

export default function ReportsPage() {
  const [caStats, setCaStats] = useState<CAStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/v1/corrective-actions");
      if (res.ok) {
        const { data } = await res.json();
        const stats: CAStats = {
          open: data.filter((c: any) => c.status === "OPEN").length,
          inProgress: data.filter((c: any) => c.status === "IN_PROGRESS").length,
          resolved: data.filter((c: any) => c.status === "RESOLVED").length,
          overdue: data.filter((c: any) => c.status === "OVERDUE").length,
          total: data.length,
        };
        setCaStats(stats);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      {caStats && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-3">Corrective Actions Summary</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard title="Open" value={caStats.open} icon={AlertTriangle} variant={caStats.open > 0 ? "warning" : "success"} />
              <StatsCard title="In Progress" value={caStats.inProgress} icon={Clock} />
              <StatsCard title="Resolved" value={caStats.resolved} icon={CheckCircle} variant="success" />
              <StatsCard title="Overdue" value={caStats.overdue} icon={XCircle} variant={caStats.overdue > 0 ? "danger" : "success"} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">CA Close Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ComplianceBar
                value={caStats.resolved}
                max={caStats.total || 1}
                label="Resolved"
              />
              <div className="mt-3 text-sm text-muted-foreground">
                {caStats.total > 0
                  ? `${Math.round((caStats.resolved / caStats.total) * 100)}% of all CAs resolved`
                  : "No corrective actions recorded yet"
                }
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
