import { authenticate } from "@/middleware/authMiddleware";
import { DropController } from "@/controllers/dropController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return DropController.listDrops(req, user);
}
