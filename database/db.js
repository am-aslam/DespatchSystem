import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Determine database file path (Use /tmp directory on Vercel / serverless deployments)
function getDatabasePath() {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NEXT_PUBLIC_VERCEL_ENV
  );

  if (isServerless) {
    return path.join("/tmp", "gold_sales.db");
  }

  return path.join(process.cwd(), "gold_sales.db");
}

const dbPath = getDatabasePath();

let db;
try {
  db = new Database(dbPath);
  try {
    db.pragma("journal_mode = WAL");
  } catch (e) {
    db.pragma("journal_mode = DELETE");
  }
} catch (err) {
  console.error("Primary database path failed, attempting fallback to /tmp/gold_sales.db:", err);
  const fallbackPath = path.join("/tmp", "gold_sales.db");
  db = new Database(fallbackPath);
}

// Initialize Database Schema
export function initDB() {
  try {
    db.pragma("foreign_keys = OFF");

    // 1. Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT CHECK(role IN ('ADMIN', 'MANAGER', 'SALESPERSON')) NOT NULL,
        status TEXT CHECK(status IN ('ACTIVE', 'INACTIVE')) NOT NULL DEFAULT 'ACTIVE',
        first_login INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Dispatches Table (One Dispatch = Collection of many ornaments)
    db.exec(`
      CREATE TABLE IF NOT EXISTS dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_no TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 3. DispatchItems Table (Many Ornaments inside a Dispatch)
    db.exec(`
      CREATE TABLE IF NOT EXISTS dispatch_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER,
        item_number TEXT NOT NULL,
        gross_weight REAL NOT NULL,
        stone_weight REAL NOT NULL DEFAULT 0.0,
        pearl_weight REAL NOT NULL DEFAULT 0.0,
        net_weight REAL NOT NULL,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 4. Assignments Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(dispatch_id, user_id)
      );
    `);

    // Safe Schema Column Migrations for existing databases
    try {
      db.exec("ALTER TABLE dispatch_items ADD COLUMN dispatch_id INTEGER REFERENCES dispatches(id) ON DELETE CASCADE;");
    } catch (e) {}

    try {
      db.exec("ALTER TABLE dispatch_items ADD COLUMN pearl_weight REAL DEFAULT 0.0;");
    } catch (e) {}

    try {
      db.exec("ALTER TABLE dispatch_items ADD COLUMN created_by INTEGER;");
    } catch (e) {}

    try {
      db.exec("ALTER TABLE sales_history ADD COLUMN remarks TEXT DEFAULT '';");
    } catch (e) {}

    try {
      db.exec("ALTER TABLE drop_history ADD COLUMN remarks TEXT DEFAULT '';");
    } catch (e) {}

    try {
      db.exec("ALTER TABLE trash ADD COLUMN remarks TEXT DEFAULT '';");
    } catch (e) {}

    // 5. SalesHistory Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER,
        salesperson_id INTEGER NOT NULL,
        gross_weight REAL NOT NULL,
        stone_weight REAL NOT NULL DEFAULT 0.0,
        pearl_weight REAL NOT NULL DEFAULT 0.0,
        net_weight REAL NOT NULL,
        remarks TEXT NOT NULL DEFAULT '',
        sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 6. DropHistory Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS drop_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER,
        salesperson_id INTEGER NOT NULL,
        gross_weight REAL NOT NULL,
        stone_weight REAL NOT NULL DEFAULT 0.0,
        pearl_weight REAL NOT NULL DEFAULT 0.0,
        net_weight REAL NOT NULL,
        remarks TEXT NOT NULL DEFAULT '',
        drop_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 7. Trash Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS trash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dispatch_id INTEGER,
        item_number TEXT NOT NULL,
        item_name TEXT NOT NULL DEFAULT 'Gold Ornament',
        salesperson_id INTEGER NOT NULL,
        gross_weight REAL NOT NULL,
        stone_weight REAL NOT NULL DEFAULT 0.0,
        pearl_weight REAL NOT NULL DEFAULT 0.0,
        net_weight REAL NOT NULL,
        remarks TEXT NOT NULL DEFAULT '',
        status TEXT CHECK(status IN ('SOLD', 'DROP')) NOT NULL,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 8. ActivityLogs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // 9. Speed Indexes for ultra-fast query performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_dispatch_items_dispatch ON dispatch_items(dispatch_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_dispatch_user ON assignments(dispatch_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales_history(salesperson_id);
      CREATE INDEX IF NOT EXISTS idx_trash_salesperson ON trash(salesperson_id);
    `);

    db.pragma("foreign_keys = ON");

    seedDefaultUsers();

    // Auto-restore database tables from persistent JSON backup if DB was reset
    try {
      const { restoreBackup } = require("./backup");
      restoreBackup(db);
    } catch (e) {
      console.error("Auto-restore backup error:", e);
    }
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

// Seed Permanent Employee ID Accounts
function seedDefaultUsers() {
  try {
    const adminPassword = bcrypt.hashSync("admin123", 10);
    const managerPassword = bcrypt.hashSync("manager123", 10);

    const defaultUsers = [
      {
        employee_id: "AD001",
        full_name: "Admin User",
        email: "admin@aurum.com",
        password_hash: adminPassword,
        role: "ADMIN",
        status: "ACTIVE",
        first_login: 0,
      },
      {
        employee_id: "MG001",
        full_name: "Manager User",
        email: "manager@aurum.com",
        password_hash: managerPassword,
        role: "MANAGER",
        status: "ACTIVE",
        first_login: 0,
      },
      {
        employee_id: "SL001",
        full_name: "SIJI CMS",
        email: "siji@aurum.com",
        password_hash: null,
        role: "SALESPERSON",
        status: "ACTIVE",
        first_login: 1,
      },
      {
        employee_id: "SL002",
        full_name: "MHD SHAMIL",
        email: "mhdshamil@aurum.com",
        password_hash: null,
        role: "SALESPERSON",
        status: "ACTIVE",
        first_login: 1,
      },
      {
        employee_id: "SL003",
        full_name: "SHAMIL VK",
        email: "shamilvk@aurum.com",
        password_hash: null,
        role: "SALESPERSON",
        status: "ACTIVE",
        first_login: 1,
      },
      {
        employee_id: "SL004",
        full_name: "BABU",
        email: "babu@aurum.com",
        password_hash: null,
        role: "SALESPERSON",
        status: "ACTIVE",
        first_login: 1,
      },
      {
        employee_id: "SL005",
        full_name: "SHAMEER",
        email: "shameer@aurum.com",
        password_hash: null,
        role: "SALESPERSON",
        status: "ACTIVE",
        first_login: 1,
      },
    ];

    const checkStmt = db.prepare("SELECT id FROM users WHERE employee_id = ?");
    const insertStmt = db.prepare(`
      INSERT INTO users (employee_id, full_name, email, password_hash, role, status, first_login)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const seedTransaction = db.transaction(() => {
      for (const u of defaultUsers) {
        const existing = checkStmt.get(u.employee_id);
        if (!existing) {
          insertStmt.run(
            u.employee_id,
            u.full_name,
            u.email,
            u.password_hash,
            u.role,
            u.status,
            u.first_login
          );
        }
      }
    });

    seedTransaction();
  } catch (err) {
    console.error("Error seeding default users:", err);
  }
}

initDB();

export default db;
