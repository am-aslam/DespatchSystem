import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "gold_sales.db");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Database Schema
export function initDB() {
  // Drop legacy users table if schema differs or alter safely
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_v2 (
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

  // Alias table to users
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

  // Migration: Ensure employee_id column exists if older table was present
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasEmployeeId = tableInfo.some((col) => col.name === "employee_id");
    if (!hasEmployeeId) {
      db.exec("DROP TABLE users");
      db.exec(`
        CREATE TABLE users (
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
    }
  } catch (err) {
    console.error("Migration error check on users table:", err);
  }

  // 2. DispatchItems Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispatch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_number TEXT UNIQUE NOT NULL,
      gross_weight REAL NOT NULL,
      stone_weight REAL NOT NULL DEFAULT 0.0,
      pearl_weight REAL NOT NULL DEFAULT 0.0,
      net_weight REAL NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Assignments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispatch_id) REFERENCES dispatch_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(dispatch_id, user_id)
    );
  `);

  // 4. SalesHistory Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER,
      salesperson_id INTEGER NOT NULL,
      gross_weight REAL NOT NULL,
      stone_weight REAL NOT NULL DEFAULT 0.0,
      pearl_weight REAL NOT NULL DEFAULT 0.0,
      net_weight REAL NOT NULL,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. DropHistory Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drop_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dispatch_id INTEGER,
      salesperson_id INTEGER NOT NULL,
      gross_weight REAL NOT NULL,
      stone_weight REAL NOT NULL DEFAULT 0.0,
      pearl_weight REAL NOT NULL DEFAULT 0.0,
      net_weight REAL NOT NULL,
      drop_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Trash Table
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
      status TEXT CHECK(status IN ('SOLD', 'DROP')) NOT NULL,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 7. ActivityLogs Table
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

  seedDefaultUsers();
}

// Seed Permanent Employee ID Accounts (INSERT OR IGNORE to handle multi-worker processes)
function seedDefaultUsers() {
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

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO users (employee_id, full_name, email, password_hash, role, status, first_login)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    for (const u of defaultUsers) {
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
  });

  seedTransaction();
}

initDB();

export default db;
