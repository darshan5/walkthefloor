"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Phone, Mail, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";

type ComplaintDetail = {
  id: string;
  caseNumber: string;
  locationId: string;
  contactReceivedDate: string | null;
  incidentDate: string | null;
  incidentHour: string | null;
  reasonForContact: string;
  caseOrigin: string | null;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  restaurantAddress: string | null;
  restaurantCity: string | null;
  restaurantState: string | null;
  productInvolved: string | null;
  visitType: string | null;
  loyaltyPointsAdded: string | null;
  moneyOrGiftCardSent: string | null;
  nextItemCouponSent: string | null;
  guestNotes: string | null;
  comments: string | null;
  responseText: string | null;
  respondedAt: string | null;
  location: { id: string; name: string } | null;
  respondedBy: { id: string; name: string; title: string | null } | null;
};

function YesNoBadge({ value, label }: { value: string | null; label: string }) {
  if (!value) return null;
  const isYes = value.toUpperCase() === "YES";
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={isYes ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
        {value}
      </Badge>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const complaintId = params.complaintId as string;

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  async function fetchComplaint() {
    setLoading(true);
    const res = await fetch(`/api/v1/guest-service/complaints/${complaintId}`);
    if (res.ok) {
      const { data } = await res.json();
      setComplaint(data);
    } else {
      toast.error("Complaint not found");
      router.push("/guest-service");
    }
    setLoading(false);
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();
    if (!responseText.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/v1/guest-service/complaints/${complaintId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responseText }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Response submitted");
      fetchComplaint();
    } else {
      const { error } = await res.json();
      toast.error(error);
    }
  }

  if (loading || !complaint) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  const hasResponse = !!complaint.responseText;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/guest-service")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">Case #{complaint.caseNumber}</h1>
            <Badge
              variant="outline"
              className={hasResponse
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
              }
            >
              {hasResponse ? "Responded" : "Needs Response"}
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {complaint.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {complaint.location.name}
              </span>
            )}
            {complaint.incidentDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(complaint.incidentDate)}
                {complaint.incidentHour && ` at ${complaint.incidentHour}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Guest Info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Guest Information</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                {complaint.guestName}
              </p>
            </div>
            {complaint.guestEmail && (
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {complaint.guestEmail}
                </p>
              </div>
            )}
            {complaint.guestPhone && (
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {complaint.guestPhone}
                </p>
              </div>
            )}
            {complaint.visitType && (
              <div>
                <p className="text-muted-foreground">Visit Type</p>
                <p className="font-medium">{complaint.visitType}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Details</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <p className="text-muted-foreground">Reason for Contact</p>
              <p className="font-medium">{complaint.reasonForContact}</p>
            </div>
            {complaint.productInvolved && (
              <div>
                <p className="text-muted-foreground">Product Involved</p>
                <p className="font-medium">{complaint.productInvolved}</p>
              </div>
            )}
            {complaint.caseOrigin && (
              <div>
                <p className="text-muted-foreground">Case Origin</p>
                <p className="font-medium">{complaint.caseOrigin}</p>
              </div>
            )}
            {complaint.contactReceivedDate && (
              <div>
                <p className="text-muted-foreground">Contact Received</p>
                <p className="font-medium">{formatDate(complaint.contactReceivedDate)}</p>
              </div>
            )}
          </div>
          {complaint.guestNotes && (
            <div>
              <p className="text-sm text-muted-foreground">Guest Notes</p>
              <p className="text-sm whitespace-pre-wrap">{complaint.guestNotes}</p>
            </div>
          )}
          {complaint.comments && (
            <div>
              <p className="text-sm text-muted-foreground">Comments</p>
              <p className="text-sm whitespace-pre-wrap">{complaint.comments}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remediation */}
      {(complaint.loyaltyPointsAdded || complaint.moneyOrGiftCardSent || complaint.nextItemCouponSent) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Remediation</p>
            <YesNoBadge value={complaint.loyaltyPointsAdded} label="Loyalty Points Added" />
            <YesNoBadge value={complaint.moneyOrGiftCardSent} label="Money / Gift Card Sent" />
            <YesNoBadge value={complaint.nextItemCouponSent} label="Next Item Coupon Sent" />
          </CardContent>
        </Card>
      )}

      {/* Response Section */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Manager Response</p>
          {hasResponse ? (
            <div className="space-y-2">
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Response Submitted</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{complaint.responseText}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {complaint.respondedBy?.name}
                  {complaint.respondedBy?.title && ` (${complaint.respondedBy.title})`}
                  {complaint.respondedAt && ` — ${formatDateTime(complaint.respondedAt)}`}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRespond} className="space-y-3">
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Describe the action taken to address this complaint..."
                rows={4}
                required
              />
              <Button type="submit" disabled={submitting || !responseText.trim()}>
                {submitting ? "Submitting..." : "Submit Response"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
