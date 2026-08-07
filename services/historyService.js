import { query, withTransaction } from "@/database/postgres";
import { AppError } from "@/utils/errors";
import { calculateWeights } from "@/utils/validation";
import { ActivityService } from "./activityService";

function dateColumnForHistory(type) {
  return type === "drop" ? "dropped_at" : "sold_at";
}

function tableForHistory(type) {
  return type === "drop" ? "drop_history" : "sales_history";
}

function mapHistoryRow(row, type = "sale") {
  if (!row) return null;

  const stone = Number(row.total_stone_weight ?? row.stone_weight ?? 0);
  const pearl = Number(row.pearl_weight || 0);
  const dateColumn = dateColumnForHistory(type);

  return {
    id: row.id?.toString(),
    dispatch_item_id: row.dispatch_item_id?.toString(),
    dispatch_id: row.dispatch_id?.toString(),
    dispatch_no: row.dispatch_no,
    item_number: row.item_number,
    salesperson_id: row.salesperson_id?.toString(),
    salesperson_name: row.salesperson_name,
    gross_weight: Number(Number(row.gross_weight || 0).toFixed(3)),
    total_stone_weight: Number(stone.toFixed(3)),
    stone_weight: Number(stone.toFixed(3)),
    pearl_weight: Number(pearl.toFixed(3)),
    ad_weight: Number(Number(row.ad_weight ?? Math.max(0, stone - pearl)).toFixed(3)),
    net_weight: Number(Number(row.net_weight || 0).toFixed(3)),
    remarks: row.remarks || "",
    sold_at: row.sold_at,
    sale_date: row.sold_at,
    dropped_at: row.dropped_at,
    drop_date: row.dropped_at,
    created_at: row[dateColumn],
  };
}

function mapTrashRow(row) {
  if (!row) return null;

  const stone = Number(row.total_stone_weight ?? row.stone_weight ?? 0);
  const pearl = Number(row.pearl_weight || 0);

  return {
    id: row.id?.toString(),
    dispatch_item_id: row.dispatch_item_id?.toString(),
    dispatch_id: row.dispatch_id?.toString(),
    item_number: row.item_number,
    item_name: row.item_name || row.description || "Gold Ornament",
    salesperson_id: row.salesperson_id?.toString() || null,
    salesperson_name: row.salesperson_name || row.deleted_by_name,
    deleted_by: row.deleted_by?.toString(),
    deleted_by_name: row.deleted_by_name,
    gross_weight: Number(Number(row.gross_weight || 0).toFixed(3)),
    total_stone_weight: Number(stone.toFixed(3)),
    stone_weight: Number(stone.toFixed(3)),
    pearl_weight: Number(pearl.toFixed(3)),
    ad_weight: Number(Number(row.ad_weight ?? Math.max(0, stone - pearl)).toFixed(3)),
    net_weight: Number(Number(row.net_weight || 0).toFixed(3)),
    status: row.status,
    remarks: row.remarks || "",
    deleted_at: row.deleted_at,
    expires_at: row.expires_at,
  };
}

export class HistoryService {
  static async list(type, { user, limit = 500 } = {}) {
    const table = tableForHistory(type);
    const dateColumn = dateColumnForHistory(type);
    const params = [];
    const where = [];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`h.salesperson_id = $${params.length}`);
    }

    params.push(Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000));

    const result = await query(
      `
        SELECT
          h.id::text,
          h.dispatch_item_id::text,
          h.dispatch_id::text,
          h.salesperson_id::text,
          h.gross_weight,
          h.total_stone_weight,
          h.pearl_weight,
          h.ad_weight,
          h.net_weight,
          h.remarks,
          h.${dateColumn},
          di.item_number,
          di.description,
          d.dispatch_number AS dispatch_no,
          u.name AS salesperson_name
        FROM ${table} h
        JOIN dispatch_items di ON di.id = h.dispatch_item_id
        JOIN dispatches d ON d.id = h.dispatch_id
        JOIN users u ON u.id = h.salesperson_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY h.${dateColumn} DESC
        LIMIT $${params.length}
      `,
      params
    );

    return result.rows.map((row) => mapHistoryRow(row, type));
  }

  static async find(type, id, client = null) {
    const table = tableForHistory(type);
    const dateColumn = dateColumnForHistory(type);
    const executor = client || { query };

    const result = await executor.query(
      `
        SELECT
          h.id::text,
          h.dispatch_item_id::text,
          h.dispatch_id::text,
          h.salesperson_id::text,
          h.gross_weight,
          h.total_stone_weight,
          h.pearl_weight,
          h.ad_weight,
          h.net_weight,
          h.remarks,
          h.${dateColumn},
          di.item_number,
          di.description,
          d.dispatch_number AS dispatch_no,
          u.name AS salesperson_name
        FROM ${table} h
        JOIN dispatch_items di ON di.id = h.dispatch_item_id
        JOIN dispatches d ON d.id = h.dispatch_id
        JOIN users u ON u.id = h.salesperson_id
        WHERE h.id::text = $1
      `,
      [id]
    );

    return mapHistoryRow(result.rows[0], type);
  }

  static async updateSale(id, body, user) {
    return withTransaction(async (client) => {
      const existing = await this.find("sale", id, client);
      if (!existing) throw new AppError("Sales record not found.", 404);

      if (user.role === "SALESPERSON" && existing.salesperson_id !== user.id) {
        throw new AppError("You can only update your own sales records.", 403);
      }

      const weights = calculateWeights({
        gross_weight: body.grossWeight ?? body.gross_weight ?? existing.gross_weight,
        stone_weight: body.stoneWeight ?? body.stone_weight ?? existing.total_stone_weight,
        pearl_weight: body.pearlWeight ?? body.pearl_weight ?? existing.pearl_weight,
      });

      if (weights.errors.length > 0) {
        throw new AppError("Invalid sales record data.", 400, weights.errors);
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
            updated_at = now()
          WHERE id = $6
        `,
        [
          body.itemNo || body.item_number || null,
          body.name || body.description || null,
          weights.weights.gross_weight,
          weights.weights.total_stone_weight,
          weights.weights.pearl_weight,
          existing.dispatch_item_id,
        ]
      );

      await client.query(
        `
          UPDATE sales_history
          SET
            gross_weight = $1,
            total_stone_weight = $2,
            pearl_weight = $3,
            remarks = COALESCE($4, remarks)
          WHERE id = $5
        `,
        [
          weights.weights.gross_weight,
          weights.weights.total_stone_weight,
          weights.weights.pearl_weight,
          body.remarks ?? null,
          id,
        ]
      );

      await ActivityService.log(
        user.id,
        "Sale Updated",
        `User ${user.full_name || user.name} updated sales record ${id}`,
        client
      );

      return this.find("sale", id, client);
    });
  }

  static async deleteSale(id, user) {
    return withTransaction(async (client) => {
      const existing = await this.find("sale", id, client);
      if (!existing) throw new AppError("Sales record not found.", 404);

      await client.query("DELETE FROM sales_history WHERE id = $1", [id]);
      await client.query(
        `
          UPDATE dispatch_items
          SET status = 'ACTIVE', archived_at = NULL, deleted_by = NULL, updated_at = now()
          WHERE id = $1 AND status = 'SOLD'
        `,
        [existing.dispatch_item_id]
      );
      await client.query(
        `
          DELETE FROM trash_history
          WHERE dispatch_item_id = $1 AND status = 'SOLD'
        `,
        [existing.dispatch_item_id]
      );

      await ActivityService.log(
        user.id,
        "Sale Deleted",
        `User ${user.full_name || user.name} deleted sales record ${id}`,
        client
      );

      return true;
    });
  }

  static async listTrash({ user, limit = 500 }) {
    const params = [];
    const where = [];

    if (user.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`t.salesperson_id = $${params.length}`);
      where.push("t.expires_at > now()");
    }

    params.push(Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000));

    const result = await query(
      `
        SELECT
          t.id::text,
          t.dispatch_item_id::text,
          t.dispatch_id::text,
          t.salesperson_id::text,
          t.deleted_by::text,
          t.status,
          t.remarks,
          t.deleted_at,
          t.expires_at,
          di.item_number,
          di.description,
          di.gross_weight,
          di.total_stone_weight,
          di.pearl_weight,
          di.ad_weight,
          di.net_weight,
          salesperson.name AS salesperson_name,
          deleted_by_user.name AS deleted_by_name
        FROM trash_history t
        JOIN dispatch_items di ON di.id = t.dispatch_item_id
        LEFT JOIN users salesperson ON salesperson.id = t.salesperson_id
        LEFT JOIN users deleted_by_user ON deleted_by_user.id = t.deleted_by
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY t.deleted_at DESC
        LIMIT $${params.length}
      `,
      params
    );

    return result.rows.map(mapTrashRow);
  }

  static async restoreTrash(id, user) {
    return withTransaction(async (client) => {
      const result = await client.query(
        `
          SELECT
            t.id::text,
            t.dispatch_item_id::text,
            t.dispatch_id::text,
            t.salesperson_id::text,
            t.status,
            t.expires_at,
            di.item_number
          FROM trash_history t
          JOIN dispatch_items di ON di.id = t.dispatch_item_id
          WHERE t.id::text = $1
          FOR UPDATE OF t
        `,
        [id]
      );

      const trash = result.rows[0];
      if (!trash) throw new AppError("Trash item not found.", 404);

      if (user.role === "SALESPERSON") {
        if (trash.salesperson_id !== user.id) {
          throw new AppError("You can only restore your own trash items.", 403);
        }

        if (new Date(trash.expires_at).getTime() <= Date.now()) {
          throw new AppError("This trash item is no longer available for salesperson restore.", 403);
        }
      }

      if (trash.status === "SOLD") {
        await client.query("DELETE FROM sales_history WHERE dispatch_item_id = $1", [trash.dispatch_item_id]);
      } else if (trash.status === "DROP") {
        await client.query("DELETE FROM drop_history WHERE dispatch_item_id = $1", [trash.dispatch_item_id]);
      }

      await client.query(
        `
          UPDATE dispatch_items
          SET status = 'ACTIVE', archived_at = NULL, deleted_by = NULL, updated_at = now()
          WHERE id = $1
        `,
        [trash.dispatch_item_id]
      );

      await client.query(
        `
          UPDATE dispatches
          SET status = 'ACTIVE', deleted_at = NULL, updated_at = now()
          WHERE id = $1 AND status = 'DELETED'
        `,
        [trash.dispatch_id]
      );

      await client.query("DELETE FROM trash_history WHERE id = $1", [id]);

      await ActivityService.log(
        user.id,
        "Trash Restored",
        `User ${user.full_name || user.name} restored item ${trash.item_number} from trash`,
        client
      );

      return { restored_item_id: trash.dispatch_item_id };
    });
  }

  static async purgeTrash(id, user) {
    return withTransaction(async (client) => {
      const result = await client.query(
        `
          SELECT id::text, dispatch_item_id::text, salesperson_id::text, status, expires_at
          FROM trash_history
          WHERE id::text = $1
          FOR UPDATE
        `,
        [id]
      );

      const trash = result.rows[0];
      if (!trash) throw new AppError("Trash item not found.", 404);

      if (user.role === "SALESPERSON") {
        if (trash.salesperson_id !== user.id) {
          throw new AppError("You can only purge your own trash items.", 403);
        }

        if (new Date(trash.expires_at).getTime() <= Date.now()) {
          throw new AppError("This trash item is no longer available to purge.", 403);
        }
      }

      await client.query("DELETE FROM trash_history WHERE id = $1", [id]);

      await ActivityService.log(
        user.id,
        "Trash Purged",
        `User ${user.full_name || user.name} permanently removed trash record ${id}`,
        client
      );

      return true;
    });
  }
}
