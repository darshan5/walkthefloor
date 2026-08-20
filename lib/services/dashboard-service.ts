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
    prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, ...locationFilter },
    }),
    prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, status: "COMPLETED", ...locationFilter },
    }),
    prisma.checklistInstance.count({
      where: { location: { organizationId }, date: { gte: today, lt: tomorrow }, status: "MISSED", ...locationFilter },
    }),
    prisma.correctiveAction.count({
      where: { location: { organizationId }, status: "OPEN", ...locationFilter },
    }),
    prisma.correctiveAction.count({
      where: { location: { organizationId }, status: "OVERDUE", ...locationFilter },
    }),
    prisma.complaint.count({
      where: { location: { organizationId }, status: { in: ["new", "assigned", "in_progress"] }, ...locationFilter },
    }),
    prisma.task.count({
      where: { organizationId, locationId: { in: locationIds }, status: "open", priority: { in: ["HIGH", "CRITICAL"] }, parentId: null },
    }),
    prisma.task.count({
      where: { organizationId, locationId: { in: locationIds }, status: "open", dueDate: { lt: today }, parentId: null },
    }),
    prisma.workOrder.count({
      where: { location: { organizationId }, status: "submitted", ...locationFilter },
    }),
    prisma.complianceFailure.count({
      where: { locationId: { in: locationIds }, userId, status: "unexcused" },
    }),
    prisma.guestComplaint.count({
      where: { organizationId, locationId: { in: locationIds }, responseText: null },
    }),
  ]);

  const guestOsat = await getOsatTrend(organizationId, locationIds);

  const base = {
    checklists: { total: todayInstances, completed: completedToday, missed: missedToday, pending: todayInstances - completedToday - missedToday },
    correctiveActions: { open: openCAs, overdue: overdueCAs },
    tasks: { urgent: urgentTasks, overdue: overdueTasks },
    complaints: { open: openComplaints },
    maintenance: { pendingApproval: pendingMaintenance },
    guestService: { needsResponse: guestNeedsResponse, osat: guestOsat },
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

async function getOsatTrend(
  organizationId: string,
  locationIds: string[]
): Promise<{ lastMonth: number | null; twoMonthsAgo: number | null; delta: number | null }> {
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const [lastMonthSurveys, twoMonthsAgoSurveys] = await Promise.all([
    prisma.guestSurvey.aggregate({
      where: {
        organizationId,
        locationId: { in: locationIds },
        transactionDate: { gte: lastMonthStart, lt: lastMonthEnd },
        osatScore: { not: null },
      },
      _avg: { osatScore: true },
    }),
    prisma.guestSurvey.aggregate({
      where: {
        organizationId,
        locationId: { in: locationIds },
        transactionDate: { gte: twoMonthsAgoStart, lt: lastMonthStart },
        osatScore: { not: null },
      },
      _avg: { osatScore: true },
    }),
  ]);

  const lastMonth = lastMonthSurveys._avg.osatScore
    ? Math.round(lastMonthSurveys._avg.osatScore * 10) / 10
    : null;
  const twoMonthsAgo = twoMonthsAgoSurveys._avg.osatScore
    ? Math.round(twoMonthsAgoSurveys._avg.osatScore * 10) / 10
    : null;
  const d = lastMonth != null && twoMonthsAgo != null
    ? Math.round((lastMonth - twoMonthsAgo) * 10) / 10
    : null;

  return { lastMonth, twoMonthsAgo, delta: d };
}
