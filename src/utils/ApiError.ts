/**
 * A single, machine-readable validation/domain error detail.
 * `path` is a dot-notation pointer to the offending field ("address.city"),
 * or "request" when the problem is not tied to a specific field.
 */
export interface ApiErrorDetail {
  path: string;
  message: string;
  code?: string;
}

export interface IApiError {
  statusCode: number;
  message: string;
  success: false;
  errors: ApiErrorDetail[];
  isOperational: boolean;
  stack?: string;
}

/**
 * Application-level error carrying an HTTP status code and structured details.
 * Anything thrown that is NOT an ApiError is treated as an unexpected
 * (non-operational) failure by the global error handler and masked as a 500.
 */
export class ApiError extends Error implements IApiError {
  public readonly statusCode: number;
  public readonly success = false as const;
  public readonly errors: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: ApiErrorDetail[] = [],
    options: { isOperational?: boolean; cause?: unknown; stack?: string } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = options.isOperational ?? true;

    // Keeps `instanceof ApiError` correct for subclasses and across transpile targets.
    Object.setPrototypeOf(this, new.target.prototype);

    if (options.stack) {
      this.stack = options.stack;
    } else {
      Error.captureStackTrace(this, new.target);
    }
  }

  /** Creates a new ApiError with an explicit status code. */
  static createError(
    statusCode: number,
    message: string,
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return new ApiError(statusCode, message, errors);
  }

  /** 400 — the request was malformed or failed validation. */
  static badRequest(
    message = "Bad request",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(400, message, errors);
  }

  /** 401 — no credentials, or credentials that could not be verified. */
  static unauthorized(
    message = "Unauthorized",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(401, message, errors);
  }

  /** 403 — authenticated, but not allowed to perform this action. */
  static forbidden(
    message = "Forbidden",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(403, message, errors);
  }

  /** 404 — the requested resource does not exist. */
  static notFound(
    message = "Resource not found",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(404, message, errors);
  }

  /** 409 — the request conflicts with current server state (e.g. duplicate key). */
  static conflict(
    message = "Conflict",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(409, message, errors);
  }

  /** 422 — syntactically valid but semantically unprocessable. */
  static unprocessable(
    message = "Unprocessable entity",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(422, message, errors);
  }

  /** 429 — rate limit exceeded. */
  static tooManyRequests(
    message = "Too many requests",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return ApiError.createError(429, message, errors);
  }

  /** 500 — unexpected server failure. Marked non-operational by default. */
  static internal(
    message = "Internal server error",
    errors: ApiErrorDetail[] = [],
  ): ApiError {
    return new ApiError(500, message, errors, { isOperational: false });
  }
}
