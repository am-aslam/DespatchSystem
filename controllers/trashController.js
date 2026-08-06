import { TrashModel } from "@/models/TrashModel";
import { DispatchModel } from "@/models/DispatchModel";
import { AssignmentModel } from "@/models/AssignmentModel";
import { successResponse, errorResponse } from "@/utils/response";
import { ActivityLogModel } from "@/models/ActivityLogModel";

export class TrashController {
  static async listTrash(req, user) {
    try {
      const items = TrashModel.getTrash({
        userId: user.id,
        role: user.role,
      });

      return successResponse(items, "Trash items fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async restoreTrash(id, user) {
    try {
      const item = TrashModel.findById(id);
      if (!item) {
        return errorResponse("Trash item not found.", 404);
      }

      // Restore dispatch item back to active table
      const randNo = Math.floor(1000 + Math.random() * 9000);
      const restoredDispatch = DispatchModel.create({
        item_number: item.item_number || `GLD-${randNo}`,
        gross_weight: item.gross_weight,
        stone_weight: item.stone_weight,
        pearl_weight: item.pearl_weight,
        net_weight: item.net_weight,
        created_by: user.id,
      });

      // Assign to user who restored it
      AssignmentModel.assignUsersToDispatch(restoredDispatch.id, [item.salesperson_id || user.id]);

      // Remove from trash
      TrashModel.delete(id);

      ActivityLogModel.log(
        user.id,
        "Restored Trash",
        `User ${user.name} restored item ${item.item_number} from trash`
      );

      return successResponse(restoredDispatch, "Item restored successfully to active dispatch table");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async purgeTrash(id, user) {
    try {
      const item = TrashModel.findById(id);
      if (!item) {
        return errorResponse("Trash item not found.", 404);
      }

      TrashModel.delete(id);

      ActivityLogModel.log(
        user.id,
        "Purged Trash",
        `User ${user.name} permanently deleted item ${item.item_number} from trash`
      );

      return successResponse(null, "Item permanently purged from trash");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
