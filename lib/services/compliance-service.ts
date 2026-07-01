import { prisma } from "@/lib/prisma";

export async function getComplianceGrid(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
) {
  const completions = await prisma.taskCompletion.findMany({
    where: {
      instance: {
        locationId,
        location: { organizationId },
        date: { gte: startDate, lte: endDate },
      },
    },
    select: {
      id: true,
      value: true,
      isCompliant: true,
      completedAt: true,
      user: { select: { name: true } },
      task: {
        select: {
          id: true,
          title: true,
          taskType: true,
          config: true,
          equipmentType: { select: { name: true, category: true } },
        },
      },
      instance: {
        select: { date: true, windowLabel: true },
      },
    },
    orderBy: [{ instance: { date: "desc" } }, { task: { sortOrder: "asc" } }],
  });

  const byCategory = new Map<string, Map<string, any[]>>();
  for (const c of completions) {
    const category = c.task?.equipmentType?.category || c.task?.equipmentType?.name || "General";
    const dateKey = new Date(c.instance.date).toISOString().split("T")[0];

    if (!byCategory.has(category)) byCategory.set(category, new Map());
    const dates = byCategory.get(category)!;
    if (!dates.has(dateKey)) dates.set(dateKey, []);
    dates.get(dateKey)!.push(c);
  }

  const categories: any[] = [];
  for (const [category, dateMap] of byCategory) {
    let totalCompliant = 0;
    let totalCount = 0;
    const dates: any[] = [];

    for (const [date, items] of dateMap) {
      const compliant = items.filter((i: any) => i.isCompliant).length;
      totalCompliant += compliant;
      totalCount += items.length;
      dates.push({ date, items, compliant, total: items.length });
    }

    categories.push({
      category,
      compliancePercent: totalCount > 0 ? Math.round((totalCompliant / totalCount) * 1000) / 10 : 0,
      dates,
    });
  }

  return categories;
}

export async function getTaskProgress(
  organizationId: string,
  locationIds: string[],
  weeks: number = 4
) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - weeks * 7);

  const instances = await prisma.checklistInstance.findMany({
    where: {
      location: { organizationId },
      ...(locationIds.length > 0 && { locationId: { in: locationIds } }),
      date: { gte: startDate },
    },
    select: {
      status: true,
      date: true,
      locationId: true,
      location: { select: { name: true } },
    },
  });

  const weekBuckets = new Map<string, { total: number; completed: number }>();
  for (const inst of instances) {
    const d = new Date(inst.date);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split("T")[0];

    if (!weekBuckets.has(key)) weekBuckets.set(key, { total: 0, completed: 0 });
    const bucket = weekBuckets.get(key)!;
    bucket.total++;
    if (inst.status === "COMPLETED") bucket.completed++;
  }

  return Array.from(weekBuckets.entries())
    .map(([weekEnding, data]) => ({
      weekEnding,
      total: data.total,
      completed: data.completed,
      percent: data.total > 0 ? Math.round((data.completed / data.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.weekEnding.localeCompare(b.weekEnding));
}

export async function getCategoryCompliance(
  organizationId: string,
  locationId: string,
  startDate: Date,
  endDate: Date
) {
  const instances = await prisma.checklistInstance.findMany({
    where: {
      locationId,
      location: { organizationId },
      date: { gte: startDate, lte: endDate },
    },
    select: {
      status: true,
      windowLabel: true,
      isCompliant: true,
      template: { select: { category: true } },
    },
  });

  const byCategory = new Map<string, { total: number; compliant: number }>();
  for (const inst of instances) {
    const cat = inst.template.category || "General";
    if (!byCategory.has(cat)) byCategory.set(cat, { total: 0, compliant: 0 });
    const bucket = byCategory.get(cat)!;
    bucket.total++;
    if (inst.status === "COMPLETED" && inst.isCompliant) bucket.compliant++;
  }

  return Array.from(byCategory.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    compliant: data.compliant,
    percent: data.total > 0 ? Math.round((data.compliant / data.total) * 1000) / 10 : 0,
  }));
}

export async function getDailyTasks(
  organizationId: string,
  locationId: string,
  date: Date
) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  return prisma.checklistInstance.findMany({
    where: {
      locationId,
      location: { organizationId },
      date: { gte: date, lt: nextDay },
    },
    include: {
      template: {
        select: { name: true, category: true },
      },
      completions: {
        include: {
          task: { select: { title: true, taskType: true, sortOrder: true } },
          user: { select: { name: true } },
        },
        orderBy: { task: { sortOrder: "asc" } },
      },
    },
    orderBy: [{ windowStart: "asc" }, { template: { name: "asc" } }],
  });
}
