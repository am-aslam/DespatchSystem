import { extractTokenFromHeader, verifyToken } from "@/utils/jwt";
import { errorResponse } from "@/utils/response";
import { UserModel } from "@/models/UserModel";

export async function authenticate(req) {
  const token = extractTokenFromHeader(req.headers);
  if (!token) {
    return { user: null, error: errorResponse("Authentication token required.", 401) };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { user: null, error: errorResponse("Invalid or expired authentication token.", 401) };
  }

  const user = UserModel.findById(decoded.id);
  if (!user) {
    return { user: null, error: errorResponse("User not found.", 401) };
  }

  return { user, error: null };
}
