import db from "@/database/db";

export class DispatchModel {
  static create({ item_number, gross_weight, stone_weight, pearl_weight, net_weight, created_by }) {
    const stmt = db.prepare(`
      INSERT INTO dispatch_items (item_number, gross_weight, stone_weight, pearl_weight, net_weight, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(item_number, gross_weight, stone_weight, pearl_weight, net_weight, created_by);
    return this.findById(info.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT d.*, u.full_name as creator_name
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `);
    const item = stmt.get(id);
    if (!item) return null;

    const assignedUsers = db.prepare(`
      SELECT u.id, u.employee_id, u.full_name as name, u.email, u.role
      FROM users u
      JOIN assignments a ON u.id = a.user_id
      WHERE a.dispatch_id = ?
    `).all(id);

    return {
      ...item,
      assigned_users: assignedUsers,
    };
  }

  static getDispatches({
    userId,
    userRole,
    search = "",
    salespersonId = null,
    dateFilter = "ALL",
    sortBy = "created_at",
    sortOrder = "DESC",
    page = 1,
    limit = 50,
  }) {
    let whereConditions = [];
    let params = [];

    // Role Scoping: Salesperson sees ONLY assigned dispatches
    if (userRole === "SALESPERSON") {
      whereConditions.push("d.id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
      params.push(userId);
    } else if (salespersonId) {
      whereConditions.push("d.id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
      params.push(salespersonId);
    }

    // Search query
    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      whereConditions.push("(d.item_number LIKE ? OR u.full_name LIKE ? OR u.employee_id LIKE ?)");
      params.push(q, q, q);
    }

    // Date Filtering
    if (dateFilter === "TODAY") {
      whereConditions.push("DATE(d.created_at) = DATE('now')");
    } else if (dateFilter === "YESTERDAY") {
      whereConditions.push("DATE(d.created_at) = DATE('now', '-1 day')");
    } else if (dateFilter === "WEEK") {
      whereConditions.push("d.created_at >= DATETIME('now', '-7 days')");
    } else if (dateFilter === "MONTH") {
      whereConditions.push("d.created_at >= DATETIME('now', '-30 days')");
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Allowed Sort Columns
    const allowedSortCols = ["gross_weight", "stone_weight", "pearl_weight", "net_weight", "created_at", "item_number"];
    const sortCol = allowedSortCols.includes(sortBy) ? sortBy : "created_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Count Total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      ${whereClause}
    `;
    const totalCount = db.prepare(countQuery).get(...params).total;

    // Pagination
    const offset = (page - 1) * limit;

    const itemsQuery = `
      SELECT d.*, u.full_name as creator_name
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      ${whereClause}
      ORDER BY d.${sortCol} ${order}
      LIMIT ? OFFSET ?
    `;

    const items = db.prepare(itemsQuery).all(...params, limit, offset);

    // Attach assignments for each dispatch item
    const assignStmt = db.prepare(`
      SELECT u.id, u.employee_id, u.full_name as name, u.email
      FROM users u
      JOIN assignments a ON u.id = a.user_id
      WHERE a.dispatch_id = ?
    `);

    const enrichedItems = items.map((item) => ({
      ...item,
      assigned_users: assignStmt.all(item.id),
    }));

    return {
      items: enrichedItems,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  static update(id, { item_number, gross_weight, stone_weight, pearl_weight, net_weight }) {
    const stmt = db.prepare(`
      UPDATE dispatch_items
      SET item_number = COALESCE(?, item_number),
          gross_weight = COALESCE(?, gross_weight),
          stone_weight = COALESCE(?, stone_weight),
          pearl_weight = COALESCE(?, pearl_weight),
          net_weight = COALESCE(?, net_weight),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(item_number, gross_weight, stone_weight, pearl_weight, net_weight, id);
    return this.findById(id);
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM dispatch_items WHERE id = ?");
    return stmt.run(id);
  }
}
