"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { Headphones, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type TicketDetail = Ticket & {
  messages: { id: string; senderId: string; body: string; isStaff: boolean; createdAt: string }[];
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<TicketDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState("");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("other");
  const [body, setBody] = useState("");

  async function fetchTickets() {
    const res = await fetch("/api/v1/support");
    if (res.ok) setTickets((await res.json()).data || []);
    setLoading(false);
  }

  useEffect(() => { fetchTickets(); }, []);

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/v1/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, category, body }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Ticket created");
      setCreateOpen(false);
      setSubject(""); setBody("");
      fetchTickets();
    }
  }

  async function openDetail(ticketId: string) {
    const res = await fetch(`/api/v1/support/${ticketId}`);
    if (res.ok) {
      setDetailTicket((await res.json()).data);
      setDetailOpen(true);
      setReply("");
    }
  }

  async function handleReply() {
    if (!detailTicket || !reply.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/v1/support/${detailTicket.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setSaving(false);
    if (res.ok) {
      setReply("");
      openDetail(detailTicket.id);
      fetchTickets();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Support</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No support tickets. Create one if you need help.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(t.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.subject}</span>
                    <StatusBadge status={t.status} />
                    <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t._count.messages} messages · Updated {formatDateTime(t.updatedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="bug">Bug Report</option>
                <option value="question">Question</option>
                <option value="feature_request">Feature Request</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px]" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !subject.trim() || !body.trim()}>
              {saving ? "Creating..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {detailTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detailTicket.subject}
                  <StatusBadge status={detailTicket.status} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {detailTicket.messages.map((m) => (
                  <div key={m.id} className={cn(
                    "rounded-lg p-3 text-sm",
                    m.isStaff ? "bg-blue-50 border border-blue-100" : "bg-muted"
                  )}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{m.isStaff ? "Support Team" : "You"}</span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
                {detailTicket.status !== "closed" && (
                  <div className="flex gap-2">
                    <Input placeholder="Reply..." value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReply()} />
                    <Button size="icon" onClick={handleReply} disabled={saving || !reply.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
