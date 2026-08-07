import { DispatchService } from "@/services/dispatchService";
import { successResponse, handleError } from "@/utils/response";

export class PrintController {
  static async getPrintData(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const dispatchId = searchParams.get("dispatch_id");

      let items = [];
      if (dispatchId) {
        items = await DispatchService.getItemsByDispatchIdentifier(dispatchId, user);
      } else {
        const result = await DispatchService.listItems({
          user,
          page: 1,
          limit: 1000,
        });
        items = result.items;
      }

      // Calculate totals for print layout
      const totals = items.reduce(
        (acc, item) => {
          acc.gross_weight += item.gross_weight || 0;
          acc.total_stone_weight += item.total_stone_weight ?? item.stone_weight ?? 0;
          acc.pearl_weight += item.pearl_weight || 0;
          acc.ad_weight += item.ad_weight || 0;
          acc.net_weight += item.net_weight || 0;
          return acc;
        },
        { gross_weight: 0, total_stone_weight: 0, pearl_weight: 0, ad_weight: 0, net_weight: 0 }
      );

      const printPayload = {
        title: "GOLD ORNAMENTS SALES DISPATCH SHEET",
        generated_at: new Date().toISOString(),
        generated_by: user.full_name || user.name,
        total_items: items.length,
        items: items.map((i) => ({
          item_number: i.item_number,
          gross_weight: parseFloat(i.gross_weight.toFixed(3)),
          total_stone_weight: parseFloat((i.total_stone_weight ?? i.stone_weight).toFixed(3)),
          stone_weight: parseFloat((i.total_stone_weight ?? i.stone_weight).toFixed(3)),
          pearl_weight: parseFloat(i.pearl_weight.toFixed(3)),
          ad_weight: parseFloat(i.ad_weight.toFixed(3)),
          net_weight: parseFloat(i.net_weight.toFixed(3)),
          assigned_staff: i.assigned_users?.map((u) => u.name || u.full_name).join(", ") || "Unassigned",
        })),
        totals: {
          gross_weight: parseFloat(totals.gross_weight.toFixed(3)),
          total_stone_weight: parseFloat(totals.total_stone_weight.toFixed(3)),
          stone_weight: parseFloat(totals.total_stone_weight.toFixed(3)),
          pearl_weight: parseFloat(totals.pearl_weight.toFixed(3)),
          ad_weight: parseFloat(totals.ad_weight.toFixed(3)),
          net_weight: parseFloat(totals.net_weight.toFixed(3)),
        },
      };

      return successResponse(printPayload, "Printable JSON response generated successfully");
    } catch (err) {
      return handleError(err, "Failed to generate print data.");
    }
  }
}
