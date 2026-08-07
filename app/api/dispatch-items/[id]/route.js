import { authenticate } from "@/middleware/authMiddleware";
import { DispatchController } from "@/controllers/dispatchController";

export async function GET(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return DispatchController.getItem(id, user);
}

export async function PUT(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return DispatchController.updateItem(req, id, user);
}

export async function DELETE(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return DispatchController.deleteDispatch(req, id, user);
}
