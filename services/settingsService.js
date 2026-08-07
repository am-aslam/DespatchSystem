import { query, withTransaction } from "@/database/postgres";
import { AppError } from "@/utils/errors";
import { ActivityService } from "./activityService";

const DEFAULT_SETTINGS = {
  company_name: "AURUM JEWELLERS PVT LTD",
  address: "Gold Bazaar Road, Zaveri Market, Mumbai",
  gstin: "27AAAAA0000A1Z5",
  weight_decimals: "3",
};

export class SettingsService {
  static async getSettings() {
    const result = await query(
      `
        SELECT key, value
        FROM settings
        ORDER BY key ASC
      `
    );

    return result.rows.reduce(
      (acc, row) => ({
        ...acc,
        [row.key]: row.value,
      }),
      { ...DEFAULT_SETTINGS }
    );
  }

  static async updateSettings(settings, user) {
    const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
    const entries = Object.entries(settings || {}).filter(([key]) => allowedKeys.has(key));

    if (entries.length === 0) {
      throw new AppError("No valid settings were provided.", 400);
    }

    return withTransaction(async (client) => {
      for (const [key, value] of entries) {
        await client.query(
          `
            INSERT INTO settings (key, value, updated_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (key)
            DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
          `,
          [key, String(value), user.id]
        );
      }

      await ActivityService.log(
        user.id,
        "Settings Updated",
        `Admin ${user.full_name || user.name} updated system settings`,
        client
      );

      return this.getSettings();
    });
  }
}
