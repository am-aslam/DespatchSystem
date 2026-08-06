import db from "@/database/db";
import { saveBackup } from "@/database/backup";

export class DispatchModel {
  // Create a new Dispatch Batch containing multiple ornaments (1-to-Many)
  static createBatch({ dispatch_no, created_by, assigned_user_ids = [], items = [] }) {
    const insertDispatch = db.prepare(`
      INSERT INTO dispatches (dispatch_no, created_by)
      VALUES (?, ?)
    `);

    // created_by is included to satisfy NOT NULL constraint in existing DB schema
    const insertItem = db.prepare(`
      INSERT INTO dispatch_items (dispatch_id, item_number, gross_weight, stone_weight, pearl_weight, net_weight, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAssign = db.prepare(`
      INSERT OR IGNORE INTO assignments (dispatch_id, user_id)
      VALUES (?, ?)
    `);

    // Verify user IDs actually exist in the users table before inserting
    const checkUser = db.prepare(`SELECT id FROM users WHERE id = ?`);

    let dispatchId;

    const transaction = db.transaction(() => {
      const info = insertDispatch.run(dispatch_no, created_by);
      dispatchId = info.lastInsertRowid;

      // Insert all ornaments belonging to this dispatch
      items.forEach((item, idx) => {
        const itemNumber = item.itemNo || `${dispatch_no}-${idx + 1}`;
        const g = parseFloat(item.grossWeight || item.gross_weight || 0);
        const s = parseFloat(item.stoneWeight || item.stone_weight || 0);
        const p = parseFloat(item.pearlWeight || item.pearl_weight || 0);
        const n = parseFloat(Math.max(0, g - s).toFixed(3));

        insertItem.run(dispatchId, itemNumber, g, s, p, n, created_by);
      });

      // Insert Salesperson assignments (only for users that actually exist in DB)
      const rawUserIds = assigned_user_ids.length > 0 ? assigned_user_ids : [created_by];
      const validUserIds = rawUserIds.filter((uId) => {
        const exists = checkUser.get(uId);
        return Boolean(exists);
      });

      // Fallback: if none resolved, assign to creating user (admin)
      const finalUserIds = validUserIds.length > 0 ? validUserIds : [created_by];

      finalUserIds.forEach((uId) => {
        insertAssign.run(dispatchId, uId);
      });
    });

    transaction();
    saveBackup();
    return this.findDispatchById(dispatchId);
  }

  // Find a specific ornament item by ID
  static findById(id) {
    try {
      const stmt = db.prepare(`
        SELECT di.*, d.dispatch_no
        FROM dispatch_items di
        LEFT JOIN dispatches d ON di.dispatch_id = d.id
        WHERE di.id = ?
      `);
      const item = stmt.get(id);
      if (!item) return null;

      const assignStmt = db.prepare(`
        SELECT u.id, u.employee_id, u.full_name as name, u.email
        FROM users u
        JOIN assignments a ON u.id = a.user_id
        WHERE a.dispatch_id = ?
      `);

      return {
        ...item,
        assigned_users: item.dispatch_id ? assignStmt.all(item.dispatch_id) : [],
      };
    } catch (err) {
      console.error("Error in findById:", err);
      return null;
    }
  }

  static findDispatchById(id) {
    try {
      const stmt = db.prepare(`
        SELECT d.*, u.full_name as creator_name
        FROM dispatches d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = ? OR d.dispatch_no = ?
      `);
      const dispatch = stmt.get(id, id);
      if (!dispatch) return null;

      const assignedUsers = db.prepare(`
        SELECT u.id, u.employee_id, u.full_name as name, u.email, u.role
        FROM users u
        JOIN assignments a ON u.id = a.user_id
        WHERE a.dispatch_id = ?
      `).all(dispatch.id);

      const items = db.prepare(`
        SELECT * FROM dispatch_items WHERE dispatch_id = ? ORDER BY id ASC
      `).all(dispatch.id);

      return {
        ...dispatch,
        assigned_users: assignedUsers,
        items,
      };
    } catch (err) {
      console.error("Error in findDispatchById:", err);
      return null;
    }
  }

  // Fetch individual ornaments for a dispatch by ID or dispatch_no
  static getItemsByDispatchId(dispatchIdOrNo) {
    try {
      const dispatch = db.prepare("SELECT id FROM dispatches WHERE id = ? OR dispatch_no = ?").get(dispatchIdOrNo, dispatchIdOrNo);
      if (!dispatch) return [];

      const items = db.prepare(`
        SELECT di.*, d.dispatch_no
        FROM dispatch_items di
        JOIN dispatches d ON di.dispatch_id = d.id
        WHERE di.dispatch_id = ?
        ORDER BY di.id ASC
      `).all(dispatch.id);

      const assignStmt = db.prepare(`
        SELECT u.id, u.employee_id, u.full_name as name, u.email
        FROM users u
        JOIN assignments a ON u.id = a.user_id
        WHERE a.dispatch_id = ?
      `);

      const assignedUsers = assignStmt.all(dispatch.id);

      return items.map((item) => ({
        ...item,
        assigned_users: assignedUsers,
      }));
    } catch (err) {
      console.error("Error in getItemsByDispatchId:", err);
      return [];
    }
  }

  // SQL GROUP BY Aggregation for Admin & Manager (One Row Per Dispatch)
  static getGroupedDispatches({ search = "", salespersonId = null, dateFilter = "ALL" }) {
    try {
      let whereConditions = [];
      let params = [];

      if (salespersonId) {
        whereConditions.push("d.id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
        params.push(salespersonId);
      }

      if (search && search.trim() !== "") {
        const q = `%${search.trim()}%`;
        whereConditions.push("(d.dispatch_no LIKE ? OR u.full_name LIKE ? OR u.employee_id LIKE ?)");
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

      const groupedQuery = `
        SELECT
          d.id,
          d.dispatch_no,
          COUNT(di.id) AS total_items,
          COALESCE(SUM(di.gross_weight), 0) AS gross_total,
          COALESCE(SUM(di.stone_weight), 0) AS stone_total,
          COALESCE(SUM(di.pearl_weight), 0) AS pearl_total,
          COALESCE(SUM(di.net_weight), 0) AS net_total,
          d.created_at
        FROM dispatches d
        LEFT JOIN dispatch_items di ON d.id = di.dispatch_id
        LEFT JOIN users u ON d.created_by = u.id
        ${whereClause}
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `;

      const groups = db.prepare(groupedQuery).all(...params);

      const assignStmt = db.prepare(`
        SELECT DISTINCT u.full_name as name, u.employee_id
        FROM users u
        JOIN assignments a ON u.id = a.user_id
        WHERE a.dispatch_id = ?
      `);

      return groups.map((g) => {
        const assignedUsers = assignStmt.all(g.id);
        const gross = parseFloat((g.gross_total || 0).toFixed(3));
        const stone = parseFloat((g.stone_total || 0).toFixed(3));
        const pearl = parseFloat((g.pearl_total || 0).toFixed(3));
        const ad = parseFloat(Math.max(0, stone - pearl).toFixed(3));
        const net = parseFloat((g.net_total || 0).toFixed(3));

        return {
          id: g.id.toString(),
          dispatch_id: g.id.toString(),
          dispatch_no: g.dispatch_no,
          item_number: g.dispatch_no,
          batch_no: g.dispatch_no,
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
    } catch (err) {
      console.error("Error in getGroupedDispatches:", err);
      return [];
    }
  }

  // Get individual ornaments for Salesperson View
  static getDispatches({
    userId,
    userRole,
    search = "",
    salespersonId = null,
    dateFilter = "ALL",
  }) {
    try {
      let whereConditions = [];
      let params = [];

      if (userRole === "SALESPERSON") {
        whereConditions.push("di.dispatch_id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
        params.push(userId);
      } else if (salespersonId) {
        whereConditions.push("di.dispatch_id IN (SELECT dispatch_id FROM assignments WHERE user_id = ?)");
        params.push(salespersonId);
      }

      if (search && search.trim() !== "") {
        const q = `%${search.trim()}%`;
        whereConditions.push("(di.item_number LIKE ? OR d.dispatch_no LIKE ?)");
        params.push(q, q);
      }

      if (dateFilter === "TODAY") {
        whereConditions.push("DATE(di.created_at) = DATE('now')");
      } else if (dateFilter === "WEEK") {
        whereConditions.push("di.created_at >= DATETIME('now', '-7 days')");
      } else if (dateFilter === "MONTH") {
        whereConditions.push("di.created_at >= DATETIME('now', '-30 days')");
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

      const itemsQuery = `
        SELECT di.*, d.dispatch_no
        FROM dispatch_items di
        LEFT JOIN dispatches d ON di.dispatch_id = d.id
        ${whereClause}
        ORDER BY di.created_at DESC
      `;

      const items = db.prepare(itemsQuery).all(...params);

      const assignStmt = db.prepare(`
        SELECT u.id, u.employee_id, u.full_name as name, u.email
        FROM users u
        JOIN assignments a ON u.id = a.user_id
        WHERE a.dispatch_id = ?
      `);

      const enrichedItems = items.map((item) => ({
        ...item,
        assigned_users: item.dispatch_id ? assignStmt.all(item.dispatch_id) : [],
      }));

      return {
        items: enrichedItems,
      };
    } catch (err) {
      console.error("Error in getDispatches:", err);
      return { items: [] };
    }
  }

  static delete(id) {
    return this.deleteItem(id);
  }

  static deleteDispatch(dispatchId) {
    try {
      db.transaction(() => {
        db.prepare("DELETE FROM dispatch_items WHERE dispatch_id = ? OR dispatch_id IN (SELECT id FROM dispatches WHERE dispatch_no = ?)").run(dispatchId, dispatchId);
        db.prepare("DELETE FROM assignments WHERE dispatch_id = ? OR dispatch_id IN (SELECT id FROM dispatches WHERE dispatch_no = ?)").run(dispatchId, dispatchId);
        db.prepare("DELETE FROM dispatches WHERE id = ? OR dispatch_no = ?").run(dispatchId, dispatchId);
      })();
      saveBackup();
      return true;
    } catch (err) {
      console.error("Error in deleteDispatch:", err);
    }
  }

  static deleteItem(itemId) {
    try {
      const stmt = db.prepare("DELETE FROM dispatch_items WHERE id = ?");
      const result = stmt.run(itemId);
      saveBackup();
      return result;
    } catch (err) {
      console.error("Error in deleteItem:", err);
    }
  }
}
