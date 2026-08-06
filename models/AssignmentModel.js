import db from "@/database/db";

export class AssignmentModel {
  static assignUsersToDispatch(dispatchId, userIds) {
    const deleteStmt = db.prepare("DELETE FROM assignments WHERE dispatch_id = ?");
    deleteStmt.run(dispatchId);

    const insertStmt = db.prepare(
      "INSERT INTO assignments (dispatch_id, user_id) VALUES (?, ?)"
    );

    const transaction = db.transaction(() => {
      for (const userId of userIds) {
        insertStmt.run(dispatchId, userId);
      }
    });

    transaction();
  }

  static getAssignedUsersForDispatch(dispatchId) {
    const stmt = db.prepare(`
      SELECT u.id, u.name, u.email, u.role
      FROM users u
      JOIN assignments a ON u.id = a.user_id
      WHERE a.dispatch_id = ?
    `);
    return stmt.all(dispatchId);
  }
}
