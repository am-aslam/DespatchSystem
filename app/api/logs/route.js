import { authenticate } from "@/middleware/authMiddleware";
import { LogController } from "@/controllers/logController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return LogController.listLogs(req, user);
}
