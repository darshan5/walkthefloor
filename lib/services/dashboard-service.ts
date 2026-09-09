import { prisma } from "@/lib/prisma";

export async function getRoleDashboard(
  organizationId: string,
  userId: string,
  locationIds: string[],
  role: string
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const locationFilter = locationIds.length > 0
    ? { locationId: { in: locationIds } }
    : {};

  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { settings: true },
  });
  const modules = (org?.settings as any)?.modules || {};
  const hasChecklists = modules.checklists !== false;
  const hasTasks = modules.tasks !== false;
  const hasMaintenance = modules.maintenance !== false;
  const hasGuestService = modules.guest_service !== false;

  const zero = Promise.resolve(0);

  const [
    todayInstances,
    completedToday,
    missedToday,
    openCAs,
    overdueCAs,
    openComplaints,
    urgentTasks,
    overdueTasks,
    pendingMaintenance,
    myFailures,
    guestNeedsResponse,
  ] = await Promise.all([
    hasChecklists ? prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, ...locationFilter },
    }) : zero,
    hasChecklists ? prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, status: "COMPLETED", ...locationFilter },
    }) : zero,
    hasChecklists ? prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, status: "MISSED", ...locationFilter },
    }) : zero,
    hasChecklists ? prisma.correctiveAction.count({
      where: { location: { organizationId }, status: "OPEN", ...locationFilter },
    }) : zero,
    hasChecklists ? prisma.correctiveAction.count({
      where: { location: { organizationId }, status: "OVERDUE", ...locationFilter },
    }) : zero,
    prisma.complaint.count({
      where: { location: { organizationId }, status: { in: ["new", "assigned", "in_progress"] }, ...locationFilter },
    }),
    hasTasks ? prisma.task.count({
      where: { organizationId, locationId: { in: locationIds }, status: "open", priority: { in: ["HIGH", "CRITICAL"] }, parentId: null },
    }) : zero,
    hasTasks ? prisma.task.count({
      where: { organizationId, locationId: { in: locationIds }, status: "open", dueDate: { lt: today }, parentId: null },
    }) : zero,
    hasMaintenance ? prisma.workOrder.count({
      where: { location: { organizationId }, status: "pending_approval", ...locationFilter },
    }) : zero,
    hasChecklists ? prisma.complianceFailure.count({
      where: { locationId: { in: locationIds }, userId, status: "unexcused" },
    }) : zero,
    hasGuestService ? prisma.guestComplaint.count({
      where: { organizationId, locationId: { in: locationIds }, responseText: null },
    }) : zero,
  ]);

  const guestOsat = hasGuestService
    ? await getOsatTrend(organizationId, locationIds)
    : { lastMonth: null, twoMonthsAgo: null, delta: null };

  const ecosure = hasGuestService
    ? await getLatestEcosureAvg(organizationId, locationIds)
    : { avgScore: null, count: 0 };

  const base = {
    checklists: { total: todayInstances, completed: completedToday, missed: missedToday, pending: todayInstances - completedToday - missedToday },
    correctiveActions: { open: openCAs, overdue: overdueCAs },
    tasks: { urgent: urgentTasks, overdue: overdueTasks },
    complaints: { open: openComplaints },
    maintenance: { pendingApproval: pendingMaintenance },
    guestService: { needsResponse: guestNeedsResponse, osat: guestOsat },
    ecosure,
  };

  if (role === "Multi-unit Manager" || role === "Director of Operations" || role === "Franchisee") {
    const [locationCompliance, failureCounts, pendingExcuses] = await Promise.all([
      getLocationCompliance(organizationId, locationIds, today, tomorrow),
      getFailureCountsByLocation(organizationId, locationIds),
      prisma.complianceFailure.count({
        where: {
          locationId: { in: locationIds },
          status: "pending_review",
        },
      }),
    ]);

    return {
      ...base,
      locationCompliance,
      failureCounts,
      pendingExcuses,
    };
  }

  return { ...base, myFailures };
}

async function getLocationCompliance(
  organizationId: string,
  locationIds: string[],
  today: Date,
  tomorrow: Date
) {
  const locations = await prisma.location.findMany({
    where: { organizationId, id: { in: locationIds }, isActive: true },
    select: { id: true, name: true, storeNumber: true },
  });

  const instances = await prisma.checklistInstance.groupBy({
    by: ["locationId", "status"],
    where: {
      locationId: { in: locationIds },
      date: { gte: today, lt: tomorrow },
    },
    _count: true,
  });

  return locations.map((loc) => {
    const locInstances = instances.filter((i) => i.locationId === loc.id);
    const total = locInstances.reduce((sum, i) => sum + i._count, 0);
    const completed = locInstances.find((i) => i.status === "COMPLETED")?._count || 0;
    return {
      id: loc.id,
      name: loc.name,
      storeNumber: loc.storeNumber,
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });
}

async function getFailureCountsByLocation(organizationId: string, locationIds: string[]) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const failures = await prisma.complianceFailure.groupBy({
    by: ["locationId", "status"],
    where: {
      locationId: { in: locationIds },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });

  const byLocation = new Map<string, { unexcused: number; excused: number; total: number }>();
  for (const f of failures) {
    if (!byLocation.has(f.locationId)) byLocation.set(f.locationId, { unexcused: 0, excused: 0, total: 0 });
    const loc = byLocation.get(f.locationId)!;
    loc.total += f._count;
    if (f.status === "excused") loc.excused += f._count;
    else if (f.status !== "pending_review") loc.unexcused += f._count;
  }

  return Object.fromEntries(byLocation);
}

export async function getAdherenceGrid(
  organizationId: string,
  locationIds: string[],
  startDate: Date,
  endDate: Date
) {
  const locations = await prisma.location.findMany({
    where: { organizationId, id: { in: locationIds }, isActive: true },
    select: { id: true, name: true, storeNumber: true },
  });

  const templates = await prisma.checklistTemplate.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, category: true },
    orderBy: { name: "asc" },
  });

  const instances = await prisma.checklistInstance.findMany({
    where: {
      locationId: { in: locationIds },
      date: { gte: startDate, lte: endDate },
    },
    select: { locationId: true, templateId: true, status: true, date: true, windowLabel: true },
  });

  const grid = locations.map((loc) => {
    const cells = templates.map((tmpl) => {
      const matching = instances.filter((i) => i.locationId === loc.id && i.templateId === tmpl.id);
      const total = matching.length;
      const completed = matching.filter((i) => i.status === "COMPLETED").length;
      const missed = matching.filter((i) => i.status === "MISSED").length;
      const late = matching.filter((i) => i.status === "COMPLETED_LATE").length;
      return {
        templateId: tmpl.id,
        templateName: tmpl.name,
        total,
        completed,
        missed,
        late,
        status: total === 0 ? "none" : missed > 0 ? "missed" : late > 0 ? "late" : completed === total ? "done" : "partial",
      };
    });
    return { locationId: loc.id, locationName: loc.name, storeNumber: loc.storeNumber, cells };
  });

  return { templates, grid };
}

export async function getComplianceFailures(
  organizationId: string,
  locationIds: string[],
  filters: { userId?: string; status?: string }
) {
  return prisma.complianceFailure.findMany({
    where: {
      locationId: { in: locationIds },
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
    },
    include: {
      template: { select: { name: true, category: true } },
      instance: { select: { date: true, windowLabel: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function submitExplanation(
  failureId: string,
  userId: string,
  explanation: string
) {
  const failure = await prisma.complianceFailure.findUnique({ where: { id: failureId } });
  if (!failure) throw new Error("Compliance failure not found");

  return prisma.complianceFailure.update({
    where: { id: failureId },
    data: {
      explanation,
      explainedAt: new Date(),
      explainedById: userId,
      status: "pending_review",
    },
  });
}

export async function reviewExplanation(
  failureId: string,
  reviewerId: string,
  approved: boolean,
  reviewNotes?: string
) {
  const failure = await prisma.complianceFailure.findUnique({ where: { id: failureId } });
  if (!failure) throw new Error("Compliance failure not found");
  if (failure.status !== "pending_review") throw new Error("Not pending review");

  return prisma.complianceFailure.update({
    where: { id: failureId },
    data: {
      status: approved ? "excused" : "denied",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    },
  });
}

async function getLatestEcosureAvg(
  organizationId: string,
  locationIds: string[]
): Promise<{ avgScore: number | null; count: number }> {
  const evals = await prisma.ecosureEvaluation.findMany({
    where: {
      organizationId,
      locationId: { in: locationIds },
      overallScore: { not: null },
    },
    orderBy: { evaluationDate: "desc" },
  });

  const latestByLocation = new Map<string, number>();
  for (const e of evals) {
    if (!latestByLocation.has(e.locationId) && e.overallScore != null) {
      latestByLocation.set(e.locationId, e.overallScore);
    }
  }

  const scores = Array.from(latestByLocation.values());
  if (scores.length === 0) return { avgScore: null, count: 0 };
  return {
    avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    count: scores.length,
  };
}

async function getOsatTrend(
  organizationId: string,
  locationIds: string[]
): Promise<{ lastMonth: number | null; twoMonthsAgo: number | null; delta: number | null }> {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoKey = `${twoMonthsAgoDate.getFullYear()}-${String(twoMonthsAgoDate.getMonth() + 1).padStart(2, "0")}`;

  const lastMonthScores = await prisma.guestMonthlyScore.findMany({
    where: { organizationId, locationId: { in: locationIds }, reportingMonth: lastMonthKey, osat: { not: null } },
    select: { osat: true },
  });

  const twoMonthsAgoScores = await prisma.guestMonthlyScore.findMany({
    where: { organizationId, locationId: { in: locationIds }, reportingMonth: twoMonthsAgoKey, osat: { not: null } },
    select: { osat: true },
  });

  const avg = (scores: { osat: number | null }[]) => {
    const valid = scores.filter((s) => s.osat != null) as { osat: number }[];
    if (valid.length === 0) return null;
    return Math.round((valid.reduce((sum, s) => sum + s.osat, 0) / valid.length) * 10) / 10;
  };

  const lastMonth = avg(lastMonthScores);
  const twoMonthsAgo = avg(twoMonthsAgoScores);
  const d = lastMonth != null && twoMonthsAgo != null
    ? Math.round((lastMonth - twoMonthsAgo) * 10) / 10
    : null;

  return { lastMonth, twoMonthsAgo, delta: d };
}
