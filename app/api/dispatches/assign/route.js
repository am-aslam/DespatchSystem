import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { DispatchController } from "@/controllers/dispatchController";

export async function POST(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN", "MANAGER"]);
  if (authError) return authError;

  return DispatchController.assignDispatch(req, user);
}
