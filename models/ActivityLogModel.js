import db from "@/database/db";

export class ActivityLogModel {
  static log(user_id, action, description) {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, action, description)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(user_id, action, description);
    return info.lastInsertRowid;
  }

  static getLogs({ limit = 100, userId = null }) {
    let query = `
      SELECT a.*, u.full_name as user_name, u.role as user_role
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
    `;
    let params = [];

    if (userId) {
      query += " WHERE a.user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY a.created_at DESC LIMIT ?";
    params.push(limit);

    return db.prepare(query).all(...params);
  }
}
