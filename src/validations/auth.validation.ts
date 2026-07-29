import { z } from "zod";
import { AVATAR_COLOR_COUNT, TEAM_ROLES } from "../utils/constants.ts";

const email = z.string().trim().toLowerCase().email("must be a valid email");

const password = z
  .string()
  .min(8, "must be at least 8 characters")
  .max(128, "must be at most 128 characters")
  .regex(/[A-Za-z]/, "must contain at least one letter")
  .regex(/\d/, "must contain at least one number");

export const authValidation = {
  registerSchema: z.object({
    name: z.string().trim().min(2).max(120),
    email,
    password,
    // Ignored for the very first account, which is always created as owner.
    role: z.enum(TEAM_ROLES).default("viewer"),
    jobTitle: z.string().trim().max(120).default(""),
    phone: z.string().trim().max(40).nullish(),
    department: z.string().trim().max(120).nullish(),
    avatarColor: z.coerce
      .number()
      .int()
      .min(0)
      .max(AVATAR_COLOR_COUNT - 1)
      .optional(),
    quota: z.coerce.number().min(0).default(0),
  }),

  loginSchema: z.object({
    email,
    password: z.string().min(1, "is required"),
  }),

  /** Refresh token may arrive in the httpOnly cookie or the JSON body. */
  refreshSchema: z.object({
    refreshToken: z.string().min(1).optional(),
  }),

  logoutSchema: z.object({
    refreshToken: z.string().min(1).optional(),
    allDevices: z.coerce.boolean().default(false),
  }),
};
