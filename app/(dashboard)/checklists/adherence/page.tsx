"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, Minus } from "lucide-react";

type AdherenceData = {
  templates: { id: string; name: string; category: string | null }[];
  grid: {
    locationId: string;
    locationName: string;
    storeNumber: string | null;
    cells: {
      templateId: string;
      templateName: string;
      total: number;
      completed: number;
      missed: number;
      late: number;
      status: string;
    }[];
  }[];
};

const statusIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle className="h-4 w-4 text-green-600" />,
  late: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  missed: <XCircle className="h-4 w-4 text-red-600" />,
  partial: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  none: <Minus className="h-4 w-4 text-muted-foreground" />,
};

export default function AdherencePage() {
  const [data, setData] = useState<AdherenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/reports/adherence?days=7")
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!data || data.grid.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Checklist Adherence</h1>
        <Card><CardContent className="py-8 text-center text-muted-foreground">No data available.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Checklist Adherence</h1>
        <p className="text-sm text-muted-foreground">Location × checklist completion status — last 7 days</p>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">{statusIcons.done} Completed</span>
        <span className="flex items-center gap-1">{statusIcons.late} Late</span>
        <span className="flex items-center gap-1">{statusIcons.missed} Missed</span>
        <span className="flex items-center gap-1">{statusIcons.partial} Partial</span>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Location</TableHead>
                {data.templates.map((t) => (
                  <TableHead key={t.id} className="text-center min-w-[100px]">
                    <div className="text-xs">{t.name}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grid.map((row) => (
                <TableRow key={row.locationId}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    {row.locationName}
                    {row.storeNumber && <span className="text-xs text-muted-foreground ml-1">#{row.storeNumber}</span>}
                  </TableCell>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.templateId} className="text-center">
                      <div className="flex flex-col items-center gap-0.5" title={`${cell.completed}/${cell.total} completed, ${cell.missed} missed`}>
                        {statusIcons[cell.status]}
                        {cell.total > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {cell.completed}/{cell.total}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
