import { authenticate } from "@/middleware/authMiddleware";
import { TrashController } from "@/controllers/trashController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return TrashController.listTrash(req, user);
}
