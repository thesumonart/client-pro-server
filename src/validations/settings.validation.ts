import { z } from "zod";

/** Rejects anything Intl does not recognise as an IANA zone. */
const timezone = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "must be a valid IANA timezone" },
  );

const generalSchema = z.object({
  companyName: z.string().trim().min(1).max(150),
  timezone,
  dateFormat: z.string().trim().min(1).max(40),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "must be a 3-letter currency code"),
});

const notificationsSchema = z.object({
  emailDigest: z.coerce.boolean(),
  dealUpdates: z.coerce.boolean(),
  taskReminders: z.coerce.boolean(),
  mentions: z.coerce.boolean(),
  productNews: z.coerce.boolean(),
});

export const settingsValidation = {
  /**
   * Deep-partial: a PATCH may send one nested key without clearing its
   * siblings. `appearance` is deliberately absent — see settings.types.ts.
   */
  updateSettingsSchema: z
    .object({
      general: generalSchema.partial(),
      notifications: notificationsSchema.partial(),
      language: z.string().trim().min(2).max(10),
    })
    .partial()
    .refine(
      (value) =>
        Object.values(value).some(
          (section) =>
            section !== undefined &&
            (typeof section !== "object" || Object.keys(section).length > 0),
        ),
      { message: "at least one setting must be provided" },
    ),
};
