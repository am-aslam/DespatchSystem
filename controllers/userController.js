import { UserService } from "@/services/userService";
import { successResponse, errorResponse, handleError } from "@/utils/response";

export class UserController {
  static async listUsers(req, currentUser) {
    try {
      const { searchParams } = new URL(req.url);
      const requestedRole = searchParams.get("role")?.toUpperCase() || null;

      if (currentUser.role === "SALESPERSON") {
        return errorResponse("Forbidden: You do not have permission to view users.", 403);
      }

      if (currentUser.role === "MANAGER" && requestedRole !== "SALESPERSON") {
        return errorResponse("Managers can only list active salesperson accounts.", 403);
      }

      const users = await UserService.list({
        role: requestedRole,
        status: currentUser.role === "MANAGER" ? "ACTIVE" : searchParams.get("status"),
      });
      return successResponse(users, "Users fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch users.");
    }
  }

  static async createUser(req, currentUser) {
    try {
      const body = await req.json();
      const existingEmp = await UserService.findByEmployeeId(body.employee_id || "");
      if (existingEmp) {
        return errorResponse(`Employee ID '${body.employee_id}' is already registered.`, 400);
      }

      if (body.email && body.email.trim() !== "") {
        const existingEmail = await UserService.findByEmail(body.email.trim());
        if (existingEmail) {
          return errorResponse("User with this email already exists.", 400);
        }
      }

      const newUser = await UserService.create(body, currentUser);

      return successResponse(newUser, "User account created successfully! Password setup required on first login.", 201);
    } catch (err) {
      return handleError(err, "Failed to create user.");
    }
  }

  static async toggleStatus(id, currentUser) {
    try {
      const updated = await UserService.updateStatus(id, currentUser);
      return successResponse(updated, `User status updated to ${updated.status}`);
    } catch (err) {
      return handleError(err, "Failed to update user status.");
    }
  }

  static async resetUserPassword(id, currentUser) {
    try {
      const updated = await UserService.resetPassword(id, currentUser);

      return successResponse(
        updated,
        `Password for ${updated.employee_id} has been reset. The user must set a new password on their next login.`
      );
    } catch (err) {
      return handleError(err, "Failed to reset password.");
    }
  }

  static async deleteUser(id, currentUser) {
    try {
      const result = await UserService.delete(id, currentUser);
      const message = result.deactivated
        ? "User has linked history, so the account was suspended instead of deleted."
        : "User deleted successfully";

      return successResponse(result, message);
    } catch (err) {
      return handleError(err, "Failed to delete user.");
    }
  }
}
