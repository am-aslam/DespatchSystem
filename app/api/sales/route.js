import { authenticate } from "@/middleware/authMiddleware";
import { SalesController } from "@/controllers/salesController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return SalesController.listSales(req, user);
}
