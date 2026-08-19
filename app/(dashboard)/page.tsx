"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ComplianceBar } from "@/components/data/compliance-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck, AlertTriangle, XCircle, Wrench, MessageSquare, CheckSquare,
  MapPin, ShieldAlert, TrendingUp, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLocation } from "@/components/layout/location-context";

type Dashboard = {
  checklists: { total: number; completed: number; missed: number; pending: number };
  correctiveActions: { open: number; overdue: number };
  tasks: { urgent: number; overdue: number };
  complaints: { open: number };
  maintenance: { pendingApproval: number };
  guestService: { needsResponse: number; osat: { lastMonth: number | null; twoMonthsAgo: number | null; delta: number | null } };
  myFailures?: number;
  locationCompliance?: { id: string; name: string; storeNumber: string | null; total: number; completed: number; percent: number }[];
  failureCounts?: Record<string, { unexcused: number; excused: number; total: number }>;
  pendingExcuses?: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedLocationId } = useLocation();

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    fetch(`/api/v1/dashboard?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [selectedLocationId]);

  if (loading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!data) return null;

  const isManager = !!data.locationCompliance;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
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
        <Link href="/tasks">
          <StatsCard
            title="Urgent Tasks"
            value={data.tasks.urgent}
            subtitle={data.tasks.overdue > 0 ? `${data.tasks.overdue} overdue` : "None overdue"}
            icon={CheckSquare}
            variant={data.tasks.overdue > 0 ? "danger" : data.tasks.urgent > 0 ? "warning" : "success"}
            onClick={() => {}}
          />
        </Link>
        <StatsCard
          title="Missed Checklists"
          value={data.checklists.missed}
          icon={XCircle}
          variant={data.checklists.missed > 0 ? "danger" : "success"}
        />
        <Link href="/maintenance">
          <StatsCard
            title="Maintenance"
            value={data.maintenance.pendingApproval}
            subtitle="Pending approval"
            icon={Wrench}
            variant={data.maintenance.pendingApproval > 0 ? "warning" : "default"}
            onClick={() => {}}
          />
        </Link>
        <Link href="/guest-service">
          <StatsCard
            title="Guest Complaints"
            value={data.guestService.needsResponse}
            subtitle="Need response"
            icon={MessageSquare}
            variant={data.guestService.needsResponse > 0 ? "warning" : "success"}
            onClick={() => {}}
          />
        </Link>
        <Link href="/guest-service">
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">OSAT Score</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">{data.guestService.osat.lastMonth ?? "—"}</span>
                {data.guestService.osat.delta != null && (
                  <span className={cn("flex items-center text-sm font-medium", data.guestService.osat.delta >= 0 ? "text-green-600" : "text-red-600")}>
                    {data.guestService.osat.delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(data.guestService.osat.delta)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Last month vs prior</p>
            </CardContent>
          </Card>
        </Link>
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
        <Link href="/tasks">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Tasks</p>
                <p className="text-xs text-muted-foreground">{data.tasks.urgent} urgent, {data.tasks.overdue} overdue</p>
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
                <p className="text-xs text-muted-foreground">Compliance reports</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
