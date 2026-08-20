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

  // Sync guest service data from InboxClerk — runs daily at 4am ET
  cron.schedule("0 4 * * *", async () => {
    console.log("[cron] Syncing guest service data...");
    try {
      const { syncAllOrgs } = await import("./lib/services/guest-service");
      const results = await syncAllOrgs();
      console.log("[cron] Guest service sync:", results);
    } catch (e) {
      console.error("[cron] Guest service sync failed:", e);
    }
  });

  // Clean completed tasks older than 60 days — runs daily at 3am
  cron.schedule("0 3 * * *", async () => {
    console.log("[cron] Cleaning old completed tasks...");
    try {
      const { cleanCompletedTasks } = await import("./lib/services/task-service");
      const count = await cleanCompletedTasks();
      console.log("[cron] Cleaned completed tasks:", count);
    } catch (e) {
      console.error("[cron] Clean completed tasks failed:", e);
    }
  });

  console.log("[cron] Scheduled: generate-checklists (daily midnight), flag-overdue (every 15min), guest-service-sync (daily 4am), clean-tasks (daily 3am)");
}
