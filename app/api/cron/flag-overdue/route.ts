import { flagOverdueItems } from "@/lib/services/cron-service";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await flagOverdueItems();
    return Response.json({
      message: "Overdue items flagged",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Cron flag-overdue failed:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
