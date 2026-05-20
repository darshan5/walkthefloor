"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type WeekData = {
  weekEnding: string;
  total: number;
  completed: number;
  percent: number;
};

export default function ProgressPage() {
  const [data, setData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/reports/progress?weeks=8")
      .then((r) => r.json())
      .then(({ data }) => setData(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Task Progress</h1>
      </div>
      <p className="text-sm text-muted-foreground">Weekly completion rates — last 8 weeks</p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Ending</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Completed</TableHead>
                <TableHead className="text-right">Completion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No data yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((week) => (
                  <TableRow key={week.weekEnding}>
                    <TableCell className="font-medium">
                      {new Date(week.weekEnding).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    <TableCell className="text-center">{week.total}</TableCell>
                    <TableCell className="text-center">{week.completed}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono font-medium",
                        week.percent >= 90 ? "text-green-600" :
                        week.percent >= 70 ? "text-amber-600" : "text-red-600"
                      )}>
                        {week.percent}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
