import { ReportService } from "@/services/reportService";
import { successResponse, handleError } from "@/utils/response";

export class TotalsController {
  static async getTotals(req, user) {
    try {
      const totals = await ReportService.getSystemTotals(user);
      return successResponse(totals, "System totals calculated successfully");
    } catch (err) {
      return handleError(err, "Failed to calculate totals.");
    }
  }

  static async getUserTotals(req, user) {
    try {
      const userStats = await ReportService.getUserTotals();
      return successResponse(userStats, "Per-user totals calculated successfully");
    } catch (err) {
      return handleError(err, "Failed to calculate user totals.");
    }
  }
}
