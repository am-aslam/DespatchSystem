import { query, withTransaction } from "@/database/postgres";
import { AppError } from "@/utils/errors";
import { validateDispatchItems, calculateWeights } from "@/utils/validation";
import { UserService } from "./userService";
import { ActivityService } from "./activityService";

function getPagination(searchParams) {
  const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "200", 10), 1), 1000);
  return { page, limit, offset: (page - 1) * limit };
}

function applyDateFilter(where, params, column, dateFilter) {
  if (dateFilter === "TODAY") {
    where.push(`${column} >= date_trunc('day', now())`);
  } else if (dateFilter === "YESTERDAY") {
    where.push(`${column} >= date_trunc('day', now()) - interval '1 day'`);
    where.push(`${column} < date_trunc('day', now())`);
  } else if (dateFilter === "WEEK") {
    where.push(`${column} >= now() - interval '7 days'`);
  } else if (dateFilter === "MONTH") {
    where.push(`${column} >= now() - interval '30 days'`);
  }
}

function mapAssignedUsers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

function normalizeGroupedDispatch(row) {
  const gross = Number(row.gross_weight || 0);
  const stone = Number(row.stone_weight || row.total_stone_weight || 0);
  const pearl = Number(row.pearl_weight || 0);
  const ad = Number(row.ad_weight || Math.max(0, stone - pearl));
  const net = Number(row.net_weight || 0);
  const assignedUsers = mapAssignedUsers(row.assigned_users);

  return {
    id: row.id?.toString(),
    dispatch_id: row.id?.toString(),
    dispatch_no: row.dispatch_no,
    dispatch_number: row.dispatch_no,
    item_number: row.dispatch_no,
    batch_no: row.dispatch_no,
    total_items: Number(row.total_items || 0),
    gross_weight: Number(gross.toFixed(3)),
    total_stone_weight: Number(stone.toFixed(3)),
    stone_weight: Number(stone.toFixed(3)),
    pearl_weight: Number(pearl.toFixed(3)),
    ad_weight: Number(ad.toFixed(3)),
    net_weight: Number(net.toFixed(3)),
    assigned_users: assignedUsers,
    assigned_staff_names:
      row.assigned_staff_names || assignedUsers.map((user) => user.name || user.full_name).join(", ") || "Unassigned",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeItem(row) {
  if (!row) return null;

  const stone = Number(row.total_stone_weight ?? row.stone_weight ?? 0);
  const pearl = Number(row.pearl_weight || 0);

  return {
    id: row.id?.toString(),
    dispatch_id: row.dispatch_id?.toString(),
    dispatch_no: row.dispatch_no,
    dispatch_number: row.dispatch_no,
    item_number: row.item_number,
    description: row.description || "Gold Ornament",
    gross_weight: Number(Number(row.gross_weight || 0).toFixed(3)),
    total_stone_weight: Number(stone.toFixed(3)),
    stone_weight: Number(stone.toFixed(3)),
    pearl_weight: Number(pearl.toFixed(3)),
    ad_weight: Number(Number(row.ad_weight ?? Math.max(0, stone - pearl)).toFixed(3)),
    net_weight: Number(Number(row.net_weight || 0).toFixed(3)),
    is_verified: Boolean(row.is_verified),
    status: row.status,
    assigned_users: mapAssignedUsers(row.assigned_users),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function resolveDispatchIds(identifiers, client = null) {
  const values = identifiers.map((id) => String(id || "").trim()).filter(Boolean);
  if (values.length === 0) return [];

  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT id::text
      FROM dispatches
      WHERE id::text = ANY($1::text[]) OR dispatch_number = ANY($1::text[])
    `,
    [values]
  );

  return result.rows.map((row) => row.id);
}

async function assertItemAccess(itemId, user, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        di.id::text,
        di.dispatch_id::text,
        di.item_number,
        di.description,
        di.gross_weight,
        di.total_stone_weight,
        di.pearl_weight,
        di.ad_weight,
        di.net_weight,
        di.status,
        d.dispatch_number AS dispatch_no
      FROM dispatch_items di
      JOIN dispatches d ON d.id = di.dispatch_id
      WHERE di.id::text = $1
      FOR UPDATE OF di
    `,
    [itemId]
  );

  const item = result.rows[0];
  if (!item) throw new AppError("Dispatch item not found.", 404);

  if (user.role === "SALESPERSON") {
    const access = await executor.query(
      `
        SELECT 1
        FROM dispatch_assignments
        WHERE dispatch_id = $1 AND salesperson_id = $2
      `,
      [item.dispatch_id, user.id]
    );

    if (access.rowCount === 0) {
      throw new AppError("You do not have access to this dispatch item.", 403);
    }
  }

  return item;
}

export class DispatchService {
  static async listGrouped({ search = "", salespersonId = null, dateFilter = "ALL", page = 1, limit = 200 }) {
    const params = [];
    const where = ["d.status = 'ACTIVE'"];

    if (salespersonId) {
      params.push(salespersonId);
      where.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_filter
          WHERE da_filter.dispatch_id = d.id
            AND da_filter.salesperson_id::text = $${params.length}
        )
      `);
    }

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`
        (
          d.dispatch_number ILIKE $${params.length}
          OR EXISTS (
            SELECT 1
            FROM dispatch_assignments da_search
            JOIN users u_search ON u_search.id = da_search.salesperson_id
            WHERE da_search.dispatch_id = d.id
              AND (u_search.name ILIKE $${params.length} OR u_search.employee_id ILIKE $${params.length})
          )
        )
      `);
    }

    applyDateFilter(where, params, "d.created_at", dateFilter);

    params.push(limit, (page - 1) * limit);

    const result = await query(
      `
        WITH active_items AS (
          SELECT
            dispatch_id,
            count(*)::int AS total_items,
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross_weight,
            COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone_weight,
            COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl_weight,
            COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad_weight,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS net_weight
          FROM dispatch_items
          WHERE status = 'ACTIVE'
          GROUP BY dispatch_id
        ),
        assigned AS (
          SELECT
            da.dispatch_id,
            jsonb_agg(
              jsonb_build_object(
                'id', u.id::text,
                'employee_id', u.employee_id,
                'name', u.name,
                'full_name', u.name,
                'email', u.email,
                'role', u.role
              )
              ORDER BY u.name
            ) AS assigned_users,
            string_agg(u.name, ', ' ORDER BY u.name) AS assigned_staff_names
          FROM dispatch_assignments da
          JOIN users u ON u.id = da.salesperson_id
          GROUP BY da.dispatch_id
        )
        SELECT
          d.id::text,
          d.dispatch_number AS dispatch_no,
          d.created_at,
          d.updated_at,
          COALESCE(ai.total_items, 0) AS total_items,
          COALESCE(ai.gross_weight, 0)::numeric(12,3) AS gross_weight,
          COALESCE(ai.stone_weight, 0)::numeric(12,3) AS stone_weight,
          COALESCE(ai.pearl_weight, 0)::numeric(12,3) AS pearl_weight,
          COALESCE(ai.ad_weight, 0)::numeric(12,3) AS ad_weight,
          COALESCE(ai.net_weight, 0)::numeric(12,3) AS net_weight,
          COALESCE(assigned.assigned_users, '[]'::jsonb) AS assigned_users,
          assigned.assigned_staff_names
        FROM dispatches d
        LEFT JOIN active_items ai ON ai.dispatch_id = d.id
        LEFT JOIN assigned ON assigned.dispatch_id = d.id
        WHERE ${where.join(" AND ")}
        ORDER BY d.created_at DESC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      items: result.rows.map(normalizeGroupedDispatch),
      isGrouped: true,
      pagination: { page, limit },
    };
  }

  static async listItems({ user, search = "", salespersonId = null, dateFilter = "ALL", page = 1, limit = 200 }) {
    const params = [];
    const where = ["di.status = 'ACTIVE'", "d.status = 'ACTIVE'"];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_self
          WHERE da_self.dispatch_id = di.dispatch_id
            AND da_self.salesperson_id = $${params.length}
        )
      `);
    } else if (salespersonId) {
      params.push(salespersonId);
      where.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_filter
          WHERE da_filter.dispatch_id = di.dispatch_id
            AND da_filter.salesperson_id::text = $${params.length}
        )
      `);
    }

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(di.item_number ILIKE $${params.length} OR d.dispatch_number ILIKE $${params.length})`);
    }

    applyDateFilter(where, params, "di.created_at", dateFilter);

    params.push(limit, (page - 1) * limit);

    const result = await query(
      `
        WITH assigned AS (
          SELECT
            da.dispatch_id,
            jsonb_agg(
              jsonb_build_object(
                'id', u.id::text,
                'employee_id', u.employee_id,
                'name', u.name,
                'full_name', u.name,
                'email', u.email
              )
              ORDER BY u.name
            ) AS assigned_users
          FROM dispatch_assignments da
          JOIN users u ON u.id = da.salesperson_id
          GROUP BY da.dispatch_id
        )
        SELECT
          di.id::text,
          di.dispatch_id::text,
          d.dispatch_number AS dispatch_no,
          di.item_number,
          di.description,
          di.gross_weight,
          di.total_stone_weight,
          di.pearl_weight,
          di.ad_weight,
          di.net_weight,
          di.is_verified,
          di.status,
          di.created_at,
          di.updated_at,
          COALESCE(assigned.assigned_users, '[]'::jsonb) AS assigned_users
        FROM dispatch_items di
        JOIN dispatches d ON d.id = di.dispatch_id
        LEFT JOIN assigned ON assigned.dispatch_id = di.dispatch_id
        WHERE ${where.join(" AND ")}
        ORDER BY di.created_at DESC, di.item_number ASC
        LIMIT $${params.length - 1}
        OFFSET $${params.length}
      `,
      params
    );

    return {
      items: result.rows.map(normalizeItem),
      pagination: { page, limit },
    };
  }

  static async listForRequest(req, user) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const salespersonId = searchParams.get("salesperson_id");
    const dateFilter = searchParams.get("date") || "ALL";
    const { page, limit } = getPagination(searchParams);

    if (user.role === "ADMIN" || user.role === "MANAGER") {
      return this.listGrouped({ search, salespersonId, dateFilter, page, limit });
    }

    return this.listItems({ user, search, salespersonId, dateFilter, page, limit });
  }

  static async createBatch(body, user) {
    const dispatchNumber = String(body.dispatch_no || body.dispatch_number || "").trim() || null;
    const sourceItems = Array.isArray(body.items) && body.items.length > 0
      ? body.items
      : [
          {
            itemNo: body.item_number || null,
            grossWeight: body.gross_weight,
            stoneWeight: body.stone_weight,
            pearlWeight: body.pearl_weight,
            name: body.description,
          },
        ];

    const validation = validateDispatchItems(sourceItems);
    if (validation.errors.length > 0) {
      throw new AppError("Invalid dispatch item data.", 400, validation.errors);
    }

    const requestedAssignees = body.assigned_salespeople || body.assigned_user_ids || body.user_ids || [];
    const assignedUserIds = await UserService.resolveSalespersonIds(requestedAssignees);
    if (assignedUserIds.length === 0) {
      throw new AppError("At least one active salesperson assignment is required.", 400);
    }

    return withTransaction(async (client) => {
      const dispatchResult = await client.query(
        `
          INSERT INTO dispatches (dispatch_number, created_by)
          VALUES (COALESCE(NULLIF($1, ''), generate_dispatch_number()), $2)
          RETURNING id::text, dispatch_number
        `,
        [dispatchNumber, user.id]
      );

      const dispatch = dispatchResult.rows[0];

      for (const [index, item] of validation.items.entries()) {
        await client.query(
          `
            INSERT INTO dispatch_items (
              dispatch_id,
              item_number,
              description,
              gross_weight,
              total_stone_weight,
              pearl_weight,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            dispatch.id,
            item.item_number || `${dispatch.dispatch_number}-${index + 1}`,
            item.description,
            item.gross_weight,
            item.total_stone_weight,
            item.pearl_weight,
            user.id,
          ]
        );
      }

      for (const salespersonId of assignedUserIds) {
        await client.query(
          `
            INSERT INTO dispatch_assignments (dispatch_id, salesperson_id)
            VALUES ($1, $2)
            ON CONFLICT (dispatch_id, salesperson_id) DO NOTHING
          `,
          [dispatch.id, salespersonId]
        );
      }

      await ActivityService.log(
        user.id,
        "Dispatch Created",
        `User ${user.full_name || user.name} created dispatch ${dispatch.dispatch_number} (${validation.items.length} items)`,
        client
      );

      const details = await this.getDispatchByIdentifier(dispatch.id, user, client);
      return details;
    });
  }

  static async getDispatchByIdentifier(identifier, user, client = null) {
    const executor = client || { query };
    const accessWhere = [];
    const params = [String(identifier)];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      accessWhere.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_self
          WHERE da_self.dispatch_id = d.id
            AND da_self.salesperson_id = $${params.length}
        )
      `);
    }

    const result = await executor.query(
      `
        WITH active_items AS (
          SELECT
            dispatch_id,
            count(*)::int AS total_items,
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross_weight,
            COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone_weight,
            COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl_weight,
            COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad_weight,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS net_weight
          FROM dispatch_items
          WHERE status = 'ACTIVE'
          GROUP BY dispatch_id
        ),
        assigned AS (
          SELECT
            da.dispatch_id,
            jsonb_agg(
              jsonb_build_object('id', u.id::text, 'employee_id', u.employee_id, 'name', u.name, 'full_name', u.name, 'email', u.email, 'role', u.role)
              ORDER BY u.name
            ) AS assigned_users,
            string_agg(u.name, ', ' ORDER BY u.name) AS assigned_staff_names
          FROM dispatch_assignments da
          JOIN users u ON u.id = da.salesperson_id
          GROUP BY da.dispatch_id
        )
        SELECT
          d.id::text,
          d.dispatch_number AS dispatch_no,
          d.created_at,
          d.updated_at,
          COALESCE(ai.total_items, 0) AS total_items,
          COALESCE(ai.gross_weight, 0)::numeric(12,3) AS gross_weight,
          COALESCE(ai.stone_weight, 0)::numeric(12,3) AS stone_weight,
          COALESCE(ai.pearl_weight, 0)::numeric(12,3) AS pearl_weight,
          COALESCE(ai.ad_weight, 0)::numeric(12,3) AS ad_weight,
          COALESCE(ai.net_weight, 0)::numeric(12,3) AS net_weight,
          COALESCE(assigned.assigned_users, '[]'::jsonb) AS assigned_users,
          assigned.assigned_staff_names
        FROM dispatches d
        LEFT JOIN active_items ai ON ai.dispatch_id = d.id
        LEFT JOIN assigned ON assigned.dispatch_id = d.id
        WHERE (d.id::text = $1 OR d.dispatch_number = $1)
          ${accessWhere.length ? `AND ${accessWhere.join(" AND ")}` : ""}
        LIMIT 1
      `,
      params
    );

    return normalizeGroupedDispatch(result.rows[0]);
  }

  static async getItemsByDispatchIdentifier(identifier, user) {
    const params = [String(identifier)];
    const where = ["(d.id::text = $1 OR d.dispatch_number = $1)", "di.status = 'ACTIVE'"];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_self
          WHERE da_self.dispatch_id = d.id
            AND da_self.salesperson_id = $${params.length}
        )
      `);
    }

    const result = await query(
      `
        WITH assigned AS (
          SELECT
            da.dispatch_id,
            jsonb_agg(
              jsonb_build_object('id', u.id::text, 'employee_id', u.employee_id, 'name', u.name, 'full_name', u.name, 'email', u.email)
              ORDER BY u.name
            ) AS assigned_users
          FROM dispatch_assignments da
          JOIN users u ON u.id = da.salesperson_id
          GROUP BY da.dispatch_id
        )
        SELECT
          di.id::text,
          di.dispatch_id::text,
          d.dispatch_number AS dispatch_no,
          di.item_number,
          di.description,
          di.gross_weight,
          di.total_stone_weight,
          di.pearl_weight,
          di.ad_weight,
          di.net_weight,
          di.is_verified,
          di.status,
          di.created_at,
          di.updated_at,
          COALESCE(assigned.assigned_users, '[]'::jsonb) AS assigned_users
        FROM dispatch_items di
        JOIN dispatches d ON d.id = di.dispatch_id
        LEFT JOIN assigned ON assigned.dispatch_id = di.dispatch_id
        WHERE ${where.join(" AND ")}
        ORDER BY di.item_number ASC, di.created_at ASC
      `,
      params
    );

    return result.rows.map(normalizeItem);
  }

  static async updateDispatchOrItem(identifier, body, user) {
    if (user.role === "SALESPERSON") {
      throw new AppError("Salespersons cannot edit dispatch master data.", 403);
    }

    return withTransaction(async (client) => {
      const dispatchIds = await resolveDispatchIds([identifier], client);

      if (dispatchIds.length > 0) {
        const dispatchId = dispatchIds[0];

        if (body.dispatch_no || body.dispatch_number) {
          await client.query(
            `
              UPDATE dispatches
              SET dispatch_number = $1, updated_at = now()
              WHERE id = $2
            `,
            [String(body.dispatch_no || body.dispatch_number).trim(), dispatchId]
          );
        }

        if (Array.isArray(body.assigned_salespeople) || Array.isArray(body.user_ids)) {
          const assignedUserIds = await UserService.resolveSalespersonIds(body.assigned_salespeople || body.user_ids);
          if (assignedUserIds.length === 0) {
            throw new AppError("At least one active salesperson assignment is required.", 400);
          }

          await client.query("DELETE FROM dispatch_assignments WHERE dispatch_id = $1", [dispatchId]);
          for (const salespersonId of assignedUserIds) {
            await client.query(
              `
                INSERT INTO dispatch_assignments (dispatch_id, salesperson_id)
                VALUES ($1, $2)
                ON CONFLICT (dispatch_id, salesperson_id) DO NOTHING
              `,
              [dispatchId, salespersonId]
            );
          }
        }

        await ActivityService.log(
          user.id,
          "Dispatch Updated",
          `User ${user.full_name || user.name} updated dispatch ${identifier}`,
          client
        );

        return this.getDispatchByIdentifier(dispatchId, user, client);
      }

      const existing = await assertItemAccess(identifier, user, client);
      const weights = calculateWeights({
        gross_weight: body.grossWeight ?? body.gross_weight ?? existing.gross_weight,
        stone_weight: body.stoneWeight ?? body.stone_weight ?? existing.total_stone_weight,
        pearl_weight: body.pearlWeight ?? body.pearl_weight ?? existing.pearl_weight,
      });

      if (weights.errors.length > 0) {
        throw new AppError("Invalid dispatch item data.", 400, weights.errors);
      }

      const result = await client.query(
        `
          UPDATE dispatch_items
          SET
            item_number = COALESCE(NULLIF($1, ''), item_number),
            description = COALESCE(NULLIF($2, ''), description),
            gross_weight = $3,
            total_stone_weight = $4,
            pearl_weight = $5,
            updated_at = now()
          WHERE id = $6
          RETURNING id::text
        `,
        [
          body.itemNo || body.item_number || null,
          body.name || body.description || null,
          weights.weights.gross_weight,
          weights.weights.total_stone_weight,
          weights.weights.pearl_weight,
          existing.id,
        ]
      );

      await ActivityService.log(
        user.id,
        "Item Edited",
        `User ${user.full_name || user.name} edited item ${existing.item_number}`,
        client
      );

      return this.getItemById(result.rows[0].id, user, client);
    });
  }

  static async getItemById(itemId, user, client = null) {
    const executor = client || { query };
    const params = [String(itemId)];
    const where = ["di.id::text = $1"];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`
        EXISTS (
          SELECT 1
          FROM dispatch_assignments da_self
          WHERE da_self.dispatch_id = di.dispatch_id
            AND da_self.salesperson_id = $${params.length}
        )
      `);
    }

    const result = await executor.query(
      `
        WITH assigned AS (
          SELECT
            da.dispatch_id,
            jsonb_agg(jsonb_build_object('id', u.id::text, 'employee_id', u.employee_id, 'name', u.name, 'full_name', u.name, 'email', u.email) ORDER BY u.name) AS assigned_users
          FROM dispatch_assignments da
          JOIN users u ON u.id = da.salesperson_id
          GROUP BY da.dispatch_id
        )
        SELECT
          di.id::text,
          di.dispatch_id::text,
          d.dispatch_number AS dispatch_no,
          di.item_number,
          di.description,
          di.gross_weight,
          di.total_stone_weight,
          di.pearl_weight,
          di.ad_weight,
          di.net_weight,
          di.is_verified,
          di.status,
          di.created_at,
          di.updated_at,
          COALESCE(assigned.assigned_users, '[]'::jsonb) AS assigned_users
        FROM dispatch_items di
        JOIN dispatches d ON d.id = di.dispatch_id
        LEFT JOIN assigned ON assigned.dispatch_id = di.dispatch_id
        WHERE ${where.join(" AND ")}
        LIMIT 1
      `,
      params
    );

    return normalizeItem(result.rows[0]);
  }

  static async addItemsToDispatch(body, user) {
    if (user.role === "SALESPERSON") {
      throw new AppError("Salespersons cannot add ornaments to dispatches.", 403);
    }

    const dispatchIdentifier = body.dispatch_id || body.dispatch_no || body.dispatch_number;
    if (!dispatchIdentifier) {
      throw new AppError("dispatch_id or dispatch_no is required.", 400);
    }

    const sourceItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : [body];
    const validation = validateDispatchItems(sourceItems);
    if (validation.errors.length > 0) {
      throw new AppError("Invalid dispatch item data.", 400, validation.errors);
    }

    return withTransaction(async (client) => {
      const dispatchIds = await resolveDispatchIds([dispatchIdentifier], client);
      if (dispatchIds.length === 0) {
        throw new AppError("Dispatch not found.", 404);
      }

      const dispatchId = dispatchIds[0];
      const dispatchResult = await client.query(
        `
          SELECT dispatch_number
          FROM dispatches
          WHERE id = $1 AND status = 'ACTIVE'
          FOR UPDATE
        `,
        [dispatchId]
      );

      const dispatch = dispatchResult.rows[0];
      if (!dispatch) {
        throw new AppError("Dispatch is not active.", 409);
      }

      const insertedItems = [];
      for (const [index, item] of validation.items.entries()) {
        const itemResult = await client.query(
          `
            INSERT INTO dispatch_items (
              dispatch_id,
              item_number,
              description,
              gross_weight,
              total_stone_weight,
              pearl_weight,
              created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id::text
          `,
          [
            dispatchId,
            item.item_number || `${dispatch.dispatch_number}-${Date.now()}-${index + 1}`,
            item.description,
            item.gross_weight,
            item.total_stone_weight,
            item.pearl_weight,
            user.id,
          ]
        );

        insertedItems.push(await this.getItemById(itemResult.rows[0].id, user, client));
      }

      await ActivityService.log(
        user.id,
        "Item Added",
        `User ${user.full_name || user.name} added ${insertedItems.length} item(s) to dispatch ${dispatch.dispatch_number}`,
        client
      );

      return insertedItems.length === 1 ? insertedItems[0] : insertedItems;
    });
  }

  static async updateItem(itemId, body, user) {
    const payload = body || {};

    return withTransaction(async (client) => {
      const existing = await assertItemAccess(itemId, user, client);

      const weights = calculateWeights({
        gross_weight: payload.grossWeight ?? payload.gross_weight ?? existing.gross_weight,
        total_stone_weight:
          payload.totalStoneWeight ??
          payload.total_stone_weight ??
          payload.stoneWeight ??
          payload.stone_weight ??
          existing.total_stone_weight,
        pearl_weight: payload.pearlWeight ?? payload.pearl_weight ?? existing.pearl_weight,
      });

      if (weights.errors.length > 0) {
        throw new AppError("Invalid dispatch item data.", 400, weights.errors);
      }

      await client.query(
        `
          UPDATE dispatch_items
          SET
            item_number = COALESCE(NULLIF($1, ''), item_number),
            description = COALESCE(NULLIF($2, ''), description),
            gross_weight = $3,
            total_stone_weight = $4,
            pearl_weight = $5,
            is_verified = COALESCE($6, is_verified),
            updated_at = now()
          WHERE id = $7
        `,
        [
          payload.itemNo || payload.item_number || null,
          payload.name || payload.description || null,
          weights.weights.gross_weight,
          weights.weights.total_stone_weight,
          weights.weights.pearl_weight,
          typeof payload.is_verified === "boolean" ? payload.is_verified : null,
          existing.id,
        ]
      );

      await ActivityService.log(
        user.id,
        typeof payload.is_verified === "boolean" && Object.keys(payload).length === 1
          ? payload.is_verified
            ? "Item Verified"
            : "Item Verification Removed"
          : "Item Edited",
        `User ${user.full_name || user.name} updated item ${existing.item_number}`,
        client
      );

      return this.getItemById(existing.id, user, client);
    });
  }

  static async assignUsersToDispatches({ dispatchIds, assignees, user }) {
    if (!Array.isArray(dispatchIds) || dispatchIds.length === 0) {
      throw new AppError("dispatch_ids must include at least one dispatch.", 400);
    }

    const assignedUserIds = await UserService.resolveSalespersonIds(assignees);
    if (assignedUserIds.length === 0) {
      throw new AppError("At least one active salesperson assignment is required.", 400);
    }

    return withTransaction(async (client) => {
      const resolvedDispatchIds = await resolveDispatchIds(dispatchIds, client);
      if (resolvedDispatchIds.length === 0) {
        throw new AppError("No matching dispatches found.", 404);
      }

      for (const dispatchId of resolvedDispatchIds) {
        await client.query("DELETE FROM dispatch_assignments WHERE dispatch_id = $1", [dispatchId]);
        for (const salespersonId of assignedUserIds) {
          await client.query(
            `
              INSERT INTO dispatch_assignments (dispatch_id, salesperson_id)
              VALUES ($1, $2)
              ON CONFLICT (dispatch_id, salesperson_id) DO NOTHING
            `,
            [dispatchId, salespersonId]
          );
        }
      }

      await ActivityService.log(
        user.id,
        "Assignment Changed",
        `User ${user.full_name || user.name} assigned ${resolvedDispatchIds.length} dispatch(es) to ${assignedUserIds.length} salesperson(s)`,
        client
      );

      return {
        dispatch_count: resolvedDispatchIds.length,
        salesperson_count: assignedUserIds.length,
      };
    });
  }

  static async markItemOutcome({ itemId, status, remarks = "", user }) {
    if (!["SOLD", "DROP"].includes(status)) {
      throw new AppError("Invalid status type. Must be SOLD or DROP.", 400);
    }

    if (user.role !== "SALESPERSON") {
      throw new AppError("Only assigned salespersons can mark ornaments as sold or dropped.", 403);
    }

    return withTransaction(async (client) => {
      const item = await assertItemAccess(itemId, user, client);
      if (item.status !== "ACTIVE") {
        throw new AppError("Only active dispatch items can be moved to sales or drop history.", 409);
      }

      const historyTable = status === "SOLD" ? "sales_history" : "drop_history";
      const dateColumn = status === "SOLD" ? "sold_at" : "dropped_at";

      const history = await client.query(
        `
          INSERT INTO ${historyTable} (
            dispatch_item_id,
            dispatch_id,
            salesperson_id,
            gross_weight,
            total_stone_weight,
            pearl_weight,
            remarks
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id::text, ${dateColumn}
        `,
        [
          item.id,
          item.dispatch_id,
          user.id,
          item.gross_weight,
          item.total_stone_weight,
          item.pearl_weight,
          remarks || (status === "SOLD" ? "Sold item" : "Dropped item"),
        ]
      );

      const trash = await client.query(
        `
          INSERT INTO trash_history (
            dispatch_item_id,
            dispatch_id,
            salesperson_id,
            deleted_by,
            status,
            remarks,
            expires_at
          )
          VALUES ($1, $2, $3, $3, $4, $5, now() + interval '24 hours')
          RETURNING id::text
        `,
        [
          item.id,
          item.dispatch_id,
          user.id,
          status,
          remarks || (status === "SOLD" ? "Sold item" : "Dropped item"),
        ]
      );

      await client.query(
        `
          UPDATE dispatch_items
          SET status = $1, archived_at = now(), deleted_by = $2, updated_at = now()
          WHERE id = $3
        `,
        [status, user.id, item.id]
      );

      await ActivityService.log(
        user.id,
        status === "SOLD" ? "Sale" : "Drop",
        `Salesperson ${user.full_name || user.name} marked item ${item.item_number} (${Number(item.net_weight).toFixed(3)}g) as ${status}. Note: ${remarks || "None"}`,
        client
      );

      return {
        history_id: history.rows[0]?.id,
        trash_id: trash.rows[0]?.id,
        status,
      };
    });
  }

  static async deleteDispatchOrItem({ identifier, user }) {
    if (user.role === "SALESPERSON") {
      throw new AppError("Salespersons must choose Sold or Drop when removing an ornament.", 400);
    }

    return withTransaction(async (client) => {
      const dispatchIds = await resolveDispatchIds([identifier], client);

      if (dispatchIds.length > 0) {
        const dispatchId = dispatchIds[0];
        const items = await client.query(
          `
            SELECT id::text
            FROM dispatch_items
            WHERE dispatch_id = $1 AND status = 'ACTIVE'
            FOR UPDATE
          `,
          [dispatchId]
        );

        for (const item of items.rows) {
          await client.query(
            `
              INSERT INTO trash_history (dispatch_item_id, dispatch_id, deleted_by, status, remarks, expires_at)
              VALUES ($1, $2, $3, 'DELETED', 'Deleted by admin/manager', now() + interval '24 hours')
              ON CONFLICT DO NOTHING
            `,
            [item.id, dispatchId, user.id]
          );
        }

        await client.query(
          `
            UPDATE dispatch_items
            SET status = 'DELETED', archived_at = now(), deleted_by = $1, updated_at = now()
            WHERE dispatch_id = $2 AND status = 'ACTIVE'
          `,
          [user.id, dispatchId]
        );

        await client.query(
          `
            UPDATE dispatches
            SET status = 'DELETED', deleted_at = now(), updated_at = now()
            WHERE id = $1
          `,
          [dispatchId]
        );

        await ActivityService.log(
          user.id,
          "Dispatch Deleted",
          `User ${user.full_name || user.name} deleted dispatch ${identifier}`,
          client
        );

        return { deleted_dispatch_id: dispatchId, deleted_items: items.rowCount };
      }

      const item = await assertItemAccess(identifier, user, client);
      if (item.status !== "ACTIVE") {
        throw new AppError("Dispatch item is not active.", 409);
      }

      await client.query(
        `
          INSERT INTO trash_history (dispatch_item_id, dispatch_id, deleted_by, status, remarks, expires_at)
          VALUES ($1, $2, $3, 'DELETED', 'Deleted by admin/manager', now() + interval '24 hours')
        `,
        [item.id, item.dispatch_id, user.id]
      );

      await client.query(
        `
          UPDATE dispatch_items
          SET status = 'DELETED', archived_at = now(), deleted_by = $1, updated_at = now()
          WHERE id = $2
        `,
        [user.id, item.id]
      );

      await ActivityService.log(
        user.id,
        "Item Deleted",
        `User ${user.full_name || user.name} deleted item ${item.item_number}`,
        client
      );

      return { deleted_item_id: item.id };
    });
  }

  static getPaginationFromRequest(req) {
    return getPagination(new URL(req.url).searchParams);
  }
}
