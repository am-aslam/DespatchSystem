import { HistoryService } from "@/services/historyService";
import { successResponse, handleError } from "@/utils/response";

export class DropController {
  static async listDrops(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const drops = await HistoryService.list("drop", {
        user,
        limit: searchParams.get("limit") || 500,
      });

      return successResponse(drops, "Drop history fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch drop history.");
    }
  }
}
