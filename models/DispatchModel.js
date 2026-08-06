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

  // Fetch individual ornaments belonging to a dispatch batch number
  static getItemsByBatch(batchNo) {
    const stmt = db.prepare(`
      SELECT d.*, u.full_name as creator_name
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      WHERE d.item_number = ? OR d.item_number LIKE ?
      ORDER BY d.created_at ASC
    `);

    const items = stmt.all(batchNo, `${batchNo}-%`);

    const assignStmt = db.prepare(`
      SELECT u.id, u.employee_id, u.full_name as name, u.email
      FROM users u
      JOIN assignments a ON u.id = a.user_id
      WHERE a.dispatch_id = ?
    `);

    return items.map((item) => ({
      ...item,
      assigned_users: assignStmt.all(item.id),
    }));
  }

  // SQL GROUP BY Aggregation for Admin & Manager (One Row Per Dispatch)
  static getGroupedDispatches({ search = "", salespersonId = null, dateFilter = "ALL" }) {
    let whereConditions = [];
    let params = [];

    if (salespersonId) {
      whereConditions.push("d.id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
      params.push(salespersonId);
    }

    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      whereConditions.push("(d.item_number LIKE ? OR u.full_name LIKE ? OR u.employee_id LIKE ?)");
      params.push(q, q, q);
    }

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

    // SQL Aggregation Query (GROUP BY Dispatch Batch Prefix)
    const groupedQuery = `
      SELECT
        CASE 
          WHEN INSTR(d.item_number, '-') > 0 
            AND INSTR(SUBSTR(d.item_number, INSTR(d.item_number, '-') + 1), '-') > 0
          THEN SUBSTR(d.item_number, 1, INSTR(d.item_number, '-') + INSTR(SUBSTR(d.item_number, INSTR(d.item_number, '-') + 1), '-') - 1)
          ELSE d.item_number
        END AS batch_no,
        COUNT(d.id) AS total_items,
        SUM(d.gross_weight) AS gross_total,
        SUM(d.stone_weight) AS stone_total,
        SUM(d.pearl_weight) AS pearl_total,
        SUM(d.net_weight) AS net_total,
        MAX(d.created_at) AS created_at
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      ${whereClause}
      GROUP BY batch_no
      ORDER BY created_at DESC
    `;

    const groups = db.prepare(groupedQuery).all(...params);

    // Attach assigned salespeople for each grouped batch
    const assignStmt = db.prepare(`
      SELECT DISTINCT u.full_name as name, u.employee_id
      FROM users u
      JOIN assignments a ON u.id = a.user_id
      JOIN dispatch_items di ON a.dispatch_id = di.id
      WHERE di.item_number = ? OR di.item_number LIKE ?
    `);

    return groups.map((g) => {
      const assignedUsers = assignStmt.all(g.batch_no, `${g.batch_no}-%`);
      const gross = parseFloat((g.gross_total || 0).toFixed(3));
      const stone = parseFloat((g.stone_total || 0).toFixed(3));
      const pearl = parseFloat((g.pearl_total || 0).toFixed(3));
      const ad = parseFloat(Math.max(0, stone - pearl).toFixed(3));
      const net = parseFloat((g.net_total || 0).toFixed(3));

      return {
        id: g.batch_no,
        dispatch_id: g.batch_no,
        item_number: g.batch_no,
        batch_no: g.batch_no,
        total_items: g.total_items,
        gross_weight: gross,
        stone_weight: stone,
        pearl_weight: pearl,
        ad_weight: ad,
        net_weight: net,
        assigned_users: assignedUsers,
        assigned_staff_names: assignedUsers.map((u) => u.name).join(", ") || "Unassigned",
        created_at: g.created_at,
      };
    });
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

    if (search && search.trim() !== "") {
      const q = `%${search.trim()}%`;
      whereConditions.push("(d.item_number LIKE ? OR u.full_name LIKE ? OR u.employee_id LIKE ?)");
      params.push(q, q, q);
    }

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

    const allowedSortCols = ["gross_weight", "stone_weight", "pearl_weight", "net_weight", "created_at", "item_number"];
    const sortCol = allowedSortCols.includes(sortBy) ? sortBy : "created_at";
    const order = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const countQuery = `
      SELECT COUNT(*) as total
      FROM dispatch_items d
      JOIN users u ON d.created_by = u.id
      ${whereClause}
    `;
    const totalCount = db.prepare(countQuery).get(...params).total;

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
