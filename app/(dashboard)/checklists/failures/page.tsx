"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

type Failure = {
  id: string;
  locationId: string;
  userId: string | null;
  windowLabel: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  explanation: string | null;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  template: { name: string; category: string | null };
  instance: { date: string; windowLabel: string | null };
};

export default function FailuresPage() {
  const [failures, setFailures] = useState<Failure[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [explainOpen, setExplainOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selected, setSelected] = useState<Failure | null>(null);
  const [explanation, setExplanation] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchFailures() {
    const statusParam = tab === "pending" ? "&status=pending_review" : tab === "my" ? "&tab=my" : "";
    const res = await fetch(`/api/v1/compliance-failures?${statusParam}`);
    if (res.ok) {
      const { data } = await res.json();
      setFailures(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    fetchFailures();
  }, [tab]);

  function openExplain(f: Failure) {
    setSelected(f);
    setExplanation(f.explanation || "");
    setExplainOpen(true);
  }

  function openReview(f: Failure) {
    setSelected(f);
    setReviewNotes("");
    setReviewOpen(true);
  }

  async function handleExplain() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/v1/compliance-failures/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanation }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Explanation submitted for review");
      setExplainOpen(false);
      fetchFailures();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  async function handleReview(approved: boolean) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/v1/compliance-failures/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, reviewNotes: reviewNotes || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(approved ? "Excuse approved — will not count against manager" : "Excuse denied");
      setReviewOpen(false);
      fetchFailures();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Compliance Failures
          </h1>
          <p className="text-sm text-muted-foreground">Missed checklists and excuse management</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="my">My</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : failures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {tab === "pending" ? "No excuses pending review." : "No compliance failures found."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {failures.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{f.template.name}</span>
                      {f.windowLabel && <Badge variant="outline" className="text-xs">{f.windowLabel}</Badge>}
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(f.instance.date)}
                      {f.template.category && ` · ${f.template.category}`}
                    </p>
                    {f.explanation && (
                      <p className="text-sm mt-2 bg-muted rounded p-2 italic">&ldquo;{f.explanation}&rdquo;</p>
                    )}
                    {f.reviewNotes && (
                      <p className="text-xs text-muted-foreground mt-1">Review: {f.reviewNotes}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {f.status === "unexcused" && (
                      <Button size="sm" variant="outline" onClick={() => openExplain(f)}>
                        Explain
                      </Button>
                    )}
                    {f.status === "pending_review" && (
                      <Button size="sm" onClick={() => openReview(f)}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Explain Dialog */}
      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Explanation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Explain why {selected?.template.name} ({selected?.windowLabel}) was missed on {selected ? formatDate(selected.instance.date) : ""}.
            If approved by your manager, this will not count against you.
          </p>
          <Input
            placeholder="e.g., Store closed due to power outage"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleExplain} disabled={saving || !explanation.trim()}>
              {saving ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Excuse</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{selected?.template.name} — {selected?.windowLabel}</p>
              <p className="text-xs text-muted-foreground">{selected ? formatDate(selected.instance.date) : ""}</p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-sm italic">&ldquo;{selected?.explanation}&rdquo;</p>
            </div>
            <Input
              placeholder="Review notes (optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleReview(false)} disabled={saving} className="gap-1">
              <XCircle className="h-4 w-4" />
              Deny
            </Button>
            <Button onClick={() => handleReview(true)} disabled={saving} className="gap-1">
              <CheckCircle className="h-4 w-4" />
              {saving ? "Saving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
