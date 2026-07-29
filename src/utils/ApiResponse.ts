import type { Response } from "express";

/** Pagination envelope returned alongside list payloads. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Uniform success envelope for every endpoint.
 *
 * Prefer the `ApiResponse.send` helper over `res.status(x).json(new ApiResponse(x, ...))`
 * so the status code can never drift between the header and the body.
 */
export class ApiResponse<T = unknown> implements IApiResponse<T> {
  public readonly statusCode: number;
  public readonly success: boolean;
  public readonly message: string;
  public readonly data: T;
  public readonly meta?: PaginationMeta;

  constructor(
    statusCode: number,
    data: T,
    message = "Success",
    meta?: PaginationMeta,
  ) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }

  /** Writes the envelope to the response with a matching HTTP status code. */
  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message = "Success",
    meta?: PaginationMeta,
  ): void {
    res
      .status(statusCode)
      .json(new ApiResponse<T>(statusCode, data, message, meta));
  }

  /** 200 — resource read/updated. */
  static ok<T>(
    res: Response,
    data: T,
    message = "Success",
    meta?: PaginationMeta,
  ): void {
    ApiResponse.send(res, 200, data, message, meta);
  }

  /** 201 — resource created. */
  static created<T>(res: Response, data: T, message = "Created"): void {
    ApiResponse.send(res, 201, data, message);
  }
}
