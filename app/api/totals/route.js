import { authenticate } from "@/middleware/authMiddleware";
import { TotalsController } from "@/controllers/totalsController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return TotalsController.getTotals(req, user);
}
