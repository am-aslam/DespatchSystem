import { AuthController } from "@/controllers/authController";

export async function POST(req) {
  return AuthController.login(req);
}
