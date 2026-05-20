"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CategoryData = {
  category: string;
  compliancePercent: number;
  dates: {
    date: string;
    items: {
      value: any;
      isCompliant: boolean;
      user: { name: string };
      task: { title: string; taskType: string; config: any; equipmentType: { name: string; category: string } | null };
      instance: { date: string; windowLabel: string | null };
    }[];
  }[];
};

export default function TaskDashboardPage() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/reports/compliance?view=grid&days=14")
      .then((r) => r.json())
      .then(({ data }) => {
        setData(data || []);
        if (data?.length > 0) setSelectedCategory(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = selectedCategory ? data.filter((c) => c.category === selectedCategory) : data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Task Dashboard</h1>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "rounded-full px-3 py-1 text-sm transition-colors border",
            !selectedCategory ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          All Categories
        </button>
        {data.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors border",
              selectedCategory === cat.category ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            {cat.category} <span className="ml-1 opacity-70">{cat.compliancePercent}%</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No compliance data available. Data populates as checklists are completed.
          </CardContent>
        </Card>
      ) : (
        filtered.map((cat) => (
          <Card key={cat.category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{cat.category}</CardTitle>
                <Badge variant={cat.compliancePercent >= 95 ? "outline" : "destructive"}>
                  {cat.compliancePercent}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {cat.dates.map((d) => (
                    <div key={d.date} className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <div className="space-y-0.5">
                        {d.items.map((item, i) => {
                          let display = "";
                          if (item.task.taskType === "TEMPERATURE") {
                            display = `${item.value?.temp ?? "—"}°`;
                          } else if (item.task.taskType === "YES_NO") {
                            display = item.value?.answer ? "Y" : "N";
                          } else {
                            display = item.isCompliant ? "✓" : "✗";
                          }
                          return (
                            <div
                              key={i}
                              title={`${item.task.title} — ${item.user.name}`}
                              className={cn(
                                "w-12 px-1 py-0.5 rounded text-[11px] font-mono text-center cursor-default",
                                item.isCompliant ? "bg-compliance-green compliance-green" : "bg-compliance-red compliance-red"
                              )}
                            >
                              {display}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
