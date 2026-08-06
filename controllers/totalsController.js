import db from "@/database/db";
import { successResponse, errorResponse } from "@/utils/response";

export class TotalsController {
  static async getTotals(req, user) {
    try {
      // 1. All active dispatches sum
      const activeStats = db.prepare(`
        SELECT
          COALESCE(SUM(gross_weight), 0) as total_gross,
          COALESCE(SUM(stone_weight), 0) as total_stone,
          COALESCE(SUM(pearl_weight), 0) as total_pearl,
          COALESCE(SUM(net_weight), 0) as total_net
        FROM dispatch_items
      `).get();

      // 2. All sales history sum
      const salesStats = db.prepare(`
        SELECT
          COALESCE(SUM(gross_weight), 0) as sales_gross,
          COALESCE(SUM(stone_weight), 0) as sales_stone,
          COALESCE(SUM(pearl_weight), 0) as sales_pearl,
          COALESCE(SUM(net_weight), 0) as sales_net,
          COUNT(*) as sales_count
        FROM sales_history
      `).get();

      // 3. All drop history sum
      const dropStats = db.prepare(`
        SELECT
          COALESCE(SUM(gross_weight), 0) as drop_gross,
          COALESCE(SUM(stone_weight), 0) as drop_stone,
          COALESCE(SUM(pearl_weight), 0) as drop_pearl,
          COALESCE(SUM(net_weight), 0) as drop_net,
          COUNT(*) as drop_count
        FROM drop_history
      `).get();

      const totalGross = parseFloat((activeStats.total_gross + salesStats.sales_gross + dropStats.drop_gross).toFixed(3));
      const totalStone = parseFloat((activeStats.total_stone + salesStats.sales_stone + dropStats.drop_stone).toFixed(3));
      const totalPearl = parseFloat((activeStats.total_pearl + salesStats.sales_pearl + dropStats.drop_pearl).toFixed(3));
      const totalNet = parseFloat((activeStats.total_net + salesStats.sales_net + dropStats.drop_net).toFixed(3));

      return successResponse({
        total_gross: totalGross,
        total_stone: totalStone,
        total_pearl: totalPearl,
        total_net: totalNet,
        remaining_gross: parseFloat(activeStats.total_gross.toFixed(3)),
        remaining_net: parseFloat(activeStats.total_net.toFixed(3)),
        sales_total_gross: parseFloat(salesStats.sales_gross.toFixed(3)),
        sales_total_net: parseFloat(salesStats.sales_net.toFixed(3)),
        sales_count: salesStats.sales_count,
        drop_total_gross: parseFloat(dropStats.drop_gross.toFixed(3)),
        drop_total_net: parseFloat(dropStats.drop_net.toFixed(3)),
        drop_count: dropStats.drop_count,
      }, "System totals calculated successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }

  static async getUserTotals(req, user) {
    try {
      const salespersons = db.prepare("SELECT id, employee_id, full_name as name, email, role FROM users WHERE role = 'SALESPERSON'").all();

      const userStats = salespersons.map((sp) => {
        // Assigned Active Dispatches
        const assignedStats = db.prepare(`
          SELECT
            COUNT(d.id) as assigned_count,
            COALESCE(SUM(d.gross_weight), 0) as assigned_gross,
            COALESCE(SUM(d.net_weight), 0) as assigned_net
          FROM dispatch_items d
          JOIN assignments a ON d.id = a.dispatch_id
          WHERE a.user_id = ?
        `).get(sp.id);

        // Sales History
        const soldStats = db.prepare(`
          SELECT
            COUNT(*) as sold_count,
            COALESCE(SUM(gross_weight), 0) as sold_gross,
            COALESCE(SUM(net_weight), 0) as sold_net
          FROM sales_history
          WHERE salesperson_id = ?
        `).get(sp.id);

        // Drop History
        const dropStats = db.prepare(`
          SELECT
            COUNT(*) as dropped_count,
            COALESCE(SUM(gross_weight), 0) as dropped_gross,
            COALESCE(SUM(net_weight), 0) as dropped_net
          FROM drop_history
          WHERE salesperson_id = ?
        `).get(sp.id);

        return {
          user_id: sp.id,
          employee_id: sp.employee_id,
          name: sp.name,
          email: sp.email,
          assigned_count: assignedStats.assigned_count,
          assigned_gross: parseFloat(assignedStats.assigned_gross.toFixed(3)),
          remaining_gross: parseFloat(assignedStats.assigned_gross.toFixed(3)),
          remaining_net: parseFloat(assignedStats.assigned_net.toFixed(3)),
          sold_count: soldStats.sold_count,
          sold_gross: parseFloat(soldStats.sold_gross.toFixed(3)),
          sold_net: parseFloat(soldStats.sold_net.toFixed(3)),
          dropped_count: dropStats.dropped_count,
          dropped_gross: parseFloat(dropStats.dropped_gross.toFixed(3)),
          dropped_net: parseFloat(dropStats.dropped_net.toFixed(3)),
        };
      });

      return successResponse(userStats, "Per-user totals calculated successfully");
    } catch (err) {
      return errorResponse(err.message, 500);
    }
  }
}
