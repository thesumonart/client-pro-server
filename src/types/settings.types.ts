import type { HydratedDocument } from "mongoose";
import type { z } from "zod";
import type { settingsValidation } from "../validations/settings.validation.ts";

export interface SettingsGeneral {
  companyName: string;
  timezone: string;
  dateFormat: string;
  currency: string;
}

export interface SettingsNotifications {
  emailDigest: boolean;
  dealUpdates: boolean;
  taskReminders: boolean;
  mentions: boolean;
  productNews: boolean;
}

/**
 * The single global settings document.
 *
 * The frontend's `AppSettings` also carries an `appearance` block
 * (`density`, `sidebarCollapsed`). Those are deliberately not persisted: this
 * is one document shared by the whole workspace, so storing a per-person UI
 * preference here would let one user's collapsed sidebar apply to everyone.
 * They stay in localStorage, alongside the other client-only keys.
 */
export interface ISettings {
  /** Fixed discriminator that makes the singleton enforceable by a unique index. */
  key: string;
  general: SettingsGeneral;
  notifications: SettingsNotifications;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SettingsDocument = HydratedDocument<ISettings>;

export type UpdateSettingsInput = z.infer<
  typeof settingsValidation.updateSettingsSchema
>;
