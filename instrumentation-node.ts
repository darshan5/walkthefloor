import cron from "node-cron";

let scheduled = false;

export function startCronJobs() {
  if (scheduled) return;
  scheduled = true;

  // Generate checklist instances — runs daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("[cron] Generating checklist instances...");
    try {
      const { generateChecklistInstances } = await import("./lib/services/cron-service");
      const result = await generateChecklistInstances();
      console.log("[cron] Generated:", result);
    } catch (e) {
      console.error("[cron] Generate failed:", e);
    }
  });

  // Flag overdue items — runs every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[cron] Flagging overdue items...");
    try {
      const { flagOverdueItems } = await import("./lib/services/cron-service");
      const result = await flagOverdueItems();
      console.log("[cron] Flagged:", result);
    } catch (e) {
      console.error("[cron] Flag overdue failed:", e);
    }
  });

  console.log("[cron] Scheduled: generate-checklists (daily midnight), flag-overdue (every 15min)");
}
