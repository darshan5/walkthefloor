import { generateChecklistInstances } from "@/lib/services/cron-service";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateChecklistInstances();
    return Response.json({
      message: "Checklist instances generated",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Cron generate-checklists failed:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
