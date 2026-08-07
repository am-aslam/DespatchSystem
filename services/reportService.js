import { query } from "@/database/postgres";

function roundWeight(value) {
  return Number(Number(value || 0).toFixed(3));
}

function roleFilterForHistory(user, params, alias = "h") {
  if (user.role !== "SALESPERSON") return "";
  params.push(user.id);
  return `WHERE ${alias}.salesperson_id = $${params.length}`;
}

export class ReportService {
  static async getSystemTotals(user = null) {
    const params = [];
    let activeWhere = "WHERE di.status = 'ACTIVE'";
    let salesWhere = "";
    let dropWhere = "";

    if (user?.role === "SALESPERSON") {
      params.push(user.id);
      activeWhere += `
        AND EXISTS (
          SELECT 1
          FROM dispatch_assignments da
          WHERE da.dispatch_id = di.dispatch_id
            AND da.salesperson_id = $${params.length}
        )
      `;
      salesWhere = `WHERE salesperson_id = $${params.length}`;
      dropWhere = `WHERE salesperson_id = $${params.length}`;
    }

    const result = await query(
      `
        WITH active_stats AS (
          SELECT
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross,
            COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone,
            COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl,
            COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS net,
            count(*)::int AS count
          FROM dispatch_items di
          ${activeWhere}
        ),
        sales_stats AS (
          SELECT
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross,
            COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone,
            COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl,
            COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS net,
            count(*)::int AS count
          FROM sales_history
          ${salesWhere}
        ),
        drop_stats AS (
          SELECT
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross,
            COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone,
            COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl,
            COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS net,
            count(*)::int AS count
          FROM drop_history
          ${dropWhere}
        )
        SELECT
          active_stats.gross AS remaining_gross,
          active_stats.stone AS remaining_stone,
          active_stats.pearl AS remaining_pearl,
          active_stats.ad AS remaining_ad,
          active_stats.net AS remaining_net,
          active_stats.count AS remaining_count,
          sales_stats.gross AS sales_gross,
          sales_stats.stone AS sales_stone,
          sales_stats.pearl AS sales_pearl,
          sales_stats.ad AS sales_ad,
          sales_stats.net AS sales_net,
          sales_stats.count AS sales_count,
          drop_stats.gross AS drop_gross,
          drop_stats.stone AS drop_stone,
          drop_stats.pearl AS drop_pearl,
          drop_stats.ad AS drop_ad,
          drop_stats.net AS drop_net,
          drop_stats.count AS drop_count
        FROM active_stats, sales_stats, drop_stats
      `,
      params
    );

    const row = result.rows[0];

    return {
      total_gross: roundWeight(row.remaining_gross + row.sales_gross + row.drop_gross),
      total_stone: roundWeight(row.remaining_stone + row.sales_stone + row.drop_stone),
      total_ad: roundWeight(row.remaining_ad + row.sales_ad + row.drop_ad),
      total_pearl: roundWeight(row.remaining_pearl + row.sales_pearl + row.drop_pearl),
      total_net: roundWeight(row.remaining_net + row.sales_net + row.drop_net),
      remaining_gross: roundWeight(row.remaining_gross),
      remaining_stone: roundWeight(row.remaining_stone),
      remaining_ad: roundWeight(row.remaining_ad),
      remaining_pearl: roundWeight(row.remaining_pearl),
      remaining_net: roundWeight(row.remaining_net),
      remaining_count: row.remaining_count,
      sales_total_gross: roundWeight(row.sales_gross),
      sales_total_stone: roundWeight(row.sales_stone),
      sales_total_ad: roundWeight(row.sales_ad),
      sales_total_pearl: roundWeight(row.sales_pearl),
      sales_total_net: roundWeight(row.sales_net),
      sales_count: row.sales_count,
      drop_total_gross: roundWeight(row.drop_gross),
      drop_total_stone: roundWeight(row.drop_stone),
      drop_total_ad: roundWeight(row.drop_ad),
      drop_total_pearl: roundWeight(row.drop_pearl),
      drop_total_net: roundWeight(row.drop_net),
      drop_count: row.drop_count,
    };
  }

  static async getUserTotals() {
    const result = await query(
      `
        WITH salespersons AS (
          SELECT id, employee_id, name, email
          FROM users
          WHERE role = 'SALESPERSON'
        ),
        assigned AS (
          SELECT
            sp.id,
            count(di.id)::int AS assigned_count,
            COALESCE(sum(di.gross_weight), 0)::numeric(12,3) AS assigned_gross,
            COALESCE(sum(di.total_stone_weight), 0)::numeric(12,3) AS assigned_stone,
            COALESCE(sum(di.pearl_weight), 0)::numeric(12,3) AS assigned_pearl,
            COALESCE(sum(di.ad_weight), 0)::numeric(12,3) AS assigned_ad,
            COALESCE(sum(di.net_weight), 0)::numeric(12,3) AS assigned_net
          FROM salespersons sp
          LEFT JOIN dispatch_assignments da ON da.salesperson_id = sp.id
          LEFT JOIN dispatch_items di ON di.dispatch_id = da.dispatch_id AND di.status = 'ACTIVE'
          GROUP BY sp.id
        ),
        sold AS (
          SELECT
            salesperson_id AS id,
            count(*)::int AS sold_count,
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS sold_gross,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS sold_net
          FROM sales_history
          GROUP BY salesperson_id
        ),
        dropped AS (
          SELECT
            salesperson_id AS id,
            count(*)::int AS dropped_count,
            COALESCE(sum(gross_weight), 0)::numeric(12,3) AS dropped_gross,
            COALESCE(sum(net_weight), 0)::numeric(12,3) AS dropped_net
          FROM drop_history
          GROUP BY salesperson_id
        )
        SELECT
          sp.id::text AS user_id,
          sp.employee_id,
          sp.name,
          sp.email,
          COALESCE(assigned.assigned_count, 0) AS assigned_count,
          COALESCE(assigned.assigned_gross, 0)::numeric(12,3) AS assigned_gross,
          COALESCE(assigned.assigned_stone, 0)::numeric(12,3) AS assigned_stone,
          COALESCE(assigned.assigned_pearl, 0)::numeric(12,3) AS assigned_pearl,
          COALESCE(assigned.assigned_ad, 0)::numeric(12,3) AS assigned_ad,
          COALESCE(assigned.assigned_net, 0)::numeric(12,3) AS assigned_net,
          COALESCE(sold.sold_count, 0) AS sold_count,
          COALESCE(sold.sold_gross, 0)::numeric(12,3) AS sold_gross,
          COALESCE(sold.sold_net, 0)::numeric(12,3) AS sold_net,
          COALESCE(dropped.dropped_count, 0) AS dropped_count,
          COALESCE(dropped.dropped_gross, 0)::numeric(12,3) AS dropped_gross,
          COALESCE(dropped.dropped_net, 0)::numeric(12,3) AS dropped_net
        FROM salespersons sp
        LEFT JOIN assigned ON assigned.id = sp.id
        LEFT JOIN sold ON sold.id = sp.id
        LEFT JOIN dropped ON dropped.id = sp.id
        ORDER BY sp.employee_id ASC
      `
    );

    return result.rows.map((row) => ({
      ...row,
      assigned_gross: roundWeight(row.assigned_gross),
      assigned_stone: roundWeight(row.assigned_stone),
      assigned_pearl: roundWeight(row.assigned_pearl),
      assigned_ad: roundWeight(row.assigned_ad),
      assigned_net: roundWeight(row.assigned_net),
      remaining_gross: roundWeight(row.assigned_gross),
      remaining_net: roundWeight(row.assigned_net),
      sold_gross: roundWeight(row.sold_gross),
      sold_net: roundWeight(row.sold_net),
      dropped_gross: roundWeight(row.dropped_gross),
      dropped_net: roundWeight(row.dropped_net),
    }));
  }

  static async getHistorySummary(type, user) {
    const params = [];
    const table = type === "drop" ? "drop_history" : "sales_history";
    const dateColumn = type === "drop" ? "dropped_at" : "sold_at";
    const where = roleFilterForHistory(user, params, "h");

    const result = await query(
      `
        SELECT
          h.salesperson_id::text,
          u.employee_id,
          u.name AS salesperson_name,
          count(*)::int AS item_count,
          COALESCE(sum(h.gross_weight), 0)::numeric(12,3) AS gross_weight,
          COALESCE(sum(h.total_stone_weight), 0)::numeric(12,3) AS stone_weight,
          COALESCE(sum(h.pearl_weight), 0)::numeric(12,3) AS pearl_weight,
          COALESCE(sum(h.ad_weight), 0)::numeric(12,3) AS ad_weight,
          COALESCE(sum(h.net_weight), 0)::numeric(12,3) AS net_weight,
          min(h.${dateColumn}) AS first_recorded_at,
          max(h.${dateColumn}) AS last_recorded_at
        FROM ${table} h
        JOIN users u ON u.id = h.salesperson_id
        ${where}
        GROUP BY h.salesperson_id, u.employee_id, u.name
        ORDER BY last_recorded_at DESC
      `,
      params
    );

    return result.rows.map((row) => ({
      ...row,
      gross_weight: roundWeight(row.gross_weight),
      stone_weight: roundWeight(row.stone_weight),
      pearl_weight: roundWeight(row.pearl_weight),
      ad_weight: roundWeight(row.ad_weight),
      net_weight: roundWeight(row.net_weight),
    }));
  }

  static async getDispatchReport(user = null) {
    const params = [];
    const where = [];

    if (user?.role === "SALESPERSON") {
      params.push(user.id);
      where.push(`
        d.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM dispatch_assignments da
          WHERE da.dispatch_id = d.id
            AND da.salesperson_id = $${params.length}
        )
      `);
    }

    const result = await query(
      `
        SELECT
          d.id::text,
          d.dispatch_number,
          d.status,
          d.created_at,
          count(di.id)::int AS item_count,
          count(*) FILTER (WHERE di.status = 'ACTIVE')::int AS active_count,
          count(*) FILTER (WHERE di.status = 'SOLD')::int AS sold_count,
          count(*) FILTER (WHERE di.status = 'DROP')::int AS drop_count,
          COALESCE(sum(di.gross_weight), 0)::numeric(12,3) AS gross_weight,
          COALESCE(sum(di.total_stone_weight), 0)::numeric(12,3) AS stone_weight,
          COALESCE(sum(di.pearl_weight), 0)::numeric(12,3) AS pearl_weight,
          COALESCE(sum(di.ad_weight), 0)::numeric(12,3) AS ad_weight,
          COALESCE(sum(di.net_weight), 0)::numeric(12,3) AS net_weight
        FROM dispatches d
        LEFT JOIN dispatch_items di ON di.dispatch_id = d.id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        GROUP BY d.id
        ORDER BY d.created_at DESC
        LIMIT 1000
      `,
      params
    );

    return result.rows.map((row) => ({
      ...row,
      gross_weight: roundWeight(row.gross_weight),
      stone_weight: roundWeight(row.stone_weight),
      pearl_weight: roundWeight(row.pearl_weight),
      ad_weight: roundWeight(row.ad_weight),
      net_weight: roundWeight(row.net_weight),
    }));
  }

  static async getDailyReport(user) {
    return this.getTimeSeriesReport(user, "day");
  }

  static async getMonthlyReport(user) {
    return this.getTimeSeriesReport(user, "month");
  }

  static async getTimeSeriesReport(user, grain) {
    const params = [];
    const salespersonWhere = user.role === "SALESPERSON" ? "WHERE salesperson_id = $1" : "";
    if (user.role === "SALESPERSON") params.push(user.id);

    const result = await query(
      `
        WITH movements AS (
          SELECT sold_at AS occurred_at, salesperson_id, 'SOLD' AS type, gross_weight, total_stone_weight, pearl_weight, ad_weight, net_weight
          FROM sales_history
          ${salespersonWhere}
          UNION ALL
          SELECT dropped_at AS occurred_at, salesperson_id, 'DROP' AS type, gross_weight, total_stone_weight, pearl_weight, ad_weight, net_weight
          FROM drop_history
          ${salespersonWhere}
        )
        SELECT
          date_trunc('${grain}', occurred_at) AS period,
          type,
          count(*)::int AS item_count,
          COALESCE(sum(gross_weight), 0)::numeric(12,3) AS gross_weight,
          COALESCE(sum(total_stone_weight), 0)::numeric(12,3) AS stone_weight,
          COALESCE(sum(pearl_weight), 0)::numeric(12,3) AS pearl_weight,
          COALESCE(sum(ad_weight), 0)::numeric(12,3) AS ad_weight,
          COALESCE(sum(net_weight), 0)::numeric(12,3) AS net_weight
        FROM movements
        GROUP BY period, type
        ORDER BY period DESC, type ASC
        LIMIT 366
      `,
      params
    );

    return result.rows.map((row) => ({
      ...row,
      gross_weight: roundWeight(row.gross_weight),
      stone_weight: roundWeight(row.stone_weight),
      pearl_weight: roundWeight(row.pearl_weight),
      ad_weight: roundWeight(row.ad_weight),
      net_weight: roundWeight(row.net_weight),
    }));
  }
}
