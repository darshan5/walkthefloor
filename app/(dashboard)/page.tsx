"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck, AlertTriangle, XCircle, Wrench, MessageSquare,
  MapPin, ShieldAlert, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Dashboard = {
  checklists: { total: number; completed: number; missed: number; pending: number };
  correctiveActions: { open: number; overdue: number };
  complaints: { open: number };
  maintenance: { pendingApproval: number };
  myFailures?: number;
  locationCompliance?: { id: string; name: string; storeNumber: string | null; total: number; completed: number; percent: number }[];
  failureCounts?: Record<string, { unexcused: number; excused: number; total: number }>;
  pendingExcuses?: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/dashboard")
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!data) return null;

  const isManager = !!data.locationCompliance;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/checklists">
          <StatsCard
            title="Today's Checklists"
            value={`${data.checklists.completed} / ${data.checklists.total}`}
            subtitle={data.checklists.pending > 0 ? `${data.checklists.pending} pending` : "All done"}
            icon={ClipboardCheck}
            variant={data.checklists.missed > 0 ? "danger" : data.checklists.pending === 0 && data.checklists.total > 0 ? "success" : "default"}
            onClick={() => {}}
          />
        </Link>
        <Link href="/checklists/corrective-actions">
          <StatsCard
            title="Open CAs"
            value={data.correctiveActions.open}
            subtitle={data.correctiveActions.overdue > 0 ? `${data.correctiveActions.overdue} overdue` : "None overdue"}
            icon={AlertTriangle}
            variant={data.correctiveActions.overdue > 0 ? "danger" : data.correctiveActions.open > 0 ? "warning" : "success"}
            onClick={() => {}}
          />
        </Link>
        <StatsCard
          title="Missed Checklists"
          value={data.checklists.missed}
          icon={XCircle}
          variant={data.checklists.missed > 0 ? "danger" : "success"}
        />
        <StatsCard
          title="Maintenance"
          value={data.maintenance.pendingApproval}
          subtitle="Pending approval"
          icon={Wrench}
          variant={data.maintenance.pendingApproval > 0 ? "warning" : "default"}
        />
      </div>

      {/* RGM: My compliance failures */}
      {!isManager && data.myFailures != null && data.myFailures > 0 && (
        <Link href="/checklists/failures">
          <Card className="border-red-200 bg-red-50/50 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-sm text-red-800">
                  {data.myFailures} unexcused compliance failure{data.myFailures > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600">Provide an explanation to have them reviewed</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Manager: Location compliance grid */}
      {isManager && data.locationCompliance && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Location Compliance — Today</CardTitle>
              {data.pendingExcuses != null && data.pendingExcuses > 0 && (
                <Link href="/checklists/failures">
                  <Badge variant="destructive">{data.pendingExcuses} excuse{data.pendingExcuses > 1 ? "s" : ""} pending review</Badge>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.locationCompliance.map((loc) => (
              <div key={loc.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {loc.name}
                    {loc.storeNumber && <span className="text-xs text-muted-foreground">#{loc.storeNumber}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {loc.completed}/{loc.total}
                    {data.failureCounts?.[loc.id] && data.failureCounts[loc.id].unexcused > 0 && (
                      <span className="ml-2 text-red-600">
                        {data.failureCounts[loc.id].unexcused} failures
                      </span>
                    )}
                  </span>
                </div>
                <ComplianceBar value={loc.completed} max={loc.total} size="sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/checklists/adherence">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Checklist Adherence</p>
                <p className="text-xs text-muted-foreground">Location × checklist grid</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/checklists/corrective-actions">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Corrective Actions</p>
                <p className="text-xs text-muted-foreground">{data.correctiveActions.open} open</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/checklists/reports">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Reports</p>
                <p className="text-xs text-muted-foreground">CA heatmap & compliance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
