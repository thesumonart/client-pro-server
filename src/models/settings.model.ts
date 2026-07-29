import mongoose, { Schema } from "mongoose";
import type {
  ISettings,
  SettingsGeneral,
  SettingsNotifications,
} from "../types/settings.types.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

/** The one value `key` is ever allowed to hold. */
export const SETTINGS_SINGLETON_KEY = "global";

/** Mirrors the frontend's seedSettings() so a fresh install matches the UI. */
export const SETTINGS_DEFAULTS = {
  general: {
    companyName: "VendorCo",
    timezone: "America/New_York",
    dateFormat: "MMM D, YYYY",
    currency: "USD",
  },
  notifications: {
    emailDigest: true,
    dealUpdates: true,
    taskReminders: true,
    mentions: true,
    productNews: false,
  },
  language: "en",
} as const;

const generalSchema = new Schema<SettingsGeneral>(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      default: SETTINGS_DEFAULTS.general.companyName,
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: SETTINGS_DEFAULTS.general.timezone,
    },
    dateFormat: {
      type: String,
      required: true,
      trim: true,
      default: SETTINGS_DEFAULTS.general.dateFormat,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: SETTINGS_DEFAULTS.general.currency,
    },
  },
  { _id: false },
);

const notificationsSchema = new Schema<SettingsNotifications>(
  {
    emailDigest: {
      type: Boolean,
      required: true,
      default: SETTINGS_DEFAULTS.notifications.emailDigest,
    },
    dealUpdates: {
      type: Boolean,
      required: true,
      default: SETTINGS_DEFAULTS.notifications.dealUpdates,
    },
    taskReminders: {
      type: Boolean,
      required: true,
      default: SETTINGS_DEFAULTS.notifications.taskReminders,
    },
    mentions: {
      type: Boolean,
      required: true,
      default: SETTINGS_DEFAULTS.notifications.mentions,
    },
    productNews: {
      type: Boolean,
      required: true,
      default: SETTINGS_DEFAULTS.notifications.productNews,
    },
  },
  { _id: false },
);

const settingsSchema = new Schema<ISettings>(
  {
    // Unique index on a fixed value is what makes the singleton enforceable at
    // the database level, not merely by convention in the service.
    key: {
      type: String,
      required: true,
      unique: true,
      default: SETTINGS_SINGLETON_KEY,
      enum: [SETTINGS_SINGLETON_KEY],
    },
    general: {
      type: generalSchema,
      required: true,
      default: () => ({ ...SETTINGS_DEFAULTS.general }),
    },
    notifications: {
      type: notificationsSchema,
      required: true,
      default: () => ({ ...SETTINGS_DEFAULTS.notifications }),
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: SETTINGS_DEFAULTS.language,
    },
  },
  schemaUtils.baseOptions(),
);

export const SettingsModel = mongoose.model<ISettings>(
  "Settings",
  settingsSchema,
);

export const settingsQueries = {
  /**
   * Atomically returns the singleton, creating it on first call. `upsert` plus
   * the unique key means two concurrent boots cannot produce two documents.
   */
  getOrCreate: () =>
    SettingsModel.findOneAndUpdate(
      { key: SETTINGS_SINGLETON_KEY },
      { $setOnInsert: { key: SETTINGS_SINGLETON_KEY, ...SETTINGS_DEFAULTS } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),

  applyPatch: (update: Record<string, unknown>) =>
    SettingsModel.findOneAndUpdate(
      { key: SETTINGS_SINGLETON_KEY },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
};
