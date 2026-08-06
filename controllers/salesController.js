import { SalesModel } from "@/models/SalesModel";
import { calculateNetWeight } from "@/services/weightService";
import { successResponse, errorResponse } from "@/utils/response";
import { ActivityLogModel } from "@/models/ActivityLogModel";

export class SalesController {
  static async listSales(req, user) {
    try {
      const sales = SalesModel.getAll({
        salespersonId: user.id,
        role: user.role,
      });

      return successResponse(sales, "Sales history fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async updateSale(req, id, user) {
    try {
      const body = await req.json();
      const existing = SalesModel.findById(id);
      if (!existing) {
        return errorResponse("Sales record not found.", 404);
      }

      const gross = body.gross_weight !== undefined ? parseFloat(body.gross_weight) : existing.gross_weight;
      const stone = body.stone_weight !== undefined ? parseFloat(body.stone_weight) : existing.stone_weight;
      const pearl = body.pearl_weight !== undefined ? parseFloat(body.pearl_weight) : existing.pearl_weight;
      const net = calculateNetWeight(gross, stone);

      const updated = SalesModel.update(id, {
        gross_weight: gross,
        stone_weight: stone,
        pearl_weight: pearl,
        net_weight: net,
        salesperson_id: body.salesperson_id || existing.salesperson_id,
      });

      ActivityLogModel.log(
        user.id,
        "Updated Sale",
        `User ${user.name} updated sales record ID ${id}`
      );

      return successResponse(updated, "Sales record updated successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async deleteSale(id, user) {
    try {
      const existing = SalesModel.findById(id);
      if (!existing) {
        return errorResponse("Sales record not found.", 404);
      }

      SalesModel.delete(id);

      ActivityLogModel.log(
        user.id,
        "Deleted Sale",
        `User ${user.name} deleted sales record ID ${id}`
      );

      return successResponse(null, "Sales record deleted successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
