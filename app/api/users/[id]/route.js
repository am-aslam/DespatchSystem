import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { UserController } from "@/controllers/userController";

export async function DELETE(req, { params }) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN"]);
  if (authError) return authError;

  const { id } = await params;
  return UserController.deleteUser(id, user);
}
