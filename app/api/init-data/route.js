import { authenticate } from "@/middleware/authMiddleware";
import { DispatchController } from "@/controllers/dispatchController";
import { SalesController } from "@/controllers/salesController";
import { TrashController } from "@/controllers/trashController";
import { successResponse, errorResponse } from "@/utils/response";

export async function GET(req) {
  try {
    const { user, error } = await authenticate(req);
    if (error) return error;

    // Execute queries concurrently on backend
    const [dispatchesRes, salesRes, trashRes] = await Promise.all([
      DispatchController.listDispatches(req, user),
      SalesController.listSales(req, user),
      TrashController.listTrash(req, user),
    ]);

    const dispatchesData = (await dispatchesRes.json())?.data || null;
    const salesData = (await salesRes.json())?.data || [];
    const trashData = (await trashRes.json())?.data || [];

    return successResponse(
      {
        dispatches: dispatchesData,
        sales: salesData,
        trash: trashData,
      },
      "Initial app state fetched successfully"
    );
  } catch (err) {
    console.error("Error in /api/init-data:", err);
    return errorResponse(err.message, 500);
  }
}
