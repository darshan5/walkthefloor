"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wrench, MapPin, ArrowLeft, AlertTriangle, DollarSign, Clock, Shield } from "lucide-react";
import { formatDate } from "@/lib/utils";

const CONDITION_COLORS: Record<string, string> = {
  GOOD: "bg-green-50 text-green-700 border-green-200",
  FAIR: "bg-yellow-50 text-yellow-700 border-yellow-200",
  POOR: "bg-orange-50 text-orange-700 border-orange-200",
  OUT_OF_SERVICE: "bg-red-50 text-red-700 border-red-200",
};

type EquipmentData = {
  id: string;
  instanceName: string;
  model: string | null;
  serialNumber: string | null;
  installDate: string | null;
  warrantyExpiry: string | null;
  purchaseCost: number | null;
  condition: string | null;
  trackingCode: string | null;
  notes: string | null;
  equipmentType: { id: string; name: string; category: string | null };
  location: { id: string; name: string };
  maintenanceHistory: { id: string; title: string; status: string; actualCost: number | null; createdAt: string }[];
  totalActualCost: number;
};

export default function EquipmentTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const trackingCode = params.trackingCode as string;
  const [data, setData] = useState<EquipmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/equipment-instances/by-code/${trackingCode}`)
      .then((r) => r.json())
      .then(({ data }) => setData(data || null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [trackingCode]);

  function getWarrantyStatus(expiryDate: string | null) {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: "Expired", color: "text-red-600" };
    if (days <= 30) return { label: `Expiring in ${days} days`, color: "text-amber-600" };
    return { label: "Active", color: "text-green-600" };
  }

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  if (!data) return (
    <div className="py-12 text-center">
      <Wrench className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Equipment not found</p>
      <p className="text-sm text-muted-foreground mt-1">Tracking code: {trackingCode}</p>
    </div>
  );

  const warranty = getWarrantyStatus(data.warrantyExpiry);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{data.instanceName}</h1>
          <p className="text-sm text-muted-foreground">{data.equipmentType.name}{data.model ? ` · ${data.model}` : ""}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{data.location.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Condition</p>
              <Badge variant="outline" className={CONDITION_COLORS[data.condition || "GOOD"] || ""}>
                {data.condition === "OUT_OF_SERVICE" ? "Out of Service" : data.condition || "GOOD"}
              </Badge>
            </div>
            {data.serialNumber && <div><p className="text-muted-foreground">Serial #</p><p className="font-medium">{data.serialNumber}</p></div>}
            {data.installDate && <div><p className="text-muted-foreground">Installed</p><p className="font-medium">{formatDate(data.installDate)}</p></div>}
            {data.purchaseCost != null && <div><p className="text-muted-foreground">Purchase Cost</p><p className="font-medium">${data.purchaseCost.toFixed(2)}</p></div>}
            {warranty && (
              <div>
                <p className="text-muted-foreground">Warranty</p>
                <span className={`font-medium ${warranty.color}`}>{warranty.label}</span>
              </div>
            )}
          </div>
          {data.trackingCode && (
            <div className="rounded-md bg-muted p-2 text-center">
              <p className="text-xs text-muted-foreground"><Shield className="inline h-3 w-3 mr-1" />Tracking Code</p>
              <p className="text-sm font-mono font-bold">{data.trackingCode}</p>
            </div>
          )}
          {data.notes && <p className="text-sm whitespace-pre-wrap">{data.notes}</p>}
        </CardContent>
      </Card>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total Maintenance</p>
            <p className="text-xl font-bold">${data.totalActualCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="h-3 w-3" />Work Orders</p>
            <p className="text-xl font-bold">{data.maintenanceHistory.length}</p>
          </CardContent>
        </Card>
      </div>

      {data.purchaseCost && data.totalActualCost > data.purchaseCost * 0.5 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Consider Replacement</p>
              <p className="text-xs text-amber-700">
                Maintenance ({Math.round(data.totalActualCost / data.purchaseCost * 100)}% of purchase price) suggests replacement may be more cost-effective.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.maintenanceHistory.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> History</h3>
          <div className="space-y-2">
            {data.maintenanceHistory.map((wo) => (
              <Card key={wo.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{wo.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(wo.createdAt)} · {wo.status}</p>
                  </div>
                  {wo.actualCost != null && <p className="text-sm font-medium">${wo.actualCost.toFixed(2)}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
