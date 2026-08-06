import { UserModel } from "@/models/UserModel";
import { comparePassword, hashPassword } from "@/utils/password";
import { generateToken } from "@/utils/jwt";
import { successResponse, errorResponse } from "@/utils/response";
import { ActivityLogModel } from "@/models/ActivityLogModel";

export class AuthController {
  static async login(req) {
    try {
      const body = await req.json();
      const { employee_id, password } = body;

      if (!employee_id || employee_id.trim() === "") {
        return errorResponse("Employee ID is required.", 400);
      }

      const user = UserModel.findByEmployeeId(employee_id.trim());
      if (!user) {
        return errorResponse("Invalid Employee ID or Password.", 401);
      }

      // Check Status
      if (user.status === "INACTIVE") {
        ActivityLogModel.log(user.id, "Failed Login", `Suspended user ${user.employee_id} attempted login.`);
        return errorResponse("Account is suspended. Please contact your administrator.", 403);
      }

      // First-time Password Setup Check
      if (!user.password_hash || user.first_login === 1) {
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

      // Verify Password
      const isMatch = comparePassword(password, user.password_hash);
      if (!isMatch) {
        ActivityLogModel.log(user.id, "Failed Login", `Failed login attempt for Employee ID ${user.employee_id}.`);
        return errorResponse("Invalid Employee ID or Password.", 401);
      }

      // Generate JWT Token
      const token = generateToken({
        id: user.id,
        employee_id: user.employee_id,
        email: user.email,
        role: user.role,
      });

      // Log successful login
      ActivityLogModel.log(user.id, "User Logged In", `User ${user.full_name} (${user.employee_id}) logged in successfully.`);

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
          token,
        },
        "Login successful"
      );
    } catch (err) {
      return errorResponse(err.message, 500);
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

      const user = UserModel.findByEmployeeId(employee_id);
      if (!user) {
        return errorResponse("Employee account not found.", 404);
      }

      if (user.status === "INACTIVE") {
        return errorResponse("Account is suspended.", 403);
      }

      // Hash password and save
      const passwordHash = hashPassword(new_password);
      UserModel.setPassword(user.id, passwordHash);

      ActivityLogModel.log(user.id, "Password Created", `First-time password set for Employee ID ${user.employee_id}.`);

      return successResponse(null, "Password created successfully! You can now log in with your new password.");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async changePassword(req, user) {
    try {
      const body = await req.json();
      const { current_password, new_password, confirm_password } = body;

      if (!current_password || !new_password || !confirm_password) {
        return errorResponse("All fields are required.", 400);
      }

      const fullUser = UserModel.findByEmployeeId(user.employee_id);
      if (!fullUser || !comparePassword(current_password, fullUser.password_hash)) {
        return errorResponse("Incorrect current password.", 400);
      }

      if (new_password.length < 8) {
        return errorResponse("New password must be at least 8 characters long.", 400);
      }

      if (new_password !== confirm_password) {
        return errorResponse("Passwords do not match.", 400);
      }

      const newHash = hashPassword(new_password);
      UserModel.setPassword(user.id, newHash);

      ActivityLogModel.log(user.id, "Password Changed", `User ${user.employee_id} changed their password.`);

      return successResponse(null, "Password changed successfully.");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async getMe(user) {
    return successResponse({ user }, "Current user profile fetched");
  }
}
