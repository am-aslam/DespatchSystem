import db from "@/database/db";

export class DropModel {
  static create({ dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight }) {
    const stmt = db.prepare(`
      INSERT INTO drop_history (dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight);
    return this.findById(info.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT d.*, u.name as salesperson_name
      FROM drop_history d
      JOIN users u ON d.salesperson_id = u.id
      WHERE d.id = ?
    `);
    return stmt.get(id);
  }

  static getAll({ salespersonId = null, role = "ADMIN" }) {
    let query = `
      SELECT d.*, u.name as salesperson_name
      FROM drop_history d
      JOIN users u ON d.salesperson_id = u.id
    `;
    let params = [];

    if (role === "SALESPERSON" && salespersonId) {
      query += " WHERE d.salesperson_id = ?";
      params.push(salespersonId);
    }

    query += " ORDER BY d.drop_date DESC";
    return db.prepare(query).all(...params);
  }
}
