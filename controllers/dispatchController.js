import { DispatchModel } from "@/models/DispatchModel";
import { AssignmentModel } from "@/models/AssignmentModel";
import { calculateNetWeight } from "@/services/weightService";
import { successResponse, errorResponse } from "@/utils/response";
import { ActivityLogModel } from "@/models/ActivityLogModel";
import { DispatchService } from "@/services/dispatchService";

export class DispatchController {
  static async listDispatches(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || "";
      const salespersonId = searchParams.get("salesperson_id");
      const dateFilter = searchParams.get("date") || "ALL";

      // Return SQL Grouped Dispatches (One Object Per Dispatch) for Admin and Manager
      if (user.role === "ADMIN" || user.role === "MANAGER") {
        const groupedData = DispatchModel.getGroupedDispatches({
          search,
          salespersonId,
          dateFilter,
        });

        return successResponse(
          { items: groupedData, isGrouped: true },
          "Grouped dispatches fetched successfully"
        );
      }

      // Return individual ornament items for Salesperson
      const result = DispatchModel.getDispatches({
        userId: user.id,
        userRole: user.role,
        search,
        salespersonId,
        dateFilter,
      });

      return successResponse(result, "Dispatch items fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // Create a new Dispatch containing multiple ornaments (Batch Workflow)
  static async createDispatch(req, user) {
    try {
      const body = await req.json();

      const randNo = Math.floor(1000 + Math.random() * 9000);
      const dispatch_no = body.dispatch_no || body.item_number || `GLD-${randNo}`;
      const assigned_user_ids = body.assigned_user_ids || [user.id];

      // Handle batch items array or single item input
      const itemsList = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [
            {
              itemNo: `${dispatch_no}-1`,
              grossWeight: body.gross_weight,
              stoneWeight: body.stone_weight || 0,
              pearlWeight: body.pearl_weight || 0,
            },
          ];

      const newDispatch = DispatchModel.createBatch({
        dispatch_no,
        created_by: user.id,
        assigned_user_ids,
        items: itemsList,
      });

      ActivityLogModel.log(
        user.id,
        "Created Dispatch Batch",
        `User ${user.name || user.full_name} created dispatch batch ${dispatch_no} (${itemsList.length} items)`
      );

      return successResponse(newDispatch, "Dispatch batch created successfully", 201);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  // Get detailed ornament list for a dispatch batch (List Access Endpoint)
  static async getOne(id, user) {
    try {
      const items = DispatchModel.getItemsByDispatchId(id);
      return successResponse(items, "Detailed dispatch ornaments fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async deleteDispatch(req, id, user) {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status")?.toUpperCase();

      if (status === "SOLD" || status === "DROP") {
        const result = DispatchService.handleDispatchDelete({
          dispatch_id: id,
          status,
          user,
        });
        return successResponse(result, `Dispatch item marked as ${status} successfully`);
      } else {
        // Direct deletion of dispatch batch or item
        if (!isNaN(id)) {
          DispatchModel.deleteItem(id);
        } else {
          DispatchModel.deleteDispatch(id);
        }

        ActivityLogModel.log(
          user.id,
          "Deleted Dispatch",
          `User ${user.name || user.full_name} deleted dispatch ${id}`
        );
        return successResponse(null, "Dispatch deleted successfully");
      }
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async assignDispatch(req, user) {
    try {
      const body = await req.json();
      const { dispatch_ids, user_ids } = body;

      if (!Array.isArray(dispatch_ids) || !Array.isArray(user_ids)) {
        return errorResponse("dispatch_ids and user_ids must be arrays.", 400);
      }

      for (const dId of dispatch_ids) {
        AssignmentModel.assignUsersToDispatch(dId, user_ids);
      }

      ActivityLogModel.log(
        user.id,
        "Assigned Dispatch",
        `User ${user.name || user.full_name} assigned ${dispatch_ids.length} dispatch(es) to ${user_ids.length} salesperson(s)`
      );

      return successResponse(null, "Dispatches assigned successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
