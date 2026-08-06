import { DispatchModel } from "@/models/DispatchModel";
import { AssignmentModel } from "@/models/AssignmentModel";
import { calculateNetWeight } from "@/services/weightService";
import { validateDispatchInput } from "@/utils/validation";
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
      const sortBy = searchParams.get("sortBy") || "created_at";
      const sortOrder = searchParams.get("sortOrder") || "DESC";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "50", 10);

      // Return SQL Grouped Dispatches for Admin and Manager
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
        sortBy,
        sortOrder,
        page,
        limit,
      });

      return successResponse(result, "Dispatch items fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async createDispatch(req, user) {
    try {
      const body = await req.json();
      const validationErrors = validateDispatchInput(body);
      if (validationErrors.length > 0) {
        return errorResponse("Validation failed", 400, validationErrors);
      }

      const gross = parseFloat(body.gross_weight);
      const stone = parseFloat(body.stone_weight || 0);
      const pearl = parseFloat(body.pearl_weight || 0);
      const net = calculateNetWeight(gross, stone);

      const randNo = Math.floor(1000 + Math.random() * 9000);
      const item_number = body.item_number || `GLD-${randNo}`;

      const newDispatch = DispatchModel.create({
        item_number,
        gross_weight: gross,
        stone_weight: stone,
        pearl_weight: pearl,
        net_weight: net,
        created_by: user.id,
      });

      const assignedUserIds = body.assigned_user_ids || [user.id];
      if (assignedUserIds.length > 0) {
        AssignmentModel.assignUsersToDispatch(newDispatch.id, assignedUserIds);
      }

      ActivityLogModel.log(
        user.id,
        "Created Dispatch",
        `User ${user.name || user.full_name} created dispatch item ${item_number} (${net}g Net Wt)`
      );

      const completeItem = DispatchModel.findById(newDispatch.id);
      return successResponse(completeItem, "Dispatch item created successfully", 201);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async getOne(id, user) {
    try {
      // Check if id corresponds to a batch string (e.g. GLD-2352) or item ID
      if (isNaN(id) || id.startsWith("GLD-")) {
        const batchItems = DispatchModel.getItemsByBatch(id);
        return successResponse(batchItems, "Detailed dispatch ornaments fetched successfully");
      }

      const dispatch = DispatchModel.findById(id);
      if (!dispatch) {
        return errorResponse("Dispatch item not found.", 404);
      }

      if (user.role === "SALESPERSON") {
        const isAssigned = dispatch.assigned_users.some((u) => u.id === user.id);
        if (!isAssigned) {
          return errorResponse("Access denied.", 403);
        }
      }

      return successResponse(dispatch, "Dispatch item details");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async updateDispatch(req, id, user) {
    try {
      const body = await req.json();
      const existing = DispatchModel.findById(id);
      if (!existing) {
        return errorResponse("Dispatch item not found.", 404);
      }

      const gross = body.gross_weight !== undefined ? parseFloat(body.gross_weight) : existing.gross_weight;
      const stone = body.stone_weight !== undefined ? parseFloat(body.stone_weight) : existing.stone_weight;
      const pearl = body.pearl_weight !== undefined ? parseFloat(body.pearl_weight) : existing.pearl_weight;
      const net = calculateNetWeight(gross, stone);

      const updated = DispatchModel.update(id, {
        item_number: body.item_number || existing.item_number,
        gross_weight: gross,
        stone_weight: stone,
        pearl_weight: pearl,
        net_weight: net,
      });

      if (body.assigned_user_ids && Array.isArray(body.assigned_user_ids)) {
        AssignmentModel.assignUsersToDispatch(id, body.assigned_user_ids);
      }

      ActivityLogModel.log(
        user.id,
        "Updated Dispatch",
        `User ${user.name || user.full_name} updated dispatch item ${updated.item_number}`
      );

      return successResponse(DispatchModel.findById(id), "Dispatch item updated successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async deleteDispatch(req, id, user) {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status")?.toUpperCase();

      const existing = DispatchModel.findById(id);
      if (!existing) {
        // Try deleting batch if id is a batch string
        const batchItems = DispatchModel.getItemsByBatch(id);
        if (batchItems.length > 0) {
          for (const item of batchItems) {
            DispatchModel.delete(item.id);
          }
          return successResponse(null, "Grouped dispatch deleted successfully");
        }
        return errorResponse("Dispatch item not found.", 404);
      }

      if (status === "SOLD" || status === "DROP") {
        const result = DispatchService.handleDispatchDelete({
          dispatch_id: id,
          status,
          user,
        });
        return successResponse(result, `Dispatch item marked as ${status} successfully`);
      } else {
        DispatchModel.delete(id);
        ActivityLogModel.log(
          user.id,
          "Deleted Dispatch",
          `User ${user.name || user.full_name} deleted dispatch item ${existing.item_number}`
        );
        return successResponse(null, "Dispatch item deleted successfully");
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
