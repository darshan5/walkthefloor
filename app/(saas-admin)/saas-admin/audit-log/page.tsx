"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type LogEntry = {
  id: string;
  action: string;
  targetOrgId: string | null;
  targetUserId: string | null;
  adminId: string;
  metadata: any;
  createdAt: string;
};

const actionLabels: Record<string, { label: string; variant: "default" | "destructive" | "outline" }> = {
  provision_org: { label: "Provision Org", variant: "default" },
  suspend_org: { label: "Suspend", variant: "destructive" },
  reactivate_org: { label: "Reactivate", variant: "default" },
  create_webhook: { label: "Create Webhook", variant: "outline" },
  create_api_key: { label: "Create API Key", variant: "outline" },
  revoke_api_key: { label: "Revoke API Key", variant: "destructive" },
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saas-admin/audit-log")
      .then((r) => r.json())
      .then(({ data }) => setEntries(data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Target Org</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : entries.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No audit entries.</TableCell></TableRow>
              ) : (
                entries.map((e) => {
                  const config = actionLabels[e.action] || { label: e.action, variant: "outline" as const };
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {e.targetOrgId ? e.targetOrgId.substring(0, 12) + "..." : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.metadata && Object.keys(e.metadata).length > 0
                          ? JSON.stringify(e.metadata)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(e.createdAt)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
