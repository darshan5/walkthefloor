"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, MapPin, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLocation } from "@/components/layout/location-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Complaint = {
  id: string;
  caseNumber: string;
  guestName: string;
  reasonForContact: string;
  incidentDate: string | null;
  locationId: string;
  locationName: string;
  responseText: string | null;
};

type Counts = { total: number; responded: number; needsResponse: number };

type TrendData = {
  summary: {
    currentMonth: { avgOsat: number | null; avgLtr: number | null; count: number };
    previousMonth: { avgOsat: number | null; avgLtr: number | null; count: number };
  };
  monthly: Array<{ month: string; avgOsat: number | null; avgLtr: number | null; count: number }>;
  byLocation: Array<{ locationId: string; locationName: string; avgOsat: number | null; avgLtr: number | null; count: number }>;
};

type Location = { id: string; name: string };

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value: val, label });
  }
  return options;
}

export default function GuestServicePage() {
  const router = useRouter();
  const { selectedLocationId, locations } = useLocation();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, responded: 0, needsResponse: 0 });
  const [loading, setLoading] = useState(true);

  const monthOptions = getMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);
  const [respondedFilter, setRespondedFilter] = useState("");

  const [trends, setTrends] = useState<TrendData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendMonths, setTrendMonths] = useState("6");

  useEffect(() => {
    fetchTrends();
  }, []);

  useEffect(() => {
    fetchComplaints();
    fetchCounts();
  }, [month, selectedLocationId, respondedFilter]);

  useEffect(() => {
    fetchTrends();
  }, [selectedLocationId, trendMonths]);

  async function fetchComplaints() {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    if (respondedFilter && respondedFilter !== "all") params.set("responded", respondedFilter);
    const res = await fetch(`/api/v1/guest-service/complaints?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setComplaints(data);
    }
    setLoading(false);
  }

  async function fetchCounts() {
    const params = new URLSearchParams({ counts: "true", month });
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    const res = await fetch(`/api/v1/guest-service/complaints?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setCounts(data);
    }
  }

  async function fetchTrends() {
    setTrendsLoading(true);
    const params = new URLSearchParams({ months: trendMonths });
    if (selectedLocationId) params.set("locationId", selectedLocationId);
    const res = await fetch(`/api/v1/guest-service/trends?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setTrends(data);
    }
    setTrendsLoading(false);
  }

  function delta(current: number | null, previous: number | null) {
    if (current == null || previous == null) return null;
    return Math.round((current - previous) * 10) / 10;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Guest Service</h1>

      {/* ── Cases Section ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Complaint Cases</h2>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold">{counts.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Needs Response</p>
              <p className="text-2xl font-bold text-amber-600">{counts.needsResponse}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Responded</p>
              <p className="text-2xl font-bold text-green-600">{counts.responded}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={month} onValueChange={(v) => setMonth(v || monthOptions[0].value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={respondedFilter} onValueChange={(v) => setRespondedFilter(v || "")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="no">Needs Response</SelectItem>
              <SelectItem value="yes">Responded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Case List */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : complaints.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No complaint cases found for this period.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {complaints.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/guest-service/${c.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">#{c.caseNumber}</span>
                        <Badge
                          variant="outline"
                          className={c.responseText
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {c.responseText ? "Responded" : "Needs Response"}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{c.reasonForContact}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{c.guestName}</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.locationName}
                        </span>
                        {c.incidentDate && <span>{formatDate(c.incidentDate)}</span>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Trends Section ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Survey Trends</h2>

        {/* Trend Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1">
            {["3", "6", "12"].map((m) => (
              <Button
                key={m}
                size="sm"
                variant={trendMonths === m ? "default" : "outline"}
                onClick={() => setTrendMonths(m)}
              >
                {m}mo
              </Button>
            ))}
          </div>
        </div>

        {trendsLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : !trends ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No survey data available.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Avg OSAT</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{trends.summary.currentMonth.avgOsat ?? "—"}</p>
                    {(() => {
                      const d = delta(trends.summary.currentMonth.avgOsat, trends.summary.previousMonth.avgOsat);
                      if (d == null) return null;
                      return (
                        <span className={`flex items-center text-xs ${d >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {d >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(d)}
                        </span>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Avg LTR</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">{trends.summary.currentMonth.avgLtr ?? "—"}</p>
                    {(() => {
                      const d = delta(trends.summary.currentMonth.avgLtr, trends.summary.previousMonth.avgLtr);
                      if (d == null) return null;
                      return (
                        <span className={`flex items-center text-xs ${d >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {d >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(d)}
                        </span>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Surveys</p>
                  <p className="text-2xl font-bold">{trends.summary.currentMonth.count}</p>
                </CardContent>
              </Card>
            </div>

            {/* Line Chart */}
            {trends.monthly.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">OSAT & LTR Trends</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends.monthly}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tickFormatter={(v) => {
                            const [y, m] = v.split("-");
                            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short" });
                          }}
                          fontSize={12}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip
                          labelFormatter={(v) => {
                            const [y, m] = String(v).split("-");
                            return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="avgOsat" name="OSAT" stroke="#2563eb" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="avgLtr" name="LTR" stroke="#16a34a" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
