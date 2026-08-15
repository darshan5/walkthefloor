import { prisma } from "@/lib/prisma";

const INBOXCLERK_BASE = "https://inboxclerk.com/api/data";

export async function getConfig(organizationId: string) {
  let config = await prisma.guestServiceConfig.findUnique({ where: { organizationId } });
  if (!config) {
    config = await prisma.guestServiceConfig.create({
      data: { organizationId },
    });
  }
  return {
    id: config.id,
    isEnabled: config.isEnabled,
    hasApiKey: !!config.inboxClerkApiKey,
    lastSyncAt: config.lastSyncAt,
    lastSyncError: config.lastSyncError,
  };
}

export async function saveConfig(
  organizationId: string,
  data: { inboxClerkApiKey?: string; isEnabled?: boolean }
) {
  const existing = await prisma.guestServiceConfig.findUnique({ where: { organizationId } });
  if (existing) {
    return prisma.guestServiceConfig.update({
      where: { organizationId },
      data,
    });
  }
  return prisma.guestServiceConfig.create({
    data: { organizationId, ...data },
  });
}

export async function testSavedConnection(organizationId: string): Promise<{ ok: boolean; error?: string }> {
  const config = await prisma.guestServiceConfig.findUnique({ where: { organizationId } });
  if (!config?.inboxClerkApiKey) return { ok: false, error: "No API key configured" };
  return testConnection(config.inboxClerkApiKey);
}

export async function testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${INBOXCLERK_BASE}/dunkinguestfeedbackextractor/schema`, {
      headers: { "X-API-Key": apiKey },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: "Invalid API key" };
    if (res.status === 403) return { ok: false, error: "API key does not have access to guest feedback data" };
    return { ok: false, error: `API returned ${res.status}` };
  } catch {
    return { ok: false, error: "Could not connect to InboxClerk" };
  }
}

async function fetchInboxClerkRecords(
  apiKey: string,
  slug: string,
  dateFrom?: string
): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const allRecords: Array<{ id: string; data: Record<string, any> }> = [];
  let page = 1;
  const limit = 100;

  while (true) {
    try {
      let res;
      if (dateFrom) {
        res = await fetch(`${INBOXCLERK_BASE}/${slug}/query`, {
          method: "POST",
          headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ dateFrom, limit, offset: (page - 1) * limit }),
        });
      } else {
        res = await fetch(`${INBOXCLERK_BASE}/${slug}?page=${page}&limit=${limit}`, {
          headers: { "X-API-Key": apiKey },
        });
      }

      if (!res.ok) break;

      const body = await res.json();
      const records = body.records || [];
      allRecords.push(...records);

      if (dateFrom) {
        if (records.length < limit) break;
      } else {
        const pagination = body.pagination;
        if (!pagination || page >= pagination.totalPages) break;
      }
      page++;
    } catch {
      break;
    }
  }

  return allRecords;
}

export async function syncGuestData(organizationId: string, daysBack?: number) {
  const config = await prisma.guestServiceConfig.findUnique({ where: { organizationId } });
  if (!config?.inboxClerkApiKey) return { skipped: true };
  if (!daysBack && !config.isEnabled) return { skipped: true };

  const locations = await prisma.location.findMany({
    where: { organizationId, storeNumber: { not: null } },
    select: { id: true, storeNumber: true },
  });

  const storeMap = new Map<string, string>();
  for (const loc of locations) {
    if (loc.storeNumber) storeMap.set(loc.storeNumber, loc.id);
  }

  const dateFrom = daysBack
    ? new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : config.lastSyncAt
      ? config.lastSyncAt.toISOString().split("T")[0]
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  let surveysSynced = 0;
  let complaintsSynced = 0;
  let unmatched = 0;

  try {
    const surveyRecords = await fetchInboxClerkRecords(
      config.inboxClerkApiKey,
      "dunkinguestfeedbackextractor",
      dateFrom
    );

    for (const record of surveyRecords) {
      const d = record.data;
      const locationId = storeMap.get(d.restaurant_id);
      if (!locationId) { unmatched++; continue; }
      if (!d.survey_id) continue;

      await prisma.guestSurvey.upsert({
        where: { surveyId: d.survey_id },
        create: {
          surveyId: d.survey_id,
          locationId,
          organizationId,
          reportDate: new Date(d.report_date),
          transactionDate: new Date(d.transaction_date),
          responseDate: new Date(d.response_date),
          osatScore: d.osat_score != null ? parseFloat(String(d.osat_score)) : null,
          ltrScore: d.ltr_score != null ? parseFloat(String(d.ltr_score)) : null,
          accuracy: d.accuracy || null,
          offeredSample: d.offered_sample ?? null,
          guestComment: d.guest_comment || null,
          surveyUrl: d.survey_url || null,
          restaurantAddress: d.restaurant_address || null,
          inboxClerkRecordId: record.id,
        },
        update: {
          osatScore: d.osat_score != null ? parseFloat(String(d.osat_score)) : null,
          ltrScore: d.ltr_score != null ? parseFloat(String(d.ltr_score)) : null,
          accuracy: d.accuracy || null,
          offeredSample: d.offered_sample ?? null,
          guestComment: d.guest_comment || null,
        },
      });
      surveysSynced++;
    }

    const complaintRecords = await fetchInboxClerkRecords(
      config.inboxClerkApiKey,
      "dbi-guest-complaint-cases",
      dateFrom
    );

    for (const record of complaintRecords) {
      const d = record.data;
      const locationId = storeMap.get(d.pc_number);
      if (!locationId) { unmatched++; continue; }
      if (!d.case_number) continue;

      await prisma.guestComplaint.upsert({
        where: { caseNumber: d.case_number },
        create: {
          caseNumber: d.case_number,
          locationId,
          organizationId,
          contactReceivedDate: d.contact_received_date ? new Date(d.contact_received_date) : null,
          incidentDate: d.incident_date ? new Date(d.incident_date) : null,
          incidentHour: d.incident_hour || null,
          reasonForContact: d.reason_for_contact || "Unknown",
          caseOrigin: d.case_origin || null,
          guestName: d.guest_name || "Unknown",
          guestEmail: d.guest_email || null,
          guestPhone: d.guest_phone || null,
          restaurantAddress: d.restaurant_address || null,
          restaurantCity: d.restaurant_city || null,
          restaurantState: d.restaurant_state || null,
          productInvolved: d.product_involved || null,
          visitType: d.visit_type || null,
          loyaltyPointsAdded: d.loyalty_points_added || null,
          moneyOrGiftCardSent: d.money_added_or_gift_card_sent || null,
          nextItemCouponSent: d.next_item_coupon_sent || null,
          guestNotes: d.guest_notes || null,
          franchiseOwner: d.franchise_owner || null,
          comments: d.comments || null,
          inboxClerkRecordId: record.id,
        },
        update: {
          contactReceivedDate: d.contact_received_date ? new Date(d.contact_received_date) : null,
          incidentDate: d.incident_date ? new Date(d.incident_date) : null,
          incidentHour: d.incident_hour || null,
          reasonForContact: d.reason_for_contact || "Unknown",
          caseOrigin: d.case_origin || null,
          guestName: d.guest_name || "Unknown",
          guestEmail: d.guest_email || null,
          guestPhone: d.guest_phone || null,
          restaurantAddress: d.restaurant_address || null,
          restaurantCity: d.restaurant_city || null,
          restaurantState: d.restaurant_state || null,
          productInvolved: d.product_involved || null,
          visitType: d.visit_type || null,
          loyaltyPointsAdded: d.loyalty_points_added || null,
          moneyOrGiftCardSent: d.money_added_or_gift_card_sent || null,
          nextItemCouponSent: d.next_item_coupon_sent || null,
          guestNotes: d.guest_notes || null,
          franchiseOwner: d.franchise_owner || null,
          comments: d.comments || null,
        },
      });
      complaintsSynced++;
    }

    await prisma.guestServiceConfig.update({
      where: { organizationId },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });

    return { surveysSynced, complaintsSynced, unmatched };
  } catch (e: any) {
    await prisma.guestServiceConfig.update({
      where: { organizationId },
      data: { lastSyncError: e.message || "Sync failed" },
    });
    throw e;
  }
}

export async function syncAllOrgs() {
  const configs = await prisma.guestServiceConfig.findMany({
    where: { isEnabled: true, inboxClerkApiKey: { not: null } },
  });

  const results = [];
  for (const config of configs) {
    try {
      const result = await syncGuestData(config.organizationId);
      results.push({ orgId: config.organizationId, ...result });
    } catch (e: any) {
      results.push({ orgId: config.organizationId, error: e.message });
    }
  }
  return results;
}

export async function getTrends(
  organizationId: string,
  locationIds: string[],
  filters: { locationId?: string; months?: number }
) {
  const monthsBack = filters.months || 6;
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);

  const where: any = {
    organizationId,
    locationId: { in: locationIds },
    transactionDate: { gte: since },
  };
  if (filters.locationId) where.locationId = filters.locationId;

  const surveys = await prisma.guestSurvey.findMany({
    where,
    select: {
      transactionDate: true,
      osatScore: true,
      ltrScore: true,
      locationId: true,
    },
    orderBy: { transactionDate: "asc" },
  });

  const monthlyMap = new Map<string, { osatSum: number; ltrSum: number; osatCount: number; ltrCount: number; total: number }>();
  const locationMap = new Map<string, { osatSum: number; ltrSum: number; osatCount: number; ltrCount: number; total: number }>();

  for (const s of surveys) {
    const monthKey = `${s.transactionDate.getFullYear()}-${String(s.transactionDate.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { osatSum: 0, ltrSum: 0, osatCount: 0, ltrCount: 0, total: 0 });
    const m = monthlyMap.get(monthKey)!;
    if (s.osatScore != null) { m.osatSum += s.osatScore; m.osatCount++; }
    if (s.ltrScore != null) { m.ltrSum += s.ltrScore; m.ltrCount++; }
    m.total++;

    if (!locationMap.has(s.locationId)) locationMap.set(s.locationId, { osatSum: 0, ltrSum: 0, osatCount: 0, ltrCount: 0, total: 0 });
    const l = locationMap.get(s.locationId)!;
    if (s.osatScore != null) { l.osatSum += s.osatScore; l.osatCount++; }
    if (s.ltrScore != null) { l.ltrSum += s.ltrScore; l.ltrCount++; }
    l.total++;
  }

  const monthly = Array.from(monthlyMap.entries())
    .map(([month, d]) => ({
      month,
      avgOsat: d.osatCount > 0 ? Math.round((d.osatSum / d.osatCount) * 10) / 10 : null,
      avgLtr: d.ltrCount > 0 ? Math.round((d.ltrSum / d.ltrCount) * 10) / 10 : null,
      count: d.total,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonth = new Date(now);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

  const currentData = monthly.find((m) => m.month === currentMonthKey);
  const prevData = monthly.find((m) => m.month === prevMonthKey);

  const locations = await prisma.location.findMany({
    where: { id: { in: Array.from(locationMap.keys()) } },
    select: { id: true, name: true },
  });
  const locationNameMap = new Map(locations.map((l) => [l.id, l.name]));

  return {
    summary: {
      currentMonth: currentData || { avgOsat: null, avgLtr: null, count: 0 },
      previousMonth: prevData || { avgOsat: null, avgLtr: null, count: 0 },
    },
    monthly,
    byLocation: Array.from(locationMap.entries()).map(([locId, d]) => ({
      locationId: locId,
      locationName: locationNameMap.get(locId) || "Unknown",
      avgOsat: d.osatCount > 0 ? Math.round((d.osatSum / d.osatCount) * 10) / 10 : null,
      avgLtr: d.ltrCount > 0 ? Math.round((d.ltrSum / d.ltrCount) * 10) / 10 : null,
      count: d.total,
    })),
  };
}

export async function getComplaints(
  organizationId: string,
  locationIds: string[],
  filters: { month?: string; locationId?: string; responded?: string }
) {
  const where: any = {
    organizationId,
    locationId: { in: locationIds },
  };

  if (filters.locationId) where.locationId = filters.locationId;

  if (filters.month) {
    const [year, mon] = filters.month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    where.incidentDate = { gte: start, lt: end };
  }

  if (filters.responded === "yes") {
    where.responseText = { not: null };
  } else if (filters.responded === "no") {
    where.responseText = null;
  }

  const complaints = await prisma.guestComplaint.findMany({
    where,
    orderBy: { incidentDate: "desc" },
    take: 200,
  });

  const locIds = [...new Set(complaints.map((c) => c.locationId))];
  const locations = await prisma.location.findMany({
    where: { id: { in: locIds } },
    select: { id: true, name: true },
  });
  const locMap = new Map(locations.map((l) => [l.id, l.name]));

  return complaints.map((c) => ({
    ...c,
    locationName: locMap.get(c.locationId) || "Unknown",
  }));
}

export async function getComplaintCounts(
  organizationId: string,
  locationIds: string[],
  month?: string,
  locationId?: string
) {
  const where: any = {
    organizationId,
    locationId: locationId ? locationId : { in: locationIds },
  };

  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    where.incidentDate = { gte: start, lt: end };
  }

  const total = await prisma.guestComplaint.count({ where });
  const responded = await prisma.guestComplaint.count({ where: { ...where, responseText: { not: null } } });

  return { total, responded, needsResponse: total - responded };
}

export async function getComplaint(id: string, organizationId: string) {
  const complaint = await prisma.guestComplaint.findFirst({
    where: { id, organizationId },
  });
  if (!complaint) return null;

  const location = await prisma.location.findFirst({
    where: { id: complaint.locationId },
    select: { id: true, name: true },
  });

  let respondedBy = null;
  if (complaint.respondedById) {
    respondedBy = await prisma.user.findFirst({
      where: { id: complaint.respondedById },
      select: { id: true, name: true, title: true },
    });
  }

  return { ...complaint, location, respondedBy };
}

export async function respondToComplaint(
  id: string,
  organizationId: string,
  userId: string,
  responseText: string
) {
  const complaint = await prisma.guestComplaint.findFirst({
    where: { id, organizationId },
  });
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.responseText) throw new Error("Complaint already has a response");

  return prisma.guestComplaint.update({
    where: { id },
    data: {
      responseText,
      respondedById: userId,
      respondedAt: new Date(),
    },
  });
}
