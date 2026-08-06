import cron from "node-cron";
import db from "@/database/db";

let cronStarted = false;

export function initCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  // Run cleanup job every hour to delete expired trash records (>24 hours)
  cron.schedule("0 * * * *", () => {
    try {
      const nowISO = new Date().toISOString();
      const stmt = db.prepare("DELETE FROM trash WHERE expires_at <= ?");
      const info = stmt.run(nowISO);
      if (info.changes > 0) {
        console.log(`Cron job purged ${info.changes} expired trash record(s).`);
      }
    } catch (err) {
      console.error("Error running trash cleanup cron job:", err);
    }
  });

  console.log("Trash cleanup cron job initialized (runs hourly).");
}

// Auto init on import
initCronJobs();
