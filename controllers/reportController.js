import { ReportService } from "@/services/reportService";
import { successResponse, errorResponse, handleError } from "@/utils/response";

export class ReportController {
  static async getReport(req, user) {
    try {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get("type") || "weight-summary";

      if (type === "sales") {
        return successResponse(await ReportService.getHistorySummary("sale", user), "Sales report generated");
      }

      if (type === "drops") {
        return successResponse(await ReportService.getHistorySummary("drop", user), "Drop report generated");
      }

      if (type === "dispatches") {
        return successResponse(await ReportService.getDispatchReport(user), "Dispatch report generated");
      }

      if (type === "staff") {
        if (user.role === "SALESPERSON") {
          return errorResponse("Forbidden: Staff reports are restricted to Admin and Manager roles.", 403);
        }

        return successResponse(await ReportService.getUserTotals(), "Staff report generated");
      }

      if (type === "daily") {
        return successResponse(await ReportService.getDailyReport(user), "Daily report generated");
      }

      if (type === "monthly") {
        return successResponse(await ReportService.getMonthlyReport(user), "Monthly report generated");
      }

      if (type === "weight-summary") {
        return successResponse(await ReportService.getSystemTotals(user), "Weight summary generated");
      }

      return errorResponse("Unknown report type.", 400);
    } catch (err) {
      return handleError(err, "Failed to generate report.");
    }
  }
}
