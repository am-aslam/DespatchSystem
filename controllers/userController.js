import { UserModel } from "@/models/UserModel";
import { successResponse, errorResponse } from "@/utils/response";
import { ActivityLogModel } from "@/models/ActivityLogModel";

export class UserController {
  static async listUsers(req, currentUser) {
    try {
      const users = UserModel.getAll();
      return successResponse(users, "Users fetched successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async createUser(req, currentUser) {
    try {
      const body = await req.json();
      const { employee_id, full_name, email, role, status } = body;

      if (!employee_id || !full_name || !role) {
        return errorResponse("Employee ID, Full Name, and Role are required.", 400);
      }

      const existingEmp = UserModel.findByEmployeeId(employee_id.trim());
      if (existingEmp) {
        return errorResponse(`Employee ID '${employee_id}' is already registered.`, 400);
      }

      if (email && email.trim() !== "") {
        const existingEmail = UserModel.findByEmail(email.trim());
        if (existingEmail) {
          return errorResponse("User with this email already exists.", 400);
        }
      }

      const newUser = UserModel.create({
        employee_id: employee_id.trim().toUpperCase(),
        full_name: full_name.trim(),
        email: email ? email.trim() : null,
        role,
        status: status || "ACTIVE",
      });

      ActivityLogModel.log(
        currentUser.id,
        "Created User",
        `Admin ${currentUser.full_name || currentUser.name} created user ${newUser.employee_id} (${newUser.full_name})`
      );

      return successResponse(newUser, "User account created successfully! Password setup required on first login.", 201);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async toggleStatus(id, currentUser) {
    try {
      const targetUser = UserModel.findById(id);
      if (!targetUser) {
        return errorResponse("User not found.", 404);
      }

      const newStatus = targetUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const updated = UserModel.updateStatus(id, newStatus);

      ActivityLogModel.log(
        currentUser.id,
        "Updated User Status",
        `Admin ${currentUser.full_name || currentUser.name} set status of ${targetUser.employee_id} to ${newStatus}`
      );

      return successResponse(updated, `User status updated to ${newStatus}`);
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async resetUserPassword(id, currentUser) {
    try {
      const targetUser = UserModel.findById(id);
      if (!targetUser) {
        return errorResponse("User not found.", 404);
      }

      const updated = UserModel.resetPassword(id);

      ActivityLogModel.log(
        currentUser.id,
        "Password Reset",
        `Admin ${currentUser.full_name || currentUser.name} reset password for ${targetUser.employee_id}`
      );

      return successResponse(
        updated,
        `Password for ${targetUser.employee_id} has been reset. The user must set a new password on their next login.`
      );
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async deleteUser(id, currentUser) {
    try {
      const targetUser = UserModel.findById(id);
      if (!targetUser) {
        return errorResponse("User not found.", 404);
      }

      UserModel.delete(id);

      ActivityLogModel.log(
        currentUser.id,
        "Deleted User",
        `Admin ${currentUser.full_name || currentUser.name} deleted user ${targetUser.employee_id}`
      );

      return successResponse(null, "User deleted successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
