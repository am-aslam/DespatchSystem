import { authenticate } from "@/middleware/authMiddleware";
import { AuthController } from "@/controllers/authController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return AuthController.getMe(user);
}
