import { HistoryService } from "@/services/historyService";
import { successResponse, handleError } from "@/utils/response";

export class SalesController {
  static async listSales(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const sales = await HistoryService.list("sale", {
        user,
        limit: searchParams.get("limit") || 500,
      });

      return successResponse(sales, "Sales history fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch sales history.");
    }
  }

  static async updateSale(req, id, user) {
    try {
      const body = await req.json();
      const updated = await HistoryService.updateSale(id, body, user);
      return successResponse(updated, "Sales record updated successfully");
    } catch (err) {
      return handleError(err, "Failed to update sales record.");
    }
  }

  static async deleteSale(id, user) {
    try {
      await HistoryService.deleteSale(id, user);
      return successResponse(null, "Sales record deleted successfully");
    } catch (err) {
      return handleError(err, "Failed to delete sales record.");
    }
  }
}
