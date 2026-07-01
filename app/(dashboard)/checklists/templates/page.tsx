"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/data/status-badge";

type Template = {
  id: string;
  name: string;
  category: string | null;
  isBuiltIn: boolean;
  isActive: boolean;
  schedule: { frequency: string };
  _count: { tasks: number; instances: number };
};

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  every_4h: "Every 4h",
  every_8h: "Every 8h",
  every_12h: "Every 12h",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTemplates() {
    const res = await fetch("/api/v1/checklists");
    if (res.ok) {
      const { data } = await res.json();
      setTemplates(data);
    }
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  async function handleDelete(t: Template) {
    if (!confirm(`Delete "${t.name}"? This will also remove all instances, completions, and related corrective actions. This cannot be undone.`)) return;
    const res = await fetch(`/api/v1/checklists/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      fetchTemplates();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checklist Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage checklist templates and their tasks.
          </p>
        </div>
        <Link href="/checklists/templates/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-center">Tasks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates yet.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t.name}</span>
                        {t.isBuiltIn && (
                          <Badge variant="outline" className="text-xs">Built-in</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {frequencyLabels[t.schedule?.frequency] || t.schedule?.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{t._count.tasks}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.isActive ? "ACTIVE" : "PAUSED"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link href={`/checklists/templates/${t.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!t.isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t)}
                            disabled={t._count.instances > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
