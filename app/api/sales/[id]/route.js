import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { SalesController } from "@/controllers/salesController";

export async function PUT(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const { id } = await params;
  return SalesController.updateSale(req, id, user);
}

export async function DELETE(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN", "MANAGER"]);
  if (authError) return authError;

  const { id } = await params;
  return SalesController.deleteSale(id, user);
}
