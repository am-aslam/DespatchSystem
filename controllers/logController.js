import { ActivityService } from "@/services/activityService";
import { successResponse, handleError } from "@/utils/response";

export class LogController {
  static async listLogs(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get("limit") || "100", 10);
      const userId = searchParams.get("user_id");

      const logs = await ActivityService.list({
        limit,
        userId: user.role === "SALESPERSON" ? user.id : userId,
      });

      return successResponse(logs, "Activity logs fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch activity logs.");
    }
  }
}
