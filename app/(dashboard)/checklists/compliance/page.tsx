"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ComplianceBar } from "@/components/data/compliance-bar";

type CategoryData = {
  category: string;
  total: number;
  compliant: number;
  percent: number;
};

export default function CompliancePage() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/reports/compliance?view=category&days=30")
      .then((r) => r.json())
      .then(({ data }) => setData(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Task Compliance</h1>
      <p className="text-sm text-muted-foreground">Compliance by checklist category — last 30 days</p>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No compliance data yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            {data.map((row) => (
              <div key={row.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{row.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.compliant}/{row.total} compliant
                  </span>
                </div>
                <ComplianceBar value={row.compliant} max={row.total} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
