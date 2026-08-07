import { SettingsService } from "@/services/settingsService";
import { successResponse, handleError } from "@/utils/response";

export class SettingsController {
  static async getSettings() {
    try {
      return successResponse(await SettingsService.getSettings(), "Settings fetched successfully");
    } catch (err) {
      return handleError(err, "Failed to fetch settings.");
    }
  }

  static async updateSettings(req, user) {
    try {
      const body = await req.json();
      return successResponse(await SettingsService.updateSettings(body, user), "Settings updated successfully");
    } catch (err) {
      return handleError(err, "Failed to update settings.");
    }
  }
}
