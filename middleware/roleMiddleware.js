import { errorResponse } from "@/utils/response";

export function authorize(user, allowedRoles = []) {
  if (!user) {
    return errorResponse("Authentication required.", 401);
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return errorResponse("Forbidden: You do not have permission to perform this action.", 403);
  }

  return null;
}
