import db from "@/database/db";
import { DispatchModel } from "@/models/DispatchModel";
import { successResponse, errorResponse } from "@/utils/response";

export class PrintController {
  static async getPrintData(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const dispatchId = searchParams.get("dispatch_id");

      let items = [];
      if (dispatchId) {
        const single = DispatchModel.findById(dispatchId);
        if (single) items = [single];
      } else {
        const result = DispatchModel.getDispatches({
          userId: user.id,
          userRole: user.role,
          page: 1,
          limit: 1000,
        });
        items = result.items;
      }

      // Calculate totals for print layout
      const totals = items.reduce(
        (acc, item) => {
          acc.gross_weight += item.gross_weight || 0;
          acc.stone_weight += item.stone_weight || 0;
          acc.pearl_weight += item.pearl_weight || 0;
          acc.net_weight += item.net_weight || 0;
          return acc;
        },
        { gross_weight: 0, stone_weight: 0, pearl_weight: 0, net_weight: 0 }
      );

      const printPayload = {
        title: "GOLD ORNAMENTS SALES DISPATCH SHEET",
        generated_at: new Date().toISOString(),
        generated_by: user.full_name || user.name,
        total_items: items.length,
        items: items.map((i) => ({
          item_number: i.item_number,
          gross_weight: parseFloat(i.gross_weight.toFixed(3)),
          stone_weight: parseFloat(i.stone_weight.toFixed(3)),
          pearl_weight: parseFloat(i.pearl_weight.toFixed(3)),
          net_weight: parseFloat(i.net_weight.toFixed(3)),
          assigned_staff: i.assigned_users?.map((u) => u.name || u.full_name).join(", ") || "Unassigned",
        })),
        totals: {
          gross_weight: parseFloat(totals.gross_weight.toFixed(3)),
          stone_weight: parseFloat(totals.stone_weight.toFixed(3)),
          pearl_weight: parseFloat(totals.pearl_weight.toFixed(3)),
          net_weight: parseFloat(totals.net_weight.toFixed(3)),
        },
      };

      return successResponse(printPayload, "Printable JSON response generated successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
