import { getSupabaseAdmin } from "@/database/supabase";
import { UserService } from "@/services/userService";
import { ActivityService } from "@/services/activityService";
import { successResponse, errorResponse, handleError } from "@/utils/response";

export class AuthController {
  static async login(req) {
    try {
      const body = await req.json();
      const { employee_id, password } = body;

      if (!employee_id || employee_id.trim() === "") {
        return errorResponse("Employee ID is required.", 400);
      }

      const user = await UserService.findByEmployeeId(employee_id.trim());
      if (!user) {
        return errorResponse("Invalid Employee ID or Password.", 401);
      }

      // Check Status
      if (user.status === "INACTIVE") {
        await ActivityService.log(user.id, "Failed Login", `Suspended user ${user.employee_id} attempted login.`);
        return errorResponse("Account is suspended. Please contact your administrator.", 403);
      }

      // First-time Password Setup Check
      if (user.first_login === 1) {
        return successResponse(
          {
            requires_setup: true,
            employee_id: user.employee_id,
            full_name: user.full_name,
            role: user.role,
          },
          "No password has been created. Redirecting to password setup page."
        );
      }

      if (!password) {
        return errorResponse("Password is required.", 400);
      }

      const { data, error } = await getSupabaseAdmin().auth.signInWithPassword({
        email: user.auth_email,
        password,
      });

      if (error || !data?.session?.access_token) {
        await ActivityService.log(user.id, "Failed Login", `Failed login attempt for Employee ID ${user.employee_id}.`);
        return errorResponse("Invalid Employee ID or Password.", 401);
      }

      // Log successful login
      await ActivityService.log(user.id, "User Logged In", `User ${user.full_name} (${user.employee_id}) logged in successfully.`);

      return successResponse(
        {
          user: {
            id: user.id,
            employee_id: user.employee_id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
          token: data.session.access_token,
          expires_at: data.session.expires_at,
        },
        "Login successful"
      );
    } catch (err) {
      return handleError(err, "Login failed.");
    }
  }

  static async setupPassword(req) {
    try {
      const body = await req.json();
      const { employee_id, new_password, confirm_password } = body;

      if (!employee_id || !new_password || !confirm_password) {
        return errorResponse("All fields are required.", 400);
      }

      if (new_password.length < 8) {
        return errorResponse("Password must be at least 8 characters long.", 400);
      }

      if (new_password !== confirm_password) {
        return errorResponse("Passwords do not match.", 400);
      }

      const user = await UserService.findByEmployeeId(employee_id);
      if (!user) {
        return errorResponse("Employee account not found.", 404);
      }

      if (user.status === "INACTIVE") {
        return errorResponse("Account is suspended.", 403);
      }

      if (user.first_login !== 1) {
        return errorResponse("Password has already been created for this account.", 409);
      }

      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
        password: new_password,
        email_confirm: true,
        user_metadata: {
          employee_id: user.employee_id,
          name: user.full_name,
          role: user.role,
          requires_password_setup: false,
        },
      });

      if (error) {
        return errorResponse(error.message, 400);
      }

      await UserService.markPasswordCreated(user.id);
      await ActivityService.log(user.id, "Password Created", `First-time password set for Employee ID ${user.employee_id}.`);

      return successResponse(null, "Password created successfully! You can now log in with your new password.");
    } catch (err) {
      return handleError(err, "Password setup failed.");
    }
  }

  static async changePassword(req, user) {
    try {
      const body = await req.json();
      const { current_password, new_password, confirm_password } = body;

      if (!current_password || !new_password || !confirm_password) {
        return errorResponse("All fields are required.", 400);
      }

      const signIn = await getSupabaseAdmin().auth.signInWithPassword({
        email: user.auth_email,
        password: current_password,
      });

      if (signIn.error || !signIn.data?.user) {
        return errorResponse("Incorrect current password.", 400);
      }

      if (new_password.length < 8) {
        return errorResponse("New password must be at least 8 characters long.", 400);
      }

      if (new_password !== confirm_password) {
        return errorResponse("Passwords do not match.", 400);
      }

      const { error } = await getSupabaseAdmin().auth.admin.updateUserById(user.id, {
        password: new_password,
        user_metadata: {
          employee_id: user.employee_id,
          name: user.full_name,
          role: user.role,
          requires_password_setup: false,
        },
      });

      if (error) {
        return errorResponse(error.message, 400);
      }

      await UserService.markPasswordCreated(user.id);
      await ActivityService.log(user.id, "Password Changed", `User ${user.employee_id} changed their password.`);

      return successResponse(null, "Password changed successfully.");
    } catch (err) {
      return handleError(err, "Password change failed.");
    }
  }

  static async logout(user) {
    try {
      await ActivityService.log(
        user.id,
        "User Logged Out",
        `User ${user.full_name || user.name} (${user.employee_id}) logged out.`
      );

      return successResponse(null, "Logout successful");
    } catch (err) {
      return handleError(err, "Logout failed.");
    }
  }

  static async getMe(user) {
    return successResponse({ user }, "Current user profile fetched");
  }
}
