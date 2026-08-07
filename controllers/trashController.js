import { HistoryService } from "@/services/historyService";
import { successResponse, handleError } from "@/utils/response";

export class TrashController {
  static async listTrash(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const items = await HistoryService.listTrash({
        user,
        limit: searchParams.get("limit") || 500,
      });

      return successResponse(items, "Trash items fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch trash.");
    }
  }

  static async restoreTrash(id, user) {
    try {
      const restored = await HistoryService.restoreTrash(id, user);
      return successResponse(restored, "Item restored successfully to active dispatch table");
    } catch (err) {
      return handleError(err, "Failed to restore trash item.");
    }
  }

  static async purgeTrash(id, user) {
    try {
      await HistoryService.purgeTrash(id, user);
      return successResponse(null, "Item permanently purged from trash");
    } catch (err) {
      return handleError(err, "Failed to purge trash item.");
    }
  }
}
