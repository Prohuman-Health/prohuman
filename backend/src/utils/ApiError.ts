export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown[];

  constructor(statusCode: number, message: string, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg: string, errors?: unknown[]) {
    return new ApiError(400, msg, errors);
  }
  static unauthorized(msg = "Unauthorized") {
    return new ApiError(401, msg);
  }
  static forbidden(msg = "Forbidden") {
    return new ApiError(403, msg);
  }
  static notFound(msg = "Not found") {
    return new ApiError(404, msg);
  }
  static conflict(msg: string) {
    return new ApiError(409, msg);
  }
  static internal(msg = "Internal server error") {
    return new ApiError(500, msg);
  }
}
