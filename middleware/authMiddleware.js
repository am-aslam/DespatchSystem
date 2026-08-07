import { errorResponse } from "@/utils/response";
import { getSupabaseAdmin } from "@/database/supabase";
import { UserService } from "@/services/userService";

function extractTokenFromHeader(headers) {
  const authHeader = headers.get("authorization") || headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function authenticate(req) {
  try {
    const token = extractTokenFromHeader(req.headers);
    if (!token) {
      return { user: null, error: errorResponse("Authentication token required.", 401) };
    }

    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data?.user?.id) {
      return { user: null, error: errorResponse("Invalid or expired authentication token.", 401) };
    }

    const user = await UserService.findById(data.user.id);
    if (!user) {
      return { user: null, error: errorResponse("User profile not found.", 401) };
    }

    if (user.status !== "ACTIVE") {
      return { user: null, error: errorResponse("Account is suspended. Please contact your administrator.", 403) };
    }

    return { user, token, authUser: data.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: errorResponse(error.message || "Authentication failed.", error.statusCode || 500),
    };
  }
}
