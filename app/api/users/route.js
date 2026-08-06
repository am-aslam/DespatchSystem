import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { UserController } from "@/controllers/userController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return UserController.listUsers(req, user);
}

export async function POST(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN"]);
  if (authError) return authError;

  return UserController.createUser(req, user);
}
