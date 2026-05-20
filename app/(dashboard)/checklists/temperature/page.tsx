"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Thermometer } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type TempLog = {
  id: string;
  equipmentName: string;
  temperature: number;
  unit: string;
  isCompliant: boolean;
  notes: string | null;
  recordedAt: string;
  location: { name: string };
  user: { name: string };
};

export default function TemperaturePage() {
  const [logs, setLogs] = useState<TempLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/temperature-logs")
      .then((r) => r.json())
      .then(({ data }) => setLogs(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Thermometer className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Temperature Logs</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No temperature logs yet. Readings are recorded through checklist completions.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.equipmentName}</TableCell>
                    <TableCell>
                      <span className={cn("font-mono font-medium", !log.isCompliant && "text-red-600")}>
                        {log.temperature}°{log.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.location.name}</TableCell>
                    <TableCell className="text-muted-foreground">{log.user.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(log.recordedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={log.isCompliant ? "outline" : "destructive"} className="text-xs">
                        {log.isCompliant ? "OK" : "Out of Range"}
                      </Badge>
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
