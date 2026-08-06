import db from "@/database/db";
import { DispatchModel } from "@/models/DispatchModel";
import { SalesModel } from "@/models/SalesModel";
import { DropModel } from "@/models/DropModel";
import { TrashModel } from "@/models/TrashModel";
import { ActivityLogModel } from "@/models/ActivityLogModel";

export class DispatchService {
  static handleDispatchDelete({ dispatch_id, status, user }) {
    const dispatch = DispatchModel.findById(dispatch_id);
    if (!dispatch) {
      throw new Error("Dispatch item not found.");
    }

    const { item_number, gross_weight, stone_weight, pearl_weight, net_weight } = dispatch;
    const salesperson_id = user.id;

    // Execute transactional atomic operation
    const transaction = db.transaction(() => {
      let historyRecord = null;

      if (status === "SOLD") {
        // 1. Insert into SalesHistory
        historyRecord = SalesModel.create({
          dispatch_id,
          salesperson_id,
          gross_weight,
          stone_weight,
          pearl_weight,
          net_weight,
        });

        // 2. Insert into Trash
        TrashModel.create({
          dispatch_id,
          item_number,
          item_name: "Gold Ornament",
          salesperson_id,
          gross_weight,
          stone_weight,
          pearl_weight,
          net_weight,
          status: "SOLD",
        });

        // 3. Update ActivityLogs
        ActivityLogModel.log(
          user.id,
          "Marked Sold",
          `Salesperson ${user.name} marked item ${item_number} (${net_weight}g) as SOLD`
        );
      } else if (status === "DROP") {
        // 1. Insert into DropHistory
        historyRecord = DropModel.create({
          dispatch_id,
          salesperson_id,
          gross_weight,
          stone_weight,
          pearl_weight,
          net_weight,
        });

        // 2. Insert into Trash
        TrashModel.create({
          dispatch_id,
          item_number,
          item_name: "Gold Ornament",
          salesperson_id,
          gross_weight,
          stone_weight,
          pearl_weight,
          net_weight,
          status: "DROP",
        });

        // 3. Update ActivityLogs
        ActivityLogModel.log(
          user.id,
          "Marked Drop",
          `Salesperson ${user.name} dropped item ${item_number} (${net_weight}g)`
        );
      } else {
        throw new Error("Invalid status type. Must be SOLD or DROP.");
      }

      // 4. Remove from active DispatchItems
      DispatchModel.delete(dispatch_id);

      return historyRecord;
    });

    return transaction();
  }
}
