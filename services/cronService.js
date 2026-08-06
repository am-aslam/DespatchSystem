import cron from "node-cron";
import db from "@/database/db";

let cronStarted = false;

export function initCronJobs() {
  if (cronStarted) return;
  cronStarted = true;

  // Trash records are retained permanently until manually purged by Admin
  console.log("Cron service initialized (auto-purge disabled to protect trash records).");
}

// Auto init on import
initCronJobs();
