import { ActivityLogModel } from "@/models/ActivityLogModel";
import { successResponse, errorResponse } from "@/utils/response";

export class LogController {
  static async listLogs(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get("limit") || "100", 10);
      const userId = searchParams.get("user_id");

      const logs = ActivityLogModel.getLogs({
        limit,
        userId: user.role === "SALESPERSON" ? user.id : userId,
      });

      return successResponse(logs, "Activity logs fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
