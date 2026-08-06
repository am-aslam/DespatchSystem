import db from "@/database/db";
import { saveBackup } from "@/database/backup";

export class TrashModel {
  static create({
    dispatch_id,
    item_number,
    item_name,
    salesperson_id,
    gross_weight,
    stone_weight,
    pearl_weight,
    net_weight,
    status,
    remarks = "",
  }) {
    // 10 years permanent retention in trash (3650 days)
    const expiresAt = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      INSERT INTO trash (
        dispatch_id, item_number, item_name, salesperson_id,
        gross_weight, stone_weight, pearl_weight, net_weight,
        status, remarks, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      dispatch_id,
      item_number,
      item_name || "Gold Ornament",
      salesperson_id,
      gross_weight,
      stone_weight || 0,
      pearl_weight || 0,
      net_weight,
      status,
      remarks,
      expiresAt
    );

    saveBackup();
    return this.findById(info.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT t.*, u.full_name as salesperson_name
      FROM trash t
      LEFT JOIN users u ON t.salesperson_id = u.id
      WHERE t.id = ?
    `);
    return stmt.get(id);
  }

  static getTrash({ userId, role }) {
    let query = `
      SELECT t.*, u.full_name as salesperson_name
      FROM trash t
      LEFT JOIN users u ON t.salesperson_id = u.id
    `;
    let params = [];

    if (role === "SALESPERSON") {
      query += " WHERE t.salesperson_id = ?";
      params.push(userId);
    }

    query += " ORDER BY t.deleted_at DESC";
    return db.prepare(query).all(...params);
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM trash WHERE id = ?");
    const result = stmt.run(id);
    saveBackup();
    return result;
  }
}
