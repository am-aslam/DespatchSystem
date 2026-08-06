import db from "@/database/db";
import { saveBackup } from "@/database/backup";

export class UserModel {
  static findByEmployeeId(employee_id) {
    const stmt = db.prepare("SELECT * FROM users WHERE UPPER(employee_id) = UPPER(?)");
    return stmt.get(employee_id);
  }

  static findById(id) {
    const stmt = db.prepare(
      "SELECT id, employee_id, full_name, email, role, status, first_login, created_at, updated_at FROM users WHERE id = ?"
    );
    return stmt.get(id);
  }

  static findByEmail(email) {
    const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
    return stmt.get(email);
  }

  static getAll() {
    const stmt = db.prepare(
      "SELECT id, employee_id, full_name, email, role, status, first_login, created_at, updated_at FROM users ORDER BY employee_id ASC"
    );
    return stmt.all();
  }

  static create({ employee_id, full_name, email, role, status = "ACTIVE" }) {
    const stmt = db.prepare(`
      INSERT INTO users (employee_id, full_name, email, password_hash, role, status, first_login)
      VALUES (?, ?, ?, NULL, ?, ?, 1)
    `);
    const info = stmt.run(employee_id, full_name, email, role, status);
    saveBackup();
    return this.findById(info.lastInsertRowid);
  }

  static setPassword(id, password_hash) {
    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = ?, first_login = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(password_hash, id);
    saveBackup();
    return this.findById(id);
  }

  static resetPassword(id) {
    const stmt = db.prepare(`
      UPDATE users
      SET password_hash = NULL, first_login = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);
    saveBackup();
    return this.findById(id);
  }

  static updateStatus(id, status) {
    const stmt = db.prepare(`
      UPDATE users
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, id);
    saveBackup();
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    const result = stmt.run(id);
    saveBackup();
    return result;
  }
}
