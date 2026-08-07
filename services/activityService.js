import { query } from "@/database/postgres";

export class ActivityService {
  static async log(userId, action, description, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `
        INSERT INTO activity_logs (user_id, action, description)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [userId || null, action, description]
    );

    return result.rows[0]?.id || null;
  }

  static async list({ limit = 100, userId = null }) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const params = [];
    const where = [];

    if (userId) {
      params.push(userId);
      where.push(`a.user_id = $${params.length}`);
    }

    params.push(safeLimit);

    const result = await query(
      `
        SELECT
          a.id::text,
          a.user_id::text,
          a.action,
          a.description,
          a.created_at,
          u.name AS user_name,
          u.role AS user_role
        FROM activity_logs a
        LEFT JOIN users u ON u.id = a.user_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY a.created_at DESC
        LIMIT $${params.length}
      `,
      params
    );

    return result.rows;
  }
}
