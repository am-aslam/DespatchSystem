import crypto from "crypto";
import { getAuthEmailForEmployee, getSupabaseAdmin } from "@/database/supabase";
import { query, withTransaction } from "@/database/postgres";
import { AppError } from "@/utils/errors";
import { validateRole, validateStatus } from "@/utils/validation";
import { ActivityService } from "./activityService";

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id?.toString(),
    employee_id: row.employee_id,
    full_name: row.name,
    name: row.name,
    email: row.email,
    auth_email: row.auth_email || getAuthEmailForEmployee(row.employee_id, row.email),
    role: row.role,
    status: row.status,
    first_login: row.first_login ? 1 : 0,
    password_hash: row.first_login ? null : "SUPABASE_AUTH",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class UserService {
  static async findById(id) {
    const result = await query(
      `
        SELECT id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        FROM users
        WHERE id = $1
      `,
      [id]
    );

    return mapUser(result.rows[0]);
  }

  static async findByEmployeeId(employeeId) {
    const result = await query(
      `
        SELECT id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        FROM users
        WHERE upper(employee_id) = upper($1)
      `,
      [employeeId]
    );

    return mapUser(result.rows[0]);
  }

  static async findByEmail(email) {
    const result = await query(
      `
        SELECT id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        FROM users
        WHERE lower(email) = lower($1) OR lower(auth_email) = lower($1)
      `,
      [email]
    );

    return mapUser(result.rows[0]);
  }

  static async list({ role = null, status = null } = {}) {
    const params = [];
    const where = [];

    if (role) {
      params.push(String(role).trim().toUpperCase());
      where.push(`role = $${params.length}`);
    }

    if (status) {
      params.push(String(status).trim().toUpperCase());
      where.push(`status = $${params.length}`);
    }

    const result = await query(
      `
        SELECT id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        FROM users
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY employee_id ASC
      `,
      params
    );

    return result.rows.map(mapUser);
  }

  static async resolveSalespersonIds(values = []) {
    if (!Array.isArray(values) || values.length === 0) return [];

    const cleaned = values
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (cleaned.length === 0) return [];

    const upperValues = cleaned.map((value) => value.toUpperCase());
    const lowerValues = cleaned.map((value) => value.toLowerCase());

    const result = await query(
      `
        SELECT id
        FROM users
        WHERE role = 'SALESPERSON'
          AND status = 'ACTIVE'
          AND (
            id::text = ANY($1::text[])
            OR upper(employee_id) = ANY($2::text[])
            OR upper(name) = ANY($2::text[])
            OR lower(email) = ANY($3::text[])
            OR lower(auth_email) = ANY($3::text[])
          )
      `,
      [cleaned, upperValues, lowerValues]
    );

    return result.rows.map((row) => row.id.toString());
  }

  static async create({ employee_id, full_name, email, role, status = "ACTIVE" }, currentUser) {
    const employeeId = String(employee_id || "").trim().toUpperCase();
    const name = String(full_name || "").trim();
    const normalizedRole = String(role || "").trim().toUpperCase();
    const normalizedStatus = String(status || "ACTIVE").trim().toUpperCase();

    if (!employeeId || !name || !normalizedRole) {
      throw new AppError("Employee ID, Full Name, and Role are required.", 400);
    }

    if (!validateRole(normalizedRole)) {
      throw new AppError("Invalid role.", 400);
    }

    if (!validateStatus(normalizedStatus)) {
      throw new AppError("Invalid user status.", 400);
    }

    const authEmail = getAuthEmailForEmployee(employeeId, email);
    const temporaryPassword = crypto.randomBytes(32).toString("base64url");
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        employee_id: employeeId,
        name,
        role: normalizedRole,
        requires_password_setup: true,
      },
    });

    if (error) {
      throw new AppError(error.message, 400);
    }

    const authUserId = data.user.id;

    try {
      return await withTransaction(async (client) => {
        const result = await client.query(
          `
            INSERT INTO users (id, employee_id, name, email, auth_email, role, status, first_login)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            RETURNING id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
          `,
          [
            authUserId,
            employeeId,
            name,
            email ? String(email).trim().toLowerCase() : null,
            authEmail,
            normalizedRole,
            normalizedStatus,
          ]
        );

        const newUser = mapUser(result.rows[0]);
        await ActivityService.log(
          currentUser.id,
          "Created User",
          `Admin ${currentUser.full_name || currentUser.name} created user ${newUser.employee_id} (${newUser.full_name})`,
          client
        );

        return newUser;
      });
    } catch (error) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      throw error;
    }
  }

  static async markPasswordCreated(id, client = null) {
    const executor = client || { query };
    const result = await executor.query(
      `
        UPDATE users
        SET first_login = false, updated_at = now()
        WHERE id = $1
        RETURNING id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
      `,
      [id]
    );

    return mapUser(result.rows[0]);
  }

  static async resetPassword(id, currentUser) {
    const targetUser = await this.findById(id);
    if (!targetUser) throw new AppError("User not found.", 404);

    const temporaryPassword = crypto.randomBytes(32).toString("base64url");
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: temporaryPassword,
      user_metadata: {
        employee_id: targetUser.employee_id,
        name: targetUser.full_name,
        role: targetUser.role,
        requires_password_setup: true,
      },
    });

    if (error) throw new AppError(error.message, 400);

    return withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE users
          SET first_login = true, updated_at = now()
          WHERE id = $1
          RETURNING id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        `,
        [targetUser.id]
      );

      await ActivityService.log(
        currentUser.id,
        "Password Reset",
        `Admin ${currentUser.full_name || currentUser.name} reset password for ${targetUser.employee_id}`,
        client
      );

      return mapUser(result.rows[0]);
    });
  }

  static async updateStatus(id, currentUser) {
    const targetUser = await this.findById(id);
    if (!targetUser) throw new AppError("User not found.", 404);
    if (targetUser.id === currentUser.id) {
      throw new AppError("You cannot suspend your own account.", 400);
    }

    const nextStatus = targetUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    return this.setStatus(targetUser.id, nextStatus, currentUser);
  }

  static async setStatus(id, status, currentUser) {
    const targetUser = await this.findById(id);
    if (!targetUser) throw new AppError("User not found.", 404);

    const normalizedStatus = String(status || "").trim().toUpperCase();
    if (!validateStatus(normalizedStatus)) {
      throw new AppError("Invalid user status.", 400);
    }

    return withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE users
          SET status = $1, updated_at = now()
          WHERE id = $2
          RETURNING id, employee_id, name, email, auth_email, role, status, first_login, created_at, updated_at
        `,
        [normalizedStatus, targetUser.id]
      );

      await ActivityService.log(
        currentUser.id,
        "Updated User Status",
        `Admin ${currentUser.full_name || currentUser.name} set status of ${targetUser.employee_id} to ${normalizedStatus}`,
        client
      );

      return mapUser(result.rows[0]);
    });
  }

  static async delete(id, currentUser) {
    const targetUser = await this.findById(id);
    if (!targetUser) throw new AppError("User not found.", 404);
    if (targetUser.id === currentUser.id) {
      throw new AppError("You cannot delete your own account.", 400);
    }

    const referenceCount = await query(
      `
        SELECT
          (SELECT count(*) FROM dispatches WHERE created_by = $1) +
          (SELECT count(*) FROM dispatch_assignments WHERE salesperson_id = $1) +
          (SELECT count(*) FROM sales_history WHERE salesperson_id = $1) +
          (SELECT count(*) FROM drop_history WHERE salesperson_id = $1) +
          (SELECT count(*) FROM activity_logs WHERE user_id = $1) AS count
      `,
      [targetUser.id]
    );

    if (referenceCount.rows[0].count > 0) {
      const deactivatedUser = await this.setStatus(targetUser.id, "INACTIVE", currentUser);
      return {
        deleted: false,
        deactivated: true,
        user: deactivatedUser,
      };
    }

    await query("DELETE FROM users WHERE id = $1", [targetUser.id]);
    await getSupabaseAdmin().auth.admin.deleteUser(targetUser.id);

    await ActivityService.log(
      currentUser.id,
      "Deleted User",
      `Admin ${currentUser.full_name || currentUser.name} deleted user ${targetUser.employee_id}`
    );

    return {
      deleted: true,
      deactivated: false,
    };
  }
}
