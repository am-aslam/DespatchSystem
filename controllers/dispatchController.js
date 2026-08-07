import { DispatchService } from "@/services/dispatchService";
import { successResponse, errorResponse, handleError } from "@/utils/response";

export class DispatchController {
  static async listDispatches(req, user) {
    try {
      const result = await DispatchService.listForRequest(req, user);
      return successResponse(
        result,
        result.isGrouped ? "Grouped dispatches fetched successfully" : "Dispatch items fetched successfully"
      );
    } catch (err) {
      return handleError(err, "Failed to fetch dispatches.");
    }
  }

  // Create a new Dispatch Lot containing multiple ornaments (Single Batch Creation)
  static async createDispatch(req, user) {
    try {
      const body = await req.json();
      const newDispatch = await DispatchService.createBatch(body, user);
      return successResponse(newDispatch, "Dispatch batch created successfully", 201);
    } catch (err) {
      return handleError(err, "Failed to create dispatch.");
    }
  }

  // Get detailed ornament list for a dispatch batch (List Access Endpoint)
  static async getOne(id, user) {
    try {
      const items = await DispatchService.getItemsByDispatchIdentifier(id, user);
      return successResponse(items, "Detailed dispatch ornaments fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch dispatch details.");
    }
  }

  static async listItems(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const { page, limit } = DispatchService.getPaginationFromRequest(req);
      const result = await DispatchService.listItems({
        user,
        search: searchParams.get("search") || "",
        salespersonId: searchParams.get("salesperson_id"),
        dateFilter: searchParams.get("date") || "ALL",
        page,
        limit,
      });

      return successResponse(result, "Dispatch items fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch dispatch items.");
    }
  }

  static async getItem(id, user) {
    try {
      const item = await DispatchService.getItemById(id, user);
      if (!item) {
        return errorResponse("Dispatch item not found.", 404);
      }

      return successResponse(item, "Dispatch item fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch dispatch item.");
    }
  }

  static async createItem(req, user) {
    try {
      const body = await req.json();
      const item = await DispatchService.addItemsToDispatch(body, user);
      return successResponse(item, "Dispatch item added successfully", 201);
    } catch (err) {
      return handleError(err, "Failed to add dispatch item.");
    }
  }

  static async updateItem(req, id, user) {
    try {
      const body = await req.json();
      const updated = await DispatchService.updateItem(id, body, user);
      return successResponse(updated, "Dispatch item updated successfully");
    } catch (err) {
      return handleError(err, "Failed to update dispatch item.");
    }
  }

  static async updateDispatch(req, id, user) {
    try {
      const body = await req.json();
      const updated = await DispatchService.updateDispatchOrItem(id, body, user);
      return successResponse(updated, "Dispatch data updated successfully");
    } catch (err) {
      return handleError(err, "Failed to update dispatch data.");
    }
  }

  static async deleteDispatch(req, id, user) {
    try {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status")?.toUpperCase();
      const remarks = searchParams.get("remarks") || "";

      if (status === "SOLD" || status === "DROP") {
        const result = await DispatchService.markItemOutcome({
          itemId: id,
          status,
          remarks,
          user,
        });
        return successResponse(result, `Dispatch item marked as ${status} successfully`);
      } else {
        await DispatchService.deleteDispatchOrItem({ identifier: id, user });
        return successResponse(null, "Dispatch deleted successfully");
      }
    } catch (err) {
      return handleError(err, "Failed to delete dispatch.");
    }
  }

  static async assignDispatch(req, user) {
    try {
      const body = await req.json();
      const { dispatch_ids, user_ids } = body;

      if (!Array.isArray(dispatch_ids) || !Array.isArray(user_ids)) {
        return errorResponse("dispatch_ids and user_ids must be arrays.", 400);
      }

      const result = await DispatchService.assignUsersToDispatches({
        dispatchIds: dispatch_ids,
        assignees: user_ids,
        user,
      });

      return successResponse(result, "Dispatches assigned successfully");
    } catch (err) {
      return handleError(err, "Failed to assign dispatches.");
    }
  }
}
