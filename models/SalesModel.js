import db from "@/database/db";

export class SalesModel {
  static create({ dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight }) {
    const stmt = db.prepare(`
      INSERT INTO sales_history (dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(dispatch_id, salesperson_id, gross_weight, stone_weight, pearl_weight, net_weight);
    return this.findById(info.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT s.*, u.name as salesperson_name
      FROM sales_history s
      JOIN users u ON s.salesperson_id = u.id
      WHERE s.id = ?
    `);
    return stmt.get(id);
  }

  static getAll({ salespersonId = null, role = "ADMIN" }) {
    let query = `
      SELECT s.*, u.name as salesperson_name
      FROM sales_history s
      JOIN users u ON s.salesperson_id = u.id
    `;
    let params = [];

    if (role === "SALESPERSON" && salespersonId) {
      query += " WHERE s.salesperson_id = ?";
      params.push(salespersonId);
    }

    query += " ORDER BY s.sale_date DESC";
    return db.prepare(query).all(...params);
  }

  static update(id, { gross_weight, stone_weight, pearl_weight, net_weight, salesperson_id }) {
    const stmt = db.prepare(`
      UPDATE sales_history
      SET gross_weight = COALESCE(?, gross_weight),
          stone_weight = COALESCE(?, stone_weight),
          pearl_weight = COALESCE(?, pearl_weight),
          net_weight = COALESCE(?, net_weight),
          salesperson_id = COALESCE(?, salesperson_id)
      WHERE id = ?
    `);
    stmt.run(gross_weight, stone_weight, pearl_weight, net_weight, salesperson_id, id);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM sales_history WHERE id = ?");
    return stmt.run(id);
  }
}
