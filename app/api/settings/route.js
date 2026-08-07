import { authenticate } from "@/middleware/authMiddleware";
import { authorize } from "@/middleware/roleMiddleware";
import { SettingsController } from "@/controllers/settingsController";

export async function GET(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  return SettingsController.getSettings(req, user);
}

export async function PUT(req) {
  const { user, error } = await authenticate(req);
  if (error) return error;

  const authError = authorize(user, ["ADMIN"]);
  if (authError) return authError;

  return SettingsController.updateSettings(req, user);
}
