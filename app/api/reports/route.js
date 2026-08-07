import { authenticate } from "@/middleware/authMiddleware";
import { ReportController } from "@/controllers/reportController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return ReportController.getReport(req, user);
}
