import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

type PgErrorWithCode = Error & {
  code?: string;
  detail?: string;
  constraint?: string;
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors.length ? err.errors : undefined,
    });
  }

  const pgErr = err as PgErrorWithCode;
  if (pgErr.code === "23503") {
    return res.status(400).json({
      success: false,
      message: "Operation blocked because this record is referenced by other data.",
      detail: pgErr.detail,
      constraint: pgErr.constraint,
    });
  }
  if (pgErr.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A record with the same unique value already exists.",
      detail: pgErr.detail,
      constraint: pgErr.constraint,
    });
  }

  // Unexpected error
  console.error("[Unhandled Error]", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound("Route not found"));
}
