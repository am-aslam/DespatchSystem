import { authenticate } from "@/middleware/authMiddleware";
import { PrintController } from "@/controllers/printController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return PrintController.getPrintData(req, user);
}
