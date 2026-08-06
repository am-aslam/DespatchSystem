import { authenticate } from "@/middleware/authMiddleware";
import { TrashController } from "@/controllers/trashController";

export async function POST(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return TrashController.restoreTrash(id, user);
}

export async function DELETE(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return TrashController.purgeTrash(id, user);
}
