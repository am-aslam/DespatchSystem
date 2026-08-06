import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { TotalsController } from "@/controllers/totalsController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN", "MANAGER"]);
  if (authError) return authError;

  return TotalsController.getUserTotals(req, user);
}
