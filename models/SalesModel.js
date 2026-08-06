import db from "@/database/db";
import { saveBackup } from "@/database/backup";

export class SalesModel {
  static create({ dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks = "" }) {
    const stmt = db.prepare(`
      INSERT INTO sales_history (dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight, remarks);
    saveBackup();
    return this.findById(info.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT s.*, u.full_name as salesperson_name
      FROM sales_history s
      LEFT JOIN users u ON s.salesperson_id = u.id
      WHERE s.id = ?
    `);
    return stmt.get(id);
  }

  static getAll({ salespersonId = null, role = "ADMIN" }) {
    let query = `
      SELECT s.*, u.full_name as salesperson_name
      FROM sales_history s
      LEFT JOIN users u ON s.salesperson_id = u.id
    `;
    let params = [];

    if (role === "SALESPERSON" && salespersonId) {
      query += " WHERE s.salesperson_id = ?";
      params.push(salespersonId);
    }

    query += " ORDER BY s.sale_date DESC";
    return db.prepare(query).all(...params);
  }

  static update(id, { gross_weight, stone_weight, pearl_weight, net_weight, salesperson_id, remarks }) {
    const stmt = db.prepare(`
      UPDATE sales_history
      SET gross_weight = COALESCE(?, gross_weight),
          stone_weight = COALESCE(?, stone_weight),
          pearl_weight = COALESCE(?, pearl_weight),
          net_weight = COALESCE(?, net_weight),
          salesperson_id = COALESCE(?, salesperson_id),
          remarks = COALESCE(?, remarks)
      WHERE id = ?
    `);
    stmt.run(gross_weight, stone_weight, pearl_weight, net_weight, salesperson_id, remarks, id);
    saveBackup();
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM sales_history WHERE id = ?");
    const result = stmt.run(id);
    saveBackup();
    return result;
  }
}
