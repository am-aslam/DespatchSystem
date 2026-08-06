import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const dbPath = path.join(process.cwd(), "gold_sales.db");
const db = new Database(dbPath);

// Enable WAL mode for high concurrency performance
db.pragma("journal_mode = WAL");

// Initialize Database Schema
export function initDB() {
  // Disable foreign keys during migration checks
  db.pragma("foreign_keys = OFF");

  // Check if users table exists and contains employee_id column
  const usersExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();

  if (usersExists) {
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasEmpId = columns.some((c) => c.name === "employee_id");
    if (!hasEmpId) {
      db.exec("DROP TABLE IF EXISTS assignments");
      db.exec("DROP TABLE IF EXISTS dispatch_items");
      db.exec("DROP TABLE IF EXISTS sales_history");
      db.exec("DROP TABLE IF EXISTS drop_history");
      db.exec("DROP TABLE IF EXISTS trash");
      db.exec("DROP TABLE IF EXISTS activity_logs");
      db.exec("DROP TABLE IF EXISTS users");
    }
  }

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

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");

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

// Seed Permanent Employee ID Accounts
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
}

initDB();

export default db;
