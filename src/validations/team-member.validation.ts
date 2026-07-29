import { z } from "zod";
import {
  AVATAR_COLOR_COUNT,
  TEAM_ROLES,
  TEAM_STATUSES,
} from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const teamMemberValidation = {
  idParamSchema: commonValidation.idParamSchema,

  listTeamQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    role: z.enum(TEAM_ROLES).optional(),
    status: z.enum(TEAM_STATUSES).optional(),
    sortBy: z
      .enum(["name", "role", "joinedAt", "revenue", "dealsClosed", "createdAt"])
      .default("createdAt"),
  }),

  /** Profile fields. Role and status have their own dedicated endpoints. */
  updateTeamMemberSchema: z
    .object({
      name: z.string().trim().min(2).max(120),
      jobTitle: z.string().trim().max(120),
      phone: z.string().trim().max(40).nullable(),
      department: z.string().trim().max(120).nullable(),
      bio: z.string().trim().max(600).nullable(),
      location: z.string().trim().max(120).nullable(),
      avatarColor: z.coerce
        .number()
        .int()
        .min(0)
        .max(AVATAR_COLOR_COUNT - 1),
      quota: z.coerce.number().min(0),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  updateRoleSchema: z.object({
    role: z.enum(TEAM_ROLES),
  }),

  updateStatusSchema: z.object({
    status: z.enum(TEAM_STATUSES),
  }),
};
