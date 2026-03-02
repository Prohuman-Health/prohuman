import { Request, Response, NextFunction } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route handler and forwards errors to Express error middleware */
export const asyncHandler =
  (fn: AsyncFn) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
