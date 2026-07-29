import { Types, type SchemaOptions } from "mongoose";

/**
 * Serialisation transform shared by every model: renames `_id` to `id`, drops
 * `__v`, and removes any sensitive fields from the JSON representation.
 */
const createTransform =
  (sensitiveFields: readonly string[]) =>
  (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
    ret.id =
      ret._id instanceof Types.ObjectId
        ? ret._id.toHexString()
        : String(ret._id);

    delete ret._id;
    delete ret.__v;

    for (const field of sensitiveFields) {
      delete ret[field];
    }

    return ret;
  };

export const schemaUtils = {
  /**
   * Base options applied to every schema — `timestamps: true` plus the shared
   * `_id` -> `id` transform on both `toJSON` and `toObject`.
   */
  baseOptions: (...sensitiveFields: readonly string[]): SchemaOptions => ({
    timestamps: true,
    toJSON: {
      virtuals: false,
      versionKey: false,
      transform: createTransform(sensitiveFields),
    },
    toObject: {
      virtuals: false,
      versionKey: false,
      transform: createTransform(sensitiveFields),
    },
  }),

  /** Narrows an unknown id-ish value to an ObjectId, or throws a CastError. */
  toObjectId: (value: string | Types.ObjectId): Types.ObjectId =>
    typeof value === "string" ? new Types.ObjectId(value) : value,
};
