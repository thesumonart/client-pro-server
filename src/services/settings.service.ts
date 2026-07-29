import { settingsQueries } from "../models/settings.model.ts";
import type {
  SettingsDocument,
  SettingsGeneral,
  SettingsNotifications,
  UpdateSettingsInput,
} from "../types/settings.types.ts";
import { ApiError } from "../utils/ApiError.ts";

/** Response projection — the persisted subset of the frontend's `AppSettings`. */
export interface PublicSettings {
  id: string;
  general: SettingsGeneral;
  notifications: SettingsNotifications;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Flattens a nested patch into dot-notation paths so `$set` only touches the
 * keys that were sent. Assigning the nested object wholesale would silently
 * drop the siblings the caller did not mention.
 */
const toDotNotation = (
  input: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        output,
        toDotNotation(value as Record<string, unknown>, path),
      );
    } else {
      output[path] = value;
    }
  }

  return output;
};

const serialize = (settings: SettingsDocument): PublicSettings => ({
  id: settings._id.toString(),
  general: {
    companyName: settings.general.companyName,
    timezone: settings.general.timezone,
    dateFormat: settings.general.dateFormat,
    currency: settings.general.currency,
  },
  notifications: {
    emailDigest: settings.notifications.emailDigest,
    dealUpdates: settings.notifications.dealUpdates,
    taskReminders: settings.notifications.taskReminders,
    mentions: settings.notifications.mentions,
    productNews: settings.notifications.productNews,
  },
  language: settings.language,
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
});

export const settingsService = {
  serialize,

  /** Returns the singleton, creating it with defaults on first access. */
  getOrCreateSettings: async (): Promise<PublicSettings> => {
    const settings = await settingsQueries.getOrCreate();

    if (!settings) {
      throw ApiError.internal("Settings could not be initialised");
    }

    return serialize(settings);
  },

  updateSettings: async (
    payload: UpdateSettingsInput,
  ): Promise<PublicSettings> => {
    // Guarantees the document exists before patching it.
    await settingsQueries.getOrCreate();

    const update = toDotNotation(payload);

    if (Object.keys(update).length === 0) {
      throw ApiError.badRequest("No settings were provided");
    }

    const settings = await settingsQueries.applyPatch(update);

    if (!settings) {
      throw ApiError.internal("Settings could not be updated");
    }

    return serialize(settings);
  },
};
