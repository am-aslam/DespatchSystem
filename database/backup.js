import fs from "fs";
import path from "path";

// File path for persistent JSON database backup (Safe for Vercel read-only filesystem)
function getBackupFilePath() {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_PUBLIC_VERCEL_ENV
  );

  if (isServerless) {
    return path.join("/tmp", "gold_sales_backup.json");
  }

  try {
    const p = path.join(process.cwd(), "gold_sales_backup.json");
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return p;
  } catch (e) {
    return path.join("/tmp", "gold_sales_backup.json");
  }
}

/**
 * Save snapshot of all database tables to persistent JSON backup file & Node global cache
 */
export function saveBackup(db) {
  try {
    if (!db) {
      db = require("./db").default;
    }

    const backupData = {
      users: db.prepare("SELECT * FROM users").all(),
      dispatches: db.prepare("SELECT * FROM dispatches").all(),
      dispatch_items: db.prepare("SELECT * FROM dispatch_items").all(),
      assignments: db.prepare("SELECT * FROM assignments").all(),
      sales_history: db.prepare("SELECT * FROM sales_history").all(),
      drop_history: db.prepare("SELECT * FROM drop_history").all(),
      trash: db.prepare("SELECT * FROM trash").all(),
      activity_logs: db.prepare("SELECT * FROM activity_logs").all(),
      saved_at: new Date().toISOString(),
    };

    // Save to Node global memory cache
    global._gold_sales_store = backupData;

    // Save to disk backup
    const filePath = getBackupFilePath();
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save JSON database backup:", err);
  }
}

/**
 * Restore database tables from JSON backup file or global memory cache
 */
export function restoreBackup(db) {
  try {
    if (!db) {
      db = require("./db").default;
    }

    let data = global._gold_sales_store;

    if (!data) {
      const filePath = getBackupFilePath();
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        if (fileContent && fileContent.trim()) {
          data = JSON.parse(fileContent);
        }
      }
    }

    if (!data) return false;

    db.transaction(() => {
      // 1. Restore Users
      if (Array.isArray(data.users) && data.users.length > 0) {
        const insertUser = db.prepare(`
          INSERT OR REPLACE INTO users (id, employee_id, full_name, email, password_hash, role, status, first_login, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of data.users) {
          insertUser.run(
            u.id,
            u.employee_id,
            u.full_name,
            u.email,
            u.password_hash,
            u.role,
            u.status || "ACTIVE",
            u.first_login ?? 1,
            u.created_at || new Date().toISOString(),
            u.updated_at || new Date().toISOString()
          );
        }
      }

      // 2. Restore Dispatches
      if (Array.isArray(data.dispatches)) {
        const insertDispatch = db.prepare(`
          INSERT OR REPLACE INTO dispatches (id, dispatch_no, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const d of data.dispatches) {
          insertDispatch.run(
            d.id,
            d.dispatch_no,
            d.created_by,
            d.created_at || new Date().toISOString(),
            d.updated_at || new Date().toISOString()
          );
        }
      }

      // 3. Restore DispatchItems
      if (Array.isArray(data.dispatch_items)) {
        const insertItem = db.prepare(`
          INSERT OR REPLACE INTO dispatch_items (id, dispatch_id, item_number, gross_weight, stone_weight, pearl_weight, net_weight, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of data.dispatch_items) {
          insertItem.run(
            item.id,
            item.dispatch_id,
            item.item_number,
            item.gross_weight,
            item.stone_weight || 0,
            item.pearl_weight || 0,
            item.net_weight,
            item.created_by || 1,
            item.created_at || new Date().toISOString()
          );
        }
      }

      // 4. Restore Assignments
      if (Array.isArray(data.assignments)) {
        const insertAssign = db.prepare(`
          INSERT OR IGNORE INTO assignments (id, dispatch_id, user_id, created_at)
          VALUES (?, ?, ?, ?)
        `);
        for (const a of data.assignments) {
          insertAssign.run(
            a.id,
            a.dispatch_id,
            a.user_id,
            a.created_at || new Date().toISOString()
          );
        }
      }

      // 5. Restore SalesHistory
      if (Array.isArray(data.sales_history)) {
        const insertSale = db.prepare(`
          INSERT OR REPLACE INTO sales_history (id, dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks, sale_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of data.sales_history) {
          insertSale.run(
            s.id,
            s.dispatch_id,
            s.salesperson_id,
            s.gross_weight,
            s.stone_weight || 0,
            s.pearl_weight || 0,
            s.net_weight,
            s.remarks || "",
            s.sale_date || new Date().toISOString()
          );
        }
      }

      // 6. Restore DropHistory
      if (Array.isArray(data.drop_history)) {
        const insertDrop = db.prepare(`
          INSERT OR REPLACE INTO drop_history (id, dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks, drop_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const dr of data.drop_history) {
          insertDrop.run(
            dr.id,
            dr.dispatch_id,
            dr.salesperson_id,
            dr.gross_weight,
            dr.stone_weight || 0,
            dr.pearl_weight || 0,
            dr.net_weight,
            dr.remarks || "",
            dr.drop_date || new Date().toISOString()
          );
        }
      }

      // 7. Restore Trash
      if (Array.isArray(data.trash)) {
        const insertTrash = db.prepare(`
          INSERT OR REPLACE INTO trash (id, dispatch_id, item_number, item_name, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks, status, deleted_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const farFuture = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();
        for (const t of data.trash) {
          insertTrash.run(
            t.id,
            t.dispatch_id,
            t.item_number,
            t.item_name || "Gold Ornament",
            t.salesperson_id,
            t.gross_weight,
            t.stone_weight || 0,
            t.pearl_weight || 0,
            t.net_weight,
            t.remarks || "",
            t.status,
            t.deleted_at || new Date().toISOString(),
            t.expires_at || farFuture
          );
        }
      }

      // 8. Restore ActivityLogs
      if (Array.isArray(data.activity_logs)) {
        const insertLog = db.prepare(`
          INSERT OR REPLACE INTO activity_logs (id, user_id, action, description, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const l of data.activity_logs) {
          insertLog.run(
            l.id,
            l.user_id,
            l.action,
            l.description,
            l.created_at || new Date().toISOString()
          );
        }
      }
    })();

    console.log("Database successfully restored from JSON backup / memory cache!");
    return true;
  } catch (err) {
    console.error("Failed to restore database from backup:", err);
    return false;
  }
}
